import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Workspace resolution for the multi-tenant model introduced in
 * Sprint 1.
 *
 * Every existing single-user install is backfilled (migration 017) to
 * one organization + one default workspace with the user as `owner`.
 * New signups are healed on first access by `ensureWorkspaceForUser`,
 * which is idempotent.
 *
 * The cookie `wacrm_ws` (set by the workspace switcher) selects the
 * active workspace when a user belongs to more than one. When absent or
 * invalid we fall back to the user's default / first workspace.
 */

export const ACTIVE_WORKSPACE_COOKIE = 'wacrm_ws'

export type WorkspaceRole = 'owner' | 'admin' | 'agent' | 'viewer'

export interface WorkspaceContext {
  userId: string
  organizationId: string
  workspaceId: string
  role: WorkspaceRole
  workspaceName: string
}

// Lazy service-role client. Used to provision org/workspace rows for a
// user who doesn't have them yet (new signup) — those INSERTs need to
// run before the user has any membership rows the RLS policies key off.
let _adminClient: SupabaseClient | null = null
export function workspaceAdmin(): SupabaseClient {
  if (!_adminClient) {
    _adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
  }
  return _adminClient
}

interface MembershipRow {
  workspace_id: string
  role: WorkspaceRole
  workspaces: {
    id: string
    name: string
    organization_id: string
    is_default: boolean
  } | null
}

/**
 * Ensure the user has an organization + default workspace + memberships.
 * Idempotent: returns the existing default workspace if already present.
 * Uses the service role because the user may have zero membership rows
 * at call time (brand-new signup), so RLS would otherwise hide
 * everything.
 */
export async function ensureWorkspaceForUser(
  userId: string,
  opts: { fullName?: string | null; email?: string | null } = {},
): Promise<{ organizationId: string; workspaceId: string }> {
  const admin = workspaceAdmin()

  // Already a member of a workspace? Use the default (or first).
  const { data: existing } = await admin
    .from('workspace_members')
    .select('workspace_id, role, workspaces(id, name, organization_id, is_default)')
    .eq('user_id', userId)
    .returns<MembershipRow[]>()

  if (existing && existing.length > 0) {
    const def =
      existing.find((m) => m.workspaces?.is_default) ?? existing[0]
    if (def.workspaces) {
      return {
        organizationId: def.workspaces.organization_id,
        workspaceId: def.workspaces.id,
      }
    }
  }

  // Provision: organization → membership → workspace → membership.
  const orgName = opts.fullName || opts.email || 'My Organization'

  // Reuse an org this user already owns, if any.
  let organizationId: string
  const { data: ownedOrg } = await admin
    .from('organizations')
    .select('id')
    .eq('owner_id', userId)
    .limit(1)
    .maybeSingle()

  if (ownedOrg) {
    organizationId = ownedOrg.id
  } else {
    const { data: org, error: orgErr } = await admin
      .from('organizations')
      .insert({ name: orgName, owner_id: userId })
      .select('id')
      .single()
    if (orgErr || !org) {
      throw new Error(`Failed to create organization: ${orgErr?.message}`)
    }
    organizationId = org.id
  }

  await admin
    .from('organization_members')
    .upsert(
      { organization_id: organizationId, user_id: userId, role: 'owner' },
      { onConflict: 'organization_id,user_id' },
    )

  // Default workspace for this org.
  let workspaceId: string
  const { data: defWs } = await admin
    .from('workspaces')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('is_default', true)
    .limit(1)
    .maybeSingle()

  if (defWs) {
    workspaceId = defWs.id
  } else {
    const { data: ws, error: wsErr } = await admin
      .from('workspaces')
      .insert({
        organization_id: organizationId,
        name: 'Default Workspace',
        is_default: true,
      })
      .select('id')
      .single()
    if (wsErr || !ws) {
      throw new Error(`Failed to create workspace: ${wsErr?.message}`)
    }
    workspaceId = ws.id
  }

  await admin
    .from('workspace_members')
    .upsert(
      { workspace_id: workspaceId, user_id: userId, role: 'owner' },
      { onConflict: 'workspace_id,user_id' },
    )

  return { organizationId, workspaceId }
}

/**
 * Resolve the active workspace context for the currently authenticated
 * request. Returns null when there is no authenticated user.
 *
 * `requestedWorkspaceId` (from the workspace cookie/header) is honored
 * only if the user is a member of it.
 */
export async function getWorkspaceContext(
  requestedWorkspaceId?: string | null,
): Promise<WorkspaceContext | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  // Make sure the user has at least the default workspace.
  await ensureWorkspaceForUser(user.id, {
    fullName: (user.user_metadata?.full_name as string | undefined) ?? null,
    email: user.email ?? null,
  })

  const admin = workspaceAdmin()
  const { data: memberships } = await admin
    .from('workspace_members')
    .select('workspace_id, role, workspaces(id, name, organization_id, is_default)')
    .eq('user_id', user.id)
    .returns<MembershipRow[]>()

  if (!memberships || memberships.length === 0) return null

  let chosen: MembershipRow | undefined
  if (requestedWorkspaceId) {
    chosen = memberships.find((m) => m.workspace_id === requestedWorkspaceId)
  }
  if (!chosen) {
    chosen =
      memberships.find((m) => m.workspaces?.is_default) ?? memberships[0]
  }
  if (!chosen.workspaces) return null

  return {
    userId: user.id,
    organizationId: chosen.workspaces.organization_id,
    workspaceId: chosen.workspaces.id,
    role: chosen.role,
    workspaceName: chosen.workspaces.name,
  }
}

/**
 * List every workspace the user can access — for the workspace switcher.
 */
export async function listUserWorkspaces(userId: string): Promise<
  Array<{
    workspaceId: string
    organizationId: string
    name: string
    role: WorkspaceRole
    isDefault: boolean
  }>
> {
  const admin = workspaceAdmin()
  const { data } = await admin
    .from('workspace_members')
    .select('workspace_id, role, workspaces(id, name, organization_id, is_default)')
    .eq('user_id', userId)
    .returns<MembershipRow[]>()

  if (!data) return []
  return data
    .filter((m) => m.workspaces)
    .map((m) => ({
      workspaceId: m.workspaces!.id,
      organizationId: m.workspaces!.organization_id,
      name: m.workspaces!.name,
      role: m.role,
      isDefault: m.workspaces!.is_default,
    }))
}

/**
 * Resolve the default workspace for a user from a server-side context
 * that only has the user_id (webhook, engine, cron). Service-role only.
 */
export async function resolveWorkspaceForUserId(
  userId: string,
): Promise<{ organizationId: string; workspaceId: string } | null> {
  const admin = workspaceAdmin()
  const { data } = await admin
    .from('workspace_members')
    .select('workspace_id, workspaces(id, organization_id, is_default)')
    .eq('user_id', userId)
    .returns<
      Array<{
        workspace_id: string
        workspaces: { id: string; organization_id: string; is_default: boolean } | null
      }>
    >()

  if (!data || data.length === 0) {
    // Heal on demand — covers webhook traffic for a user whose
    // workspace was never provisioned (shouldn't happen post-backfill).
    try {
      return await ensureWorkspaceForUser(userId)
    } catch {
      return null
    }
  }
  const def = data.find((m) => m.workspaces?.is_default) ?? data[0]
  if (!def.workspaces) return null
  return {
    organizationId: def.workspaces.organization_id,
    workspaceId: def.workspaces.id,
  }
}
