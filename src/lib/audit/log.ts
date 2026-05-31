import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Audit logging (Sprint 8). Best-effort: a failure here must never
 * break the operation being audited. Writes to `audit_logs`
 * (migration 025). If the table doesn't exist yet (mid-migration), the
 * insert error is swallowed with a warning.
 */

let _adminClient: SupabaseClient | null = null
function admin(): SupabaseClient {
  if (!_adminClient) {
    _adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
  }
  return _adminClient
}

export interface AuditEntry {
  workspaceId?: string | null
  organizationId?: string | null
  userId?: string | null
  action: string
  targetType?: string | null
  targetId?: string | null
  metadata?: Record<string, unknown> | null
  ipAddress?: string | null
}

export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    const { error } = await admin().from('audit_logs').insert({
      workspace_id: entry.workspaceId ?? null,
      organization_id: entry.organizationId ?? null,
      actor_user_id: entry.userId ?? null,
      action: entry.action,
      target_type: entry.targetType ?? null,
      target_id: entry.targetId ?? null,
      metadata: entry.metadata ?? null,
      ip_address: entry.ipAddress ?? null,
    })
    if (error) {
      console.warn('[audit] insert failed:', error.message)
    }
  } catch (err) {
    console.warn('[audit] recordAudit threw:', err instanceof Error ? err.message : err)
  }
}
