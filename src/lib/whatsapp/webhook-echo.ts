import { createClient } from '@supabase/supabase-js'
import { normalizePhone } from '@/lib/whatsapp/phone-utils'
import { botPauseUntilFromHours } from '@/lib/whatsapp/bot-gate'
import { pauseActiveFlowRunsForContact } from '@/lib/whatsapp/pause-flows'
import type { WhatsAppConfigRow } from '@/lib/whatsapp/config-resolver'
import { findOrCreateContact, findOrCreateConversation } from '@/lib/whatsapp/webhook-contact'

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

export interface MessageEchoPayload {
  id: string
  from: string
  to: string
  timestamp: string
  type: string
  text?: { body: string }
  image?: { id: string; caption?: string }
  video?: { id: string; caption?: string }
  document?: { id: string; filename?: string; caption?: string }
  audio?: { id: string }
  location?: { latitude: number; longitude: number; name?: string; address?: string }
}

function echoContentText(echo: MessageEchoPayload): string {
  switch (echo.type) {
    case 'text':
      return echo.text?.body ?? ''
    case 'image':
      return echo.image?.caption ?? '[Image]'
    case 'video':
      return echo.video?.caption ?? '[Video]'
    case 'document':
      return echo.document?.caption ?? echo.document?.filename ?? '[Document]'
    case 'audio':
      return '[Audio]'
    case 'location':
      return echo.location?.name ?? echo.location?.address ?? '[Location]'
    default:
      return `[${echo.type}]`
  }
}

function mapEchoContentType(type: string): string {
  const allowed = new Set(['text', 'image', 'document', 'audio', 'video', 'location'])
  return allowed.has(type) ? type : 'text'
}

/**
 * Process outbound messages sent from the WhatsApp Business App (coexistence echo).
 * Does not trigger flows or automations.
 */
export async function processBusinessAppEcho(args: {
  echoes: MessageEchoPayload[]
  config: WhatsAppConfigRow
  rawChangeValue: unknown
}): Promise<void> {
  const { echoes, config, rawChangeValue } = args
  const userId = config.user_id
  const scope = {
    workspaceId: (config.workspace_id as string | null) ?? null,
    organizationId: (config.organization_id as string | null) ?? null,
  }
  const whatsappAccountId = (config.whatsapp_account_id as string | null) ?? null

  for (const echo of echoes) {
    const customerPhone = normalizePhone(echo.to)
    const contactOutcome = await findOrCreateContact(
      userId,
      customerPhone,
      customerPhone,
      scope,
    )
    if (!contactOutcome) continue

    const conversation = await findOrCreateConversation(
      userId,
      contactOutcome.contact.id,
      {
        ...scope,
        whatsappAccountId,
        customerWaId: customerPhone,
      },
    )
    if (!conversation) continue

    const contentText = echoContentText(echo)
    const contentType = mapEchoContentType(echo.type)

    const { error: insertErr } = await supabaseAdmin().from('messages').insert({
      conversation_id: conversation.id,
      whatsapp_account_id: whatsappAccountId,
      provider_message_id: echo.id,
      sender_type: 'agent',
      content_type: contentType,
      content_text: contentText,
      message_id: echo.id,
      status: 'sent',
      message_source: 'business_app',
      direction: 'outbound',
      raw_payload: echo,
      created_at: new Date(parseInt(echo.timestamp, 10) * 1000).toISOString(),
    })

    if (insertErr) {
      if (insertErr.code === '23505') {
        continue
      }
      console.error('[webhook] echo insert failed:', insertErr.message)
      continue
    }

    const convUpdate: Record<string, unknown> = {
      last_message_text: contentText,
      last_message_at: new Date().toISOString(),
      last_message_source: 'business_app',
      updated_at: new Date().toISOString(),
    }

    if (config.pause_bot_on_app_reply !== false) {
      const hours = config.bot_pause_duration_hours ?? 24
      convUpdate.bot_status = 'paused'
      convUpdate.bot_paused_until = botPauseUntilFromHours(hours)
    }

    await supabaseAdmin().from('conversations').update(convUpdate).eq('id', conversation.id)

    await pauseActiveFlowRunsForContact(
      userId,
      contactOutcome.contact.id,
      'business_app_replied',
    )

    void rawChangeValue
  }
}
