import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  sanitizePhoneForMeta,
  isValidE164,
  phoneVariants,
  isRecipientNotAllowedError,
} from '@/lib/whatsapp/phone-utils'
import {
  getAccountById,
  getAccountForUserId,
  resolveAccountForWorkspace,
  type ResolvedAccount,
} from '@/lib/whatsapp/accounts'
import { providerForResolvedAccount } from '@/lib/whatsapp/providers/factory'
import type { WhatsAppProvider } from '@/lib/whatsapp/providers/types'

/**
 * Provider-aware send service (Sprint 3).
 *
 * Single place that: resolves the account → builds the provider →
 * sends with phone-variant retry → persists the message + updates the
 * conversation. Replaces the Graph-direct logic that was duplicated
 * across the send route, automations, and flows.
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

export interface ResolveSendAccountArgs {
  workspaceId?: string | null
  accountId?: string | null
  userId?: string | null
}

/**
 * Resolve the account to send from: prefer explicit account id, then
 * workspace default, then legacy user_id.
 */
export async function resolveSendAccount(
  args: ResolveSendAccountArgs,
): Promise<ResolvedAccount | null> {
  if (args.accountId) {
    const byId = await getAccountById(args.accountId)
    if (byId) return byId
  }
  if (args.workspaceId) {
    const byWs = await resolveAccountForWorkspace(args.workspaceId, args.accountId)
    if (byWs) return byWs
  }
  if (args.userId) {
    return getAccountForUserId(args.userId)
  }
  return null
}

interface SendOutcome {
  whatsappMessageId: string
  workingPhone: string
}

/**
 * Run a send closure across phone-number variants, retrying only on
 * Meta/BSP "recipient not allowed" errors. Returns the working phone +
 * external message id.
 */
async function sendWithVariants(
  rawPhone: string,
  send: (phone: string) => Promise<string>,
): Promise<SendOutcome> {
  const sanitized = sanitizePhoneForMeta(rawPhone)
  if (!isValidE164(sanitized)) {
    throw new Error(`contact phone invalid: ${rawPhone}`)
  }
  const variants = phoneVariants(sanitized)
  let workingPhone = sanitized
  let whatsappMessageId = ''
  let lastError: unknown = null
  for (const variant of variants) {
    try {
      whatsappMessageId = await send(variant)
      workingPhone = variant
      lastError = null
      break
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (!isRecipientNotAllowedError(msg)) throw err
      lastError = err
    }
  }
  if (lastError) throw lastError
  return { whatsappMessageId, workingPhone }
}

export interface SendMessageArgs {
  account: ResolvedAccount
  conversationId: string
  contactId: string
  contactPhone: string
  senderType: 'agent' | 'bot'
  contextMessageId?: string
  kind:
    | { type: 'text'; text: string }
    | { type: 'template'; templateName: string; language?: string; params?: string[] }
}

export interface SendMessageResult {
  whatsappMessageId: string
  internalMessageId: string
}

/**
 * Send a text/template message through the account's provider and
 * persist it. Shared by the user send route and the engines.
 */
export async function sendAndPersist(
  args: SendMessageArgs,
): Promise<SendMessageResult> {
  const db = admin()
  const provider: WhatsAppProvider = providerForResolvedAccount(args.account)

  const send = (phone: string): Promise<string> => {
    if (args.kind.type === 'template') {
      return provider
        .sendTemplate({
          to: phone,
          templateName: args.kind.templateName,
          language: args.kind.language,
          params: args.kind.params,
          contextMessageId: args.contextMessageId,
        })
        .then((r) => r.messageId)
    }
    return provider
      .sendText({
        to: phone,
        text: args.kind.text,
        contextMessageId: args.contextMessageId,
      })
      .then((r) => r.messageId)
  }

  const { whatsappMessageId, workingPhone } = await sendWithVariants(
    args.contactPhone,
    send,
  )

  if (workingPhone !== sanitizePhoneForMeta(args.contactPhone)) {
    await db.from('contacts').update({ phone: workingPhone }).eq('id', args.contactId)
  }

  const isTemplate = args.kind.type === 'template'
  const contentText = args.kind.type === 'text' ? args.kind.text : null
  const templateName = isTemplate
    ? (args.kind as { templateName: string }).templateName
    : null

  const { data: messageRecord, error: msgError } = await db
    .from('messages')
    .insert({
      conversation_id: args.conversationId,
      whatsapp_account_id: args.account.account.id,
      sender_type: args.senderType,
      content_type: isTemplate ? 'template' : 'text',
      content_text: contentText,
      template_name: templateName,
      message_id: whatsappMessageId,
      provider_message_id: whatsappMessageId,
      provider: args.account.account.provider_type,
      status: 'sent',
      message_source: isTemplate ? 'template' : 'api',
      direction: 'outbound',
    })
    .select('id')
    .single()

  if (msgError) {
    throw new Error(`sent to provider but DB insert failed: ${msgError.message}`)
  }

  await db
    .from('conversations')
    .update({
      last_message_text: contentText || `[${isTemplate ? 'template' : 'text'}]`,
      last_message_at: new Date().toISOString(),
      last_message_source: 'api',
      updated_at: new Date().toISOString(),
    })
    .eq('id', args.conversationId)

  return { whatsappMessageId, internalMessageId: messageRecord.id }
}
