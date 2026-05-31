import { NextResponse } from 'next/server'
import { getRequestWorkspace } from '@/lib/auth/request-context'
import { can } from '@/lib/auth/rbac'
import { workspaceAdmin } from '@/lib/auth/workspace-context'
import { getAccountById } from '@/lib/whatsapp/accounts'
import { encrypt } from '@/lib/whatsapp/encryption'
import { providerForResolvedAccount } from '@/lib/whatsapp/providers/factory'
import { recordAudit } from '@/lib/audit/log'

function sanitizeAccount(row: Record<string, unknown>) {
  const {
    access_token: _a,
    verify_token: _v,
    provider_api_key: _k,
    provider_api_secret: _s,
    ...safe
  } = row
  void _a
  void _v
  void _k
  void _s
  return { ...safe, has_credentials: Boolean(row.access_token || row.provider_api_key) }
}

async function loadOwned(id: string, workspaceId: string) {
  const resolved = await getAccountById(id)
  if (!resolved) return null
  if (resolved.account.workspace_id !== workspaceId) return null
  return resolved
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const ctx = await getRequestWorkspace()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const resolved = await loadOwned(id, ctx.workspaceId)
  if (!resolved) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Live connection health check.
  let health: { connected: boolean; message?: string; phone_info?: unknown } = {
    connected: false,
  }
  try {
    const provider = providerForResolvedAccount(resolved)
    const info = await provider.verifyConnection()
    health = { connected: true, phone_info: info }
  } catch (err) {
    health = {
      connected: false,
      message: err instanceof Error ? err.message : 'Verification failed',
    }
  }

  return NextResponse.json({
    account: sanitizeAccount(resolved.account as Record<string, unknown>),
    health,
  })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const ctx = await getRequestWorkspace()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(ctx.role, 'connection.manage')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const resolved = await loadOwned(id, ctx.workspaceId)
  if (!resolved) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json().catch(() => ({}))
  const update: Record<string, unknown> = {}

  // Editable plain fields.
  for (const key of [
    'name',
    'display_phone_number',
    'waba_id',
    'business_id',
    'pause_bot_on_app_reply',
    'bot_pause_duration_hours',
    'automation_outside_hours',
    'fallback_message',
    'app_sync_enabled',
  ]) {
    if (body[key] !== undefined) update[key] = body[key]
  }
  if (body.provider_config !== undefined) update.provider_config = body.provider_config

  // Secret fields: re-encrypt only when provided.
  if (body.access_token) update.access_token = encrypt(body.access_token)
  if (body.verify_token) update.verify_token = encrypt(body.verify_token)
  if (body.provider_api_key) update.provider_api_key = encrypt(body.provider_api_key)
  if (body.provider_api_secret) {
    update.provider_api_secret = encrypt(body.provider_api_secret)
  }

  const rotatedSecret = Boolean(
    body.access_token || body.provider_api_key || body.provider_api_secret,
  )

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No updatable fields supplied' }, { status: 400 })
  }
  update.updated_at = new Date().toISOString()

  const admin = workspaceAdmin()
  const { data: updated, error } = await admin
    .from('whatsapp_accounts')
    .update(update)
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to update account' }, { status: 500 })
  }

  await recordAudit({
    workspaceId: ctx.workspaceId,
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: rotatedSecret ? 'connection.credential_rotated' : 'connection.updated',
    targetType: 'whatsapp_account',
    targetId: id,
  })

  return NextResponse.json({
    account: sanitizeAccount(updated as Record<string, unknown>),
  })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const ctx = await getRequestWorkspace()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(ctx.role, 'connection.manage')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const resolved = await loadOwned(id, ctx.workspaceId)
  if (!resolved) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const admin = workspaceAdmin()
  const { error } = await admin.from('whatsapp_accounts').delete().eq('id', id)
  if (error) {
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
  }

  await recordAudit({
    workspaceId: ctx.workspaceId,
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: 'connection.deleted',
    targetType: 'whatsapp_account',
    targetId: id,
  })

  return NextResponse.json({ success: true })
}
