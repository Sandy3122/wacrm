import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  listUserWorkspaces,
  getWorkspaceContext,
  ACTIVE_WORKSPACE_COOKIE,
} from '@/lib/auth/workspace-context'
import { permissionsFor } from '@/lib/auth/rbac'

/**
 * GET /api/workspaces
 *
 * Returns the workspaces the current user can access plus the active
 * one (resolved from the workspace cookie). Used by the workspace
 * switcher and any client that needs the active workspace id.
 */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  const requested = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value ?? null

  const [workspaces, active] = await Promise.all([
    listUserWorkspaces(user.id),
    getWorkspaceContext(requested),
  ])

  return NextResponse.json({
    workspaces,
    active: active
      ? {
          workspaceId: active.workspaceId,
          organizationId: active.organizationId,
          name: active.workspaceName,
          role: active.role,
          permissions: permissionsFor(active.role),
        }
      : null,
  })
}

/**
 * POST /api/workspaces/switch — body: { workspace_id }
 * Sets the active-workspace cookie if the user is a member.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const workspaceId = body?.workspace_id as string | undefined
  if (!workspaceId) {
    return NextResponse.json({ error: 'workspace_id is required' }, { status: 400 })
  }

  const workspaces = await listUserWorkspaces(user.id)
  const match = workspaces.find((w) => w.workspaceId === workspaceId)
  if (!match) {
    return NextResponse.json(
      { error: 'Not a member of that workspace' },
      { status: 403 },
    )
  }

  const res = NextResponse.json({ success: true, workspaceId })
  res.cookies.set(ACTIVE_WORKSPACE_COOKIE, workspaceId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })
  return res
}
