import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { resolveWorkspaceForUserId } from '@/lib/auth/workspace-context'

/**
 * Keep whatsapp_accounts in sync with the legacy whatsapp_config row.
 *
 * The legacy "WhatsApp Config" settings tab and the Embedded Signup
 * flow both write to whatsapp_config. To present a single source of
 * truth in the new Accounts UI — and to let provider-based routing work
 * for legacy-connected numbers — we mirror that row into
 * whatsapp_accounts (idempotent upsert keyed on phone_number_id).
 *
 * The encrypted tokens are copied verbatim (already encrypted with the
 * same ENCRYPTION_KEY), so no re-encryption is needed.
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

export interface LegacyConfigLike {
  user_id: string
  phone_number_id: string
  waba_id?: string | null
  business_id?: string | null
  display_phone_number?: string | null
  access_token: string
  verify_token?: string | null
  status?: string | null
  connection_type?: string | null
  webhook_status?: string | null
  history_sync_status?: string | null
  app_sync_enabled?: boolean | null
  pause_bot_on_app_reply?: boolean | null
  bot_pause_duration_hours?: number | null
  automation_outside_hours?: boolean | null
  fallback_message?: string | null
  connected_at?: string | null
  coexistence_onboarded_at?: string | null
}

/**
 * Upsert a whatsapp_accounts row mirroring the given legacy config.
 * Best-effort: failures are logged, never thrown — the legacy save
 * path must keep working even if the mirror fails.
 */
export async function syncLegacyConfigToAccount(
  config: LegacyConfigLike,
): Promise<void> {
  try {
    if (!config.phone_number_id || !config.access_token) return

    const scope = await resolveWorkspaceForUserId(config.user_id)

    const connectionType =
      config.connection_type === 'coexistence' ? 'coexistence' : 'legacy_cloud_api'

    const row: Record<string, unknown> = {
      organization_id: scope?.organizationId ?? null,
      workspace_id: scope?.workspaceId ?? null,
      user_id: config.user_id,
      name: config.display_phone_number || 'WhatsApp Account',
      connection_type: connectionType,
      provider_type: 'meta',
      phone_number_id: config.phone_number_id,
      waba_id: config.waba_id ?? null,
      business_id: config.business_id ?? null,
      display_phone_number: config.display_phone_number ?? null,
      access_token: config.access_token,
      verify_token: config.verify_token ?? null,
      status: config.status ?? 'connected',
      webhook_status: config.webhook_status ?? 'pending',
      history_sync_status: config.history_sync_status ?? 'pending',
      app_sync_enabled: config.app_sync_enabled ?? true,
      pause_bot_on_app_reply: config.pause_bot_on_app_reply ?? true,
      bot_pause_duration_hours: config.bot_pause_duration_hours ?? 24,
      automation_outside_hours: config.automation_outside_hours ?? false,
      fallback_message: config.fallback_message ?? null,
      connected_at: config.connected_at ?? new Date().toISOString(),
      coexistence_onboarded_at: config.coexistence_onboarded_at ?? null,
      updated_at: new Date().toISOString(),
    }

    // Does an account already exist for this phone number?
    const { data: existing } = await admin()
      .from('whatsapp_accounts')
      .select('id')
      .eq('phone_number_id', config.phone_number_id)
      .maybeSingle()

    if (existing) {
      const { error } = await admin()
        .from('whatsapp_accounts')
        .update(row)
        .eq('id', existing.id)
      if (error) console.warn('[account-sync] update failed:', error.message)
    } else {
      const { error } = await admin().from('whatsapp_accounts').insert(row)
      if (error) console.warn('[account-sync] insert failed:', error.message)
    }

    // Backfill conversations/messages for this user that have no account
    // binding yet, so the inbox + media routes resolve the right account.
    const { data: acct } = await admin()
      .from('whatsapp_accounts')
      .select('id')
      .eq('phone_number_id', config.phone_number_id)
      .maybeSingle()
    if (acct?.id) {
      await admin()
        .from('conversations')
        .update({ whatsapp_account_id: acct.id })
        .eq('user_id', config.user_id)
        .is('whatsapp_account_id', null)
    }
  } catch (err) {
    console.warn(
      '[account-sync] threw:',
      err instanceof Error ? err.message : err,
    )
  }
}

/**
 * Remove the mirrored account when a legacy config is deleted (reset).
 * Best-effort.
 */
export async function removeAccountForUser(userId: string): Promise<void> {
  try {
    await admin().from('whatsapp_accounts').delete().eq('user_id', userId)
  } catch (err) {
    console.warn(
      '[account-sync] remove threw:',
      err instanceof Error ? err.message : err,
    )
  }
}
