import { createClient } from '@supabase/supabase-js'
import { decrypt } from '@/lib/whatsapp/encryption'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _adminClient: any = null

function supabaseAdmin() {
  if (!_adminClient) {
    _adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
  }
  return _adminClient
}

export interface WhatsAppConfigRow {
  id: string
  user_id: string
  phone_number_id: string
  waba_id?: string | null
  business_id?: string | null
  display_phone_number?: string | null
  access_token: string
  verify_token?: string | null
  status: string
  connection_type?: string
  webhook_status?: string
  app_sync_enabled?: boolean
  pause_bot_on_app_reply?: boolean
  bot_pause_duration_hours?: number
  automation_outside_hours?: boolean
  fallback_message?: string | null
  /** Present when resolved from the new whatsapp_accounts table. */
  whatsapp_account_id?: string
  workspace_id?: string | null
  organization_id?: string | null
  provider_type?: string
  [key: string]: unknown
}

export interface ResolvedWhatsAppConfig {
  config: WhatsAppConfigRow
  accessToken: string
}

/**
 * Resolve a whatsapp_accounts row by phone_number_id and adapt it into
 * the legacy WhatsAppConfigRow shape the webhook handler consumes. The
 * `connection_type` is normalized back to legacy/coexistence so the
 * existing echo/history/bot-gate code keeps working unchanged.
 */
async function getAccountAsConfig(
  phoneNumberId: string,
): Promise<ResolvedWhatsAppConfig | null> {
  const { data, error } = await supabaseAdmin()
    .from('whatsapp_accounts')
    .select('*')
    .eq('phone_number_id', phoneNumberId)
    .maybeSingle()

  if (error || !data) return null
  if (!data.access_token) return null

  let accessToken: string
  try {
    accessToken = decrypt(data.access_token)
  } catch (err) {
    console.error('[whatsapp/config] account token decrypt failed:', err)
    return null
  }

  const normalizedConnType =
    data.connection_type === 'coexistence' ? 'coexistence' : 'legacy'

  const config: WhatsAppConfigRow = {
    ...data,
    // Keep legacy-shaped fields the webhook reads directly.
    id: data.id,
    user_id: data.user_id,
    phone_number_id: data.phone_number_id,
    connection_type: normalizedConnType,
    whatsapp_account_id: data.id,
    workspace_id: data.workspace_id,
    organization_id: data.organization_id,
    provider_type: data.provider_type,
  }
  return { config, accessToken }
}

export async function getWhatsAppConfigForPhoneNumberId(
  phoneNumberId: string,
): Promise<ResolvedWhatsAppConfig | null> {
  // Prefer the new whatsapp_accounts table (Sprint 2). Fall back to the
  // legacy whatsapp_config rows for installs that haven't migrated.
  const account = await getAccountAsConfig(phoneNumberId)
  if (account) return account

  const { data: configRows, error } = await supabaseAdmin()
    .from('whatsapp_config')
    .select('*')
    .eq('phone_number_id', phoneNumberId)

  if (error || !configRows?.length) {
    if (error) {
      console.error('[whatsapp/config] fetch error:', phoneNumberId, error)
    }
    return null
  }

  if (configRows.length > 1) {
    console.error(
      `[whatsapp/config] ${configRows.length} configs for phone_number_id ${phoneNumberId}`,
    )
    return null
  }

  const config = configRows[0] as WhatsAppConfigRow
  try {
    const accessToken = decrypt(config.access_token)
    return { config, accessToken }
  } catch (err) {
    console.error('[whatsapp/config] decrypt failed:', err)
    return null
  }
}

export async function getWhatsAppConfigForUser(
  userId: string,
): Promise<ResolvedWhatsAppConfig | null> {
  const { data: config, error } = await supabaseAdmin()
    .from('whatsapp_config')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !config) return null

  try {
    const accessToken = decrypt(config.access_token)
    return { config: config as WhatsAppConfigRow, accessToken }
  } catch {
    return null
  }
}

export async function touchLastWebhookAt(configId: string): Promise<void> {
  // The config id may belong to either whatsapp_accounts (new) or
  // whatsapp_config (legacy). Update both — the non-matching one is a
  // cheap no-op.
  const ts = new Date().toISOString()
  await Promise.all([
    supabaseAdmin()
      .from('whatsapp_accounts')
      .update({ last_webhook_at: ts })
      .eq('id', configId),
    supabaseAdmin()
      .from('whatsapp_config')
      .update({ last_webhook_at: ts })
      .eq('id', configId),
  ])
}

export async function logWebhookEvent(args: {
  userId: string
  phoneNumberId: string
  field: string
  payload: unknown
}): Promise<void> {
  const { error } = await supabaseAdmin().from('webhook_events').insert({
    user_id: args.userId,
    phone_number_id: args.phoneNumberId,
    field: args.field,
    payload: args.payload,
  })
  if (error) {
    console.warn('[webhook] logWebhookEvent failed:', error.message)
  }
}
