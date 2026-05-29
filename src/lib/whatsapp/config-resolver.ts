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
  [key: string]: unknown
}

export interface ResolvedWhatsAppConfig {
  config: WhatsAppConfigRow
  accessToken: string
}

export async function getWhatsAppConfigForPhoneNumberId(
  phoneNumberId: string,
): Promise<ResolvedWhatsAppConfig | null> {
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
  await supabaseAdmin()
    .from('whatsapp_config')
    .update({ last_webhook_at: new Date().toISOString() })
    .eq('id', configId)
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
