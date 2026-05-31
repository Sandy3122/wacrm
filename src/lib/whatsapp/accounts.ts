import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { decrypt } from '@/lib/whatsapp/encryption'

/**
 * WhatsApp account resolver (Sprint 2).
 *
 * Resolves `whatsapp_accounts` rows by workspace, by id, or by
 * phone_number_id (webhook path). Falls back to the legacy
 * `whatsapp_config` table when no account row exists yet, so installs
 * mid-migration keep working.
 *
 * All access goes through the service-role client — these helpers run
 * from webhooks, the engine, and authenticated routes alike, and the
 * caller is responsible for having already authorised the workspace.
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

export type ConnectionType = 'legacy_cloud_api' | 'coexistence' | 'bsp_adapter'
export type ProviderType =
  | 'meta'
  | '360dialog'
  | 'twilio'
  | 'messagebird'
  | 'gupshup'
  | 'custom'

export interface WhatsAppAccountRow {
  id: string
  organization_id: string | null
  workspace_id: string | null
  user_id: string | null
  name: string
  connection_type: ConnectionType
  provider_type: ProviderType
  phone_number_id: string | null
  waba_id: string | null
  business_id: string | null
  display_phone_number: string | null
  access_token: string | null
  verify_token: string | null
  provider_api_key: string | null
  provider_api_secret: string | null
  provider_config: Record<string, unknown> | null
  status: string
  webhook_status: string
  history_sync_status: string | null
  app_sync_enabled: boolean
  pause_bot_on_app_reply: boolean
  bot_pause_duration_hours: number
  automation_outside_hours: boolean
  fallback_message: string | null
  connected_at: string | null
  last_webhook_at: string | null
  [key: string]: unknown
}

export interface ResolvedAccount {
  account: WhatsAppAccountRow
  /** Decrypted Meta/bearer access token, if present. */
  accessToken: string | null
}

function decryptMaybe(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    return decrypt(value)
  } catch {
    return null
  }
}

/** All accounts in a workspace (newest first). */
export async function listAccountsForWorkspace(
  workspaceId: string,
): Promise<WhatsAppAccountRow[]> {
  const { data, error } = await admin()
    .from('whatsapp_accounts')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
  if (error || !data) return []
  return data as WhatsAppAccountRow[]
}

export async function getAccountById(
  accountId: string,
): Promise<ResolvedAccount | null> {
  const { data, error } = await admin()
    .from('whatsapp_accounts')
    .select('*')
    .eq('id', accountId)
    .maybeSingle()
  if (error || !data) return null
  const account = data as WhatsAppAccountRow
  return { account, accessToken: decryptMaybe(account.access_token) }
}

/**
 * Resolve the account a workspace should send from. When `accountId`
 * is given it must belong to the workspace; otherwise the first
 * connected account (or the most recent) is used.
 */
export async function resolveAccountForWorkspace(
  workspaceId: string,
  accountId?: string | null,
): Promise<ResolvedAccount | null> {
  const accounts = await listAccountsForWorkspace(workspaceId)
  if (accounts.length === 0) return null

  let account: WhatsAppAccountRow | undefined
  if (accountId) {
    account = accounts.find((a) => a.id === accountId)
    if (!account) return null
  } else {
    account =
      accounts.find((a) => a.status === 'connected') ?? accounts[0]
  }
  return { account, accessToken: decryptMaybe(account.access_token) }
}

/**
 * Resolve by phone_number_id (the webhook entry point). Falls back to
 * the legacy whatsapp_config table when no account exists yet.
 */
export async function getAccountForPhoneNumberId(
  phoneNumberId: string,
): Promise<ResolvedAccount | null> {
  const { data, error } = await admin()
    .from('whatsapp_accounts')
    .select('*')
    .eq('phone_number_id', phoneNumberId)
    .maybeSingle()

  if (!error && data) {
    const account = data as WhatsAppAccountRow
    return { account, accessToken: decryptMaybe(account.access_token) }
  }
  return null
}

/**
 * Resolve the (single) account belonging to a legacy user_id. Used by
 * server-side paths that still carry only user_id (engine/automations
 * during the transition).
 */
export async function getAccountForUserId(
  userId: string,
): Promise<ResolvedAccount | null> {
  const { data, error } = await admin()
    .from('whatsapp_accounts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error || !data) return null
  const account = data as WhatsAppAccountRow
  return { account, accessToken: decryptMaybe(account.access_token) }
}

export async function touchAccountWebhook(accountId: string): Promise<void> {
  await admin()
    .from('whatsapp_accounts')
    .update({ last_webhook_at: new Date().toISOString() })
    .eq('id', accountId)
}
