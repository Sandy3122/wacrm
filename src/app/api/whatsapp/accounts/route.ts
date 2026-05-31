import { NextResponse } from 'next/server'
import { getRequestWorkspace } from '@/lib/auth/request-context'
import { can } from '@/lib/auth/rbac'
import { listAccountsForWorkspace } from '@/lib/whatsapp/accounts'
import { workspaceAdmin } from '@/lib/auth/workspace-context'
import { encrypt } from '@/lib/whatsapp/encryption'
import { verifyPhoneNumber } from '@/lib/whatsapp/meta-api'
import { recordAudit } from '@/lib/audit/log'
import {
  validateProviderCredentials,
  presetFor,
} from '@/lib/whatsapp/providers/validate'

/**
 * GET  /api/whatsapp/accounts  — list accounts in the active workspace.
 * POST /api/whatsapp/accounts  — create / connect a new account.
 *
 * Credentials are validated (Meta) and encrypted before storage.
 * Secrets are never returned to the client.
 */

// Strip secret columns from an account row before returning to client.
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

export async function GET() {
  const ctx = await getRequestWorkspace()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const accounts = await listAccountsForWorkspace(ctx.workspaceId)
  return NextResponse.json({
    accounts: accounts.map((a) => sanitizeAccount(a as Record<string, unknown>)),
  })
}

export async function POST(request: Request) {
  const ctx = await getRequestWorkspace()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can(ctx.role, 'connection.manage')) {
    return NextResponse.json(
      { error: 'You do not have permission to connect accounts' },
      { status: 403 },
    )
  }

  const body = await request.json().catch(() => ({}))
  const {
    name,
    connection_type = 'legacy_cloud_api',
    provider_type = 'meta',
    phone_number_id,
    waba_id,
    business_id,
    display_phone_number,
    access_token,
    verify_token,
    provider_api_key,
    provider_api_secret,
    provider_config,
  } = body as Record<string, string | undefined> & {
    provider_config?: Record<string, unknown>
  }

  const admin = workspaceAdmin()

  // Schema validation against the provider's field spec (Sprint 6).
  const validation = validateProviderCredentials(body as Record<string, unknown>)
  if (!validation.ok) {
    return NextResponse.json(
      { error: validation.errors.join('; '), errors: validation.errors },
      { status: 400 },
    )
  }

  // Merge provider config defaults from the preset.
  const preset = presetFor(provider_type)
  const mergedConfig = {
    ...(preset?.configDefaults ?? {}),
    ...(provider_config ?? {}),
  }

  // Meta accounts: validate credentials + enforce unique phone_number_id.
  let displayPhone = display_phone_number ?? null
  if (provider_type === 'meta') {
    if (!phone_number_id || !access_token) {
      return NextResponse.json(
        { error: 'phone_number_id and access_token are required for Meta accounts' },
        { status: 400 },
      )
    }
    const { data: claimed } = await admin
      .from('whatsapp_accounts')
      .select('id, workspace_id')
      .eq('phone_number_id', phone_number_id)
      .maybeSingle()
    if (claimed) {
      return NextResponse.json(
        { error: 'This phone number is already connected on this instance.' },
        { status: 409 },
      )
    }
    try {
      const info = await verifyPhoneNumber({
        phoneNumberId: phone_number_id,
        accessToken: access_token,
      })
      displayPhone = displayPhone ?? info.display_phone_number ?? null
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Meta API error'
      return NextResponse.json({ error: `Meta API error: ${message}` }, { status: 400 })
    }
  } else if (!provider_api_key && !access_token) {
    return NextResponse.json(
      { error: 'provider_api_key is required for BSP/custom accounts' },
      { status: 400 },
    )
  }

  const row = {
    organization_id: ctx.organizationId,
    workspace_id: ctx.workspaceId,
    user_id: ctx.userId,
    name: name || displayPhone || 'WhatsApp Account',
    connection_type,
    provider_type,
    phone_number_id: phone_number_id ?? null,
    waba_id: waba_id ?? null,
    business_id: business_id ?? null,
    display_phone_number: displayPhone,
    access_token: access_token ? encrypt(access_token) : null,
    verify_token: verify_token ? encrypt(verify_token) : null,
    provider_api_key: provider_api_key ? encrypt(provider_api_key) : null,
    provider_api_secret: provider_api_secret ? encrypt(provider_api_secret) : null,
    provider_config: Object.keys(mergedConfig).length > 0 ? mergedConfig : null,
    status: 'connected',
    connected_at: new Date().toISOString(),
  }

  const { data: created, error } = await admin
    .from('whatsapp_accounts')
    .insert(row)
    .select('*')
    .single()

  if (error) {
    console.error('[whatsapp/accounts] insert failed:', error)
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
  }

  await recordAudit({
    workspaceId: ctx.workspaceId,
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: 'connection.created',
    targetType: 'whatsapp_account',
    targetId: created.id,
    metadata: { provider_type, connection_type },
  })

  return NextResponse.json({
    account: sanitizeAccount(created as Record<string, unknown>),
  })
}
