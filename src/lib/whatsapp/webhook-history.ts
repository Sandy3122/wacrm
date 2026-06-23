import { createClient } from '@supabase/supabase-js'
import { normalizePhone } from '@/lib/whatsapp/phone-utils'
import { findOrCreateContact, findOrCreateConversation } from '@/lib/whatsapp/webhook-contact'
import type { WhatsAppConfigRow } from '@/lib/whatsapp/config-resolver'

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

interface HistoryMessage {
  id?: string
  from?: string
  to?: string
  timestamp?: string
  type?: string
  text?: { body?: string }
}

/**
 * Best-effort ingestion of Meta `history` webhook payloads (coexistence sync).
 */
export async function processHistorySync(args: {
  value: {
    history?: Array<{
      messages?: HistoryMessage[]
      errors?: unknown[]
    }>
    metadata?: { phone_number_id?: string }
  }
  config: WhatsAppConfigRow
}): Promise<void> {
  const { value, config } = args
  const userId = config.user_id
  const histories = value.history ?? []
  const scope = {
    workspaceId: (config.workspace_id as string | null) ?? null,
    organizationId: (config.organization_id as string | null) ?? null,
  }
  const whatsappAccountId = (config.whatsapp_account_id as string | null) ?? null

  for (const chunk of histories) {
    const messages = chunk.messages ?? []
    for (const msg of messages) {
      if (!msg.id || !msg.from) continue

      const isInbound = msg.from !== config.display_phone_number
      const customerPhone = normalizePhone(isInbound ? msg.from : (msg.to ?? msg.from))
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
        { ...scope, whatsappAccountId, customerWaId: customerPhone },
      )
      if (!conversation) continue

      const contentText = msg.text?.body ?? `[${msg.type ?? 'message'}]`

      const { error } = await supabaseAdmin().from('messages').insert({
        conversation_id: conversation.id,
        whatsapp_account_id: whatsappAccountId,
        sender_type: isInbound ? 'customer' : 'agent',
        content_type: 'text',
        content_text: contentText,
        message_id: msg.id,
        status: 'delivered',
        message_source: isInbound ? 'customer' : 'business_app',
        direction: isInbound ? 'inbound' : 'outbound',
        raw_payload: msg,
        created_at: msg.timestamp
          ? new Date(parseInt(msg.timestamp, 10) * 1000).toISOString()
          : new Date().toISOString(),
      })

      if (error && error.code !== '23505') {
        console.warn('[webhook] history message insert failed:', error.message)
      }
    }
  }

  // The config id may belong to either whatsapp_accounts (new model) or
  // whatsapp_config (legacy). Update both — the non-matching one is a
  // cheap no-op — so the coexistence onboarding badge reflects 'complete'
  // regardless of which table the account was resolved from.
  await Promise.all([
    supabaseAdmin()
      .from('whatsapp_accounts')
      .update({ history_sync_status: 'complete' })
      .eq('id', config.id),
    supabaseAdmin()
      .from('whatsapp_config')
      .update({ history_sync_status: 'complete' })
      .eq('id', config.id),
  ])
}

interface SmbContactSync {
  full_name?: string
  first_name?: string
  phone_number?: string
}

/**
 * Ingest `smb_app_state_sync` contact updates from WhatsApp Business App.
 */
export async function processSmbAppStateSync(args: {
  value: {
    state_sync?: Array<{
      type?: string
      contact?: SmbContactSync
      action?: string
    }>
  }
  config: WhatsAppConfigRow
}): Promise<void> {
  const { value, config } = args
  const userId = config.user_id
  const items = value.state_sync ?? []
  const scope = {
    workspaceId: (config.workspace_id as string | null) ?? null,
    organizationId: (config.organization_id as string | null) ?? null,
  }

  for (const item of items) {
    if (item.type !== 'contact' || !item.contact?.phone_number) continue
    const phone = normalizePhone(item.contact.phone_number)
    const name =
      item.contact.full_name ??
      item.contact.first_name ??
      phone

    await findOrCreateContact(userId, phone, name, scope)
  }
}
