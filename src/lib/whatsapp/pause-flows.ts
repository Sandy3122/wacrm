import { createClient } from '@supabase/supabase-js'
import { botPauseUntilFromHours } from '@/lib/whatsapp/bot-gate'

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

/** Pause active flow runs when a human takes over (CRM or Business App). */
export async function pauseActiveFlowRunsForContact(
  userId: string,
  contactId: string,
  endReason: 'agent_replied' | 'business_app_replied',
): Promise<void> {
  const { error } = await supabaseAdmin()
    .from('flow_runs')
    .update({
      status: 'paused_by_agent',
      ended_at: new Date().toISOString(),
      end_reason: endReason,
    })
    .eq('user_id', userId)
    .eq('contact_id', contactId)
    .eq('status', 'active')

  if (error) {
    console.error(`[flows] pause-on-${endReason} failed:`, error.message)
  }
}

export interface BotPauseSettings {
  /** Whether a human takeover should pause the conversation bot. */
  pauseEnabled: boolean
  /** How long to hold the pause, in hours. */
  hours: number
}

/**
 * Resolve the bot-pause settings governing human takeover for a
 * conversation. Prefers the bound whatsapp_accounts row (new model),
 * then falls back to the legacy whatsapp_config row. Defaults to
 * pausing for 24h when neither is found.
 *
 * The `pause_bot_on_app_reply` flag governs ANY human takeover — a reply
 * from the WhatsApp Business App OR a CRM agent — so the two paths back
 * the bot off consistently.
 */
export async function resolveBotPauseSettings(args: {
  accountId?: string | null
  userId?: string | null
}): Promise<BotPauseSettings> {
  if (args.accountId) {
    const { data } = await supabaseAdmin()
      .from('whatsapp_accounts')
      .select('pause_bot_on_app_reply, bot_pause_duration_hours')
      .eq('id', args.accountId)
      .maybeSingle()
    if (data) {
      return {
        pauseEnabled: data.pause_bot_on_app_reply !== false,
        hours: data.bot_pause_duration_hours ?? 24,
      }
    }
  }
  if (args.userId) {
    const { data } = await supabaseAdmin()
      .from('whatsapp_config')
      .select('pause_bot_on_app_reply, bot_pause_duration_hours')
      .eq('user_id', args.userId)
      .maybeSingle()
    if (data) {
      return {
        pauseEnabled: data.pause_bot_on_app_reply !== false,
        hours: data.bot_pause_duration_hours ?? 24,
      }
    }
  }
  return { pauseEnabled: true, hours: 24 }
}

/**
 * Pause a conversation's bot for `hours` from now. Mirrors what the
 * Business-App echo handler does so a CRM agent reply suppresses
 * automations on the next inbound message until the window expires
 * (the webhook auto-resumes via resumeBotIfPauseExpired).
 */
export async function pauseConversationBot(
  conversationId: string,
  hours: number,
): Promise<void> {
  const { error } = await supabaseAdmin()
    .from('conversations')
    .update({
      bot_status: 'paused',
      bot_paused_until: botPauseUntilFromHours(hours),
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId)
  if (error) {
    console.error('[flows] pause-conversation-bot failed:', error.message)
  }
}
