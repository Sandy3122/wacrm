import { NextResponse, after } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { decrypt, encrypt, isLegacyFormat } from '@/lib/whatsapp/encryption'
import { getMediaUrl } from '@/lib/whatsapp/meta-api'
import { normalizePhone } from '@/lib/whatsapp/phone-utils'
import { verifyMetaWebhookSignature } from '@/lib/whatsapp/webhook-signature'
import { runAutomationsForTrigger } from '@/lib/automations/engine'
import { dispatchInboundToFlows } from '@/lib/flows/engine'
import { shouldRunAutomation } from '@/lib/whatsapp/bot-gate'
import {
  getWhatsAppConfigForPhoneNumberId,
  logWebhookEvent,
  touchLastWebhookAt,
} from '@/lib/whatsapp/config-resolver'
import {
  ingestRawEvent,
  markEventStatus,
} from '@/lib/whatsapp/webhook-ingest'
import { getAccountById } from '@/lib/whatsapp/accounts'
import { providerForResolvedAccount } from '@/lib/whatsapp/providers/factory'
import {
  checkRateLimit,
  rateLimitResponse,
  RATE_LIMITS,
} from '@/lib/rate-limit'
import { processBusinessAppEcho } from '@/lib/whatsapp/webhook-echo'
import {
  processHistorySync,
  processSmbAppStateSync,
} from '@/lib/whatsapp/webhook-history'
import {
  findOrCreateContact,
  findOrCreateConversation,
  resumeBotIfPauseExpired,
} from '@/lib/whatsapp/webhook-contact'

// Give the post-response `after()` work (media verification, automation
// + flow dispatch) headroom beyond the default function timeout. Vercel
// caps this to the plan's max; the GET verification path returns long
// before this matters.
export const maxDuration = 60

// Lazy-initialized to avoid build-time crash when env vars are missing
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _adminClient: any = null
function supabaseAdmin() {
  if (!_adminClient) {
    _adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return _adminClient
}

interface WhatsAppMessage {
  id: string
  from: string
  timestamp: string
  type: string
  text?: { body: string }
  image?: { id: string; mime_type: string; caption?: string }
  video?: { id: string; mime_type: string; caption?: string }
  document?: { id: string; mime_type: string; filename?: string; caption?: string }
  audio?: { id: string; mime_type: string }
  sticker?: { id: string; mime_type: string }
  location?: { latitude: number; longitude: number; name?: string; address?: string }
  reaction?: { message_id: string; emoji: string }
  /**
   * Set when the customer taps a button or list row on an interactive
   * message we sent. `button_reply.id` / `list_reply.id` is whatever id
   * we put on the button/row when sending — the Flows engine uses this
   * to advance the per-contact run.
   */
  interactive?: {
    type: 'button_reply' | 'list_reply'
    button_reply?: { id: string; title: string }
    list_reply?: { id: string; title: string; description?: string }
  }
  /** Present when the customer swipe-replies to one of our messages. */
  context?: { id: string }
}

interface MessageEchoPayload {
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

interface WhatsAppWebhookEntry {
  id: string
  changes: Array<{
    value: {
      messaging_product: string
      metadata: {
        display_phone_number: string
        phone_number_id: string
      }
      contacts?: Array<{
        profile: { name: string }
        wa_id: string
      }>
      messages?: WhatsAppMessage[]
      message_echoes?: MessageEchoPayload[]
      statuses?: Array<{
        id: string
        status: string
        timestamp: string
        recipient_id: string
      }>
      history?: Array<{ messages?: unknown[] }>
      state_sync?: Array<{ type?: string; contact?: { phone_number?: string } }>
    }
    field: string
  }>
}

// GET - Webhook verification
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const mode = searchParams.get('hub.mode')
    const challenge = searchParams.get('hub.challenge')
    const verifyToken = searchParams.get('hub.verify_token')

    if (mode !== 'subscribe' || !challenge || !verifyToken) {
      return NextResponse.json(
        { error: 'Missing verification parameters' },
        { status: 400 }
      )
    }

    // Check verify tokens across BOTH the new whatsapp_accounts table
    // and the legacy whatsapp_config table. Either may hold the token
    // depending on how the account was connected.
    const [accountsRes, configsRes] = await Promise.all([
      supabaseAdmin().from('whatsapp_accounts').select('id, verify_token'),
      supabaseAdmin().from('whatsapp_config').select('id, verify_token'),
    ])

    if (accountsRes.error && configsRes.error) {
      console.error(
        'Error fetching configs for verification:',
        accountsRes.error ?? configsRes.error,
      )
      return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
    }

    // Match against whatsapp_accounts first.
    for (const account of accountsRes.data ?? []) {
      if (!account.verify_token) continue
      try {
        if (decrypt(account.verify_token) === verifyToken) {
          supabaseAdmin()
            .from('whatsapp_accounts')
            .update({ webhook_status: 'verified' })
            .eq('id', account.id)
            .then(({ error }: { error: unknown }) => {
              if (error) console.warn('[webhook] failed to mark account verified:', error)
            })
          return new Response(challenge, {
            status: 200,
            headers: { 'Content-Type': 'text/plain' },
          })
        }
      } catch {
        // malformed / wrong-key — skip
      }
    }

    const configs = configsRes.data ?? []

    // Check if any config's verify_token matches. Also collect the
    // matching row so we can opportunistically upgrade its token to
    // GCM if it was still in the legacy CBC format.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let matchedConfig: any = null
    for (const config of configs) {
      if (!config.verify_token) continue
      try {
        if (decrypt(config.verify_token) === verifyToken) {
          matchedConfig = config
          break
        }
      } catch {
        // Malformed / wrong-key token row — skip it and keep checking.
      }
    }

    if (matchedConfig) {
      if (isLegacyFormat(matchedConfig.verify_token)) {
        void supabaseAdmin()
          .from('whatsapp_config')
          .update({ verify_token: encrypt(verifyToken) })
          .eq('id', matchedConfig.id)
          .then(({ error }: { error: unknown }) => {
            if (error) {
              console.warn(
                '[webhook] verify_token GCM upgrade failed:',
                (error as { message?: string })?.message ?? error,
              )
            }
          })
      }
      void supabaseAdmin()
        .from('whatsapp_config')
        .update({ webhook_status: 'verified' })
        .eq('id', matchedConfig.id)
        .then(({ error }: { error: unknown }) => {
          if (error) console.warn('[webhook] failed to mark config verified:', error)
        })
      return new Response(challenge, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      })
    }

    return NextResponse.json(
      { error: 'Verification token mismatch' },
      { status: 403 }
    )
  } catch (error) {
    console.error('Error in webhook GET verification:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Receive messages
export async function POST(request: Request) {
  // Read raw body first so we can HMAC-verify the exact bytes Meta
  // signed. request.json() would re-encode and break the signature.
  const rawBody = await request.text()
  const signature = request.headers.get('x-hub-signature-256')

  if (!verifyMetaWebhookSignature(rawBody, signature)) {
    // 401 (not 200) — we want Meta's delivery dashboard to show failures
    // loudly if a misconfiguration causes signatures to stop matching,
    // rather than silently eating events.
    console.warn('[webhook] rejected request with invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let body: { entry?: WhatsAppWebhookEntry[] }
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Rate-limit per phone_number_id (Sprint 8). Bursty providers are
  // fine; a single number flooding past the ceiling is throttled.
  const phoneId =
    body.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id ?? 'unknown'
  const limit = checkRateLimit(`webhook:${phoneId}`, RATE_LIMITS.webhook)
  if (!limit.success) {
    return rateLimitResponse(limit)
  }

  // Process AFTER the 200 ack so we stay within Meta's webhook timeout,
  // but via `after()` — NOT bare fire-and-forget. On Vercel the
  // serverless function is frozen the instant the response is sent, so a
  // un-awaited `processWebhook(body)` was being killed mid-flight: Meta
  // got its 200 (double tick on the sender's phone) while the message
  // never reached the database. `after()` keeps the function alive (it
  // uses the platform's waitUntil) until processing resolves.
  after(async () => {
    try {
      await processWebhook(body)
    } catch (error) {
      console.error('Error processing webhook:', error)
    }
  })

  return NextResponse.json({ status: 'received' }, { status: 200 })
}

export async function processWebhook(body: { entry?: WhatsAppWebhookEntry[] }) {
  if (!body.entry) return

  for (const entry of body.entry) {
    for (const change of entry.changes) {
      const value = change.value
      const field = change.field
      const phoneNumberId = value.metadata?.phone_number_id

      if (value.statuses) {
        for (const status of value.statuses) {
          await handleStatusUpdate(status)
        }
      }

      if (!phoneNumberId) continue

      const resolved = await getWhatsAppConfigForPhoneNumberId(phoneNumberId)
      if (!resolved) {
        console.error('No config found for phone_number_id:', phoneNumberId)
        continue
      }

      const { config, accessToken: decryptedAccessToken } = resolved

      // Durable ingest (Sprint 4): persist the raw change first, with a
      // dedupe key derived from the message/echo ids so provider
      // retries don't double-process. isNew=false → skip (already seen).
      const dedupeKey = deriveDedupeKey(phoneNumberId, field, value)
      const ingest = await ingestRawEvent({
        provider: (config.provider_type as string) ?? 'meta',
        phoneNumberId,
        whatsappAccountId: (config.whatsapp_account_id as string) ?? null,
        workspaceId: (config.workspace_id as string) ?? null,
        dedupeKey,
        payload: { field, value },
      })
      if (dedupeKey && !ingest.isNew) {
        // Duplicate delivery — already ingested/processed. Skip silently.
        continue
      }

      try {
        await processChange({ field, value, config, decryptedAccessToken })
        await markEventStatus(ingest.id, 'processed')
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.error('[webhook] processChange failed:', message)
        await markEventStatus(ingest.id, 'failed', { error: message })
      }
    }
  }
}

/**
 * Derive a stable dedupe key for a webhook change. For message/echo
 * changes we key on the message ids; otherwise return null so the
 * ingest layer hashes the full payload (statuses can legitimately
 * repeat across the delivery ladder, so they aren't deduped here).
 */
function deriveDedupeKey(
  phoneNumberId: string,
  field: string,
  value: WhatsAppWebhookEntry['changes'][number]['value'],
): string | null {
  if (value.messages?.length) {
    return `msg:${phoneNumberId}:${value.messages.map((m) => m.id).join(',')}`
  }
  if (value.message_echoes?.length) {
    return `echo:${phoneNumberId}:${value.message_echoes.map((m) => m.id).join(',')}`
  }
  void field
  return null
}

type ResolvedConfig = NonNullable<
  Awaited<ReturnType<typeof getWhatsAppConfigForPhoneNumberId>>
>['config']

/**
 * Normalize + dispatch a single webhook change. Extracted from
 * processWebhook so the durable-ingest wrapper can catch failures per
 * change and mark them replayable.
 */
async function processChange(args: {
  field: string
  value: WhatsAppWebhookEntry['changes'][number]['value']
  config: ResolvedConfig
  decryptedAccessToken: string
}) {
  const { field, value, config, decryptedAccessToken } = args
  const phoneNumberId = value.metadata?.phone_number_id

  void touchLastWebhookAt(config.id)
  void logWebhookEvent({
    userId: config.user_id,
    phoneNumberId: phoneNumberId ?? '',
    field,
    payload: value,
  })

  if (field === 'smb_message_echoes' || field === 'message_echoes') {
    const echoes = value.message_echoes
    if (echoes?.length) {
      await processBusinessAppEcho({ echoes, config, rawChangeValue: value })
    }
    return
  }

  if (field === 'history') {
    await processHistorySync({
      value: value as Parameters<typeof processHistorySync>[0]['value'],
      config,
    })
    return
  }

  if (field === 'smb_app_state_sync') {
    await processSmbAppStateSync({
      value: value as Parameters<typeof processSmbAppStateSync>[0]['value'],
      config,
    })
    return
  }

  if (field !== 'messages' && !value.messages) return
  if (!value.messages || !value.contacts) return

  for (let i = 0; i < value.messages.length; i++) {
    const message = value.messages[i]
    const contact = value.contacts[i] || value.contacts[0]

    await processMessage(message, contact, config.user_id, decryptedAccessToken, {
      whatsappAccountId: (config.whatsapp_account_id as string) ?? null,
      workspaceId: (config.workspace_id as string) ?? null,
      organizationId: (config.organization_id as string) ?? null,
    })
  }
}

// The happy-path status ladder — pending → sent → delivered → read →
// replied. Webhook replays must never regress a recipient back down
// this ladder.
//
// `failed` is NOT on this ladder. It's a terminal side branch that is
// only valid from the early states (pending / sent) — once Meta has
// delivered or the user has read or replied, a later "failed" status
// event is a bug in Meta's pipeline or a spoof attempt and must be
// ignored.
const RECIPIENT_STATUS_LADDER = [
  'pending',
  'sent',
  'delivered',
  'read',
  'replied',
] as const

function ladderLevel(s: string): number {
  const idx = (RECIPIENT_STATUS_LADDER as readonly string[]).indexOf(s)
  return idx < 0 ? -1 : idx
}

/**
 * Can a recipient transition from `current` to `incoming`?
 *   - Along the ladder, only forward moves are allowed.
 *   - `failed` is accepted only from `pending` or `sent`; it's refused
 *     once the recipient has reached any of the success states.
 */
function isValidStatusTransition(current: string, incoming: string): boolean {
  if (incoming === 'failed') {
    return current === 'pending' || current === 'sent'
  }
  if (current === 'failed') {
    return false // failed is terminal
  }
  const ci = ladderLevel(current)
  const ii = ladderLevel(incoming)
  if (ii < 0) return false // unknown incoming status
  if (ci < 0) return true // unknown current — accept anything on the ladder
  return ii > ci
}

async function handleStatusUpdate(status: {
  id: string
  status: string
  timestamp: string
  recipient_id: string
}) {
  // 1) Mirror onto messages (legacy behavior) — Meta's status values
  //    already match the CHECK constraint on messages.status.
  const { error: msgErr } = await supabaseAdmin()
    .from('messages')
    .update({ status: status.status })
    .eq('message_id', status.id)

  if (msgErr) {
    console.error('Error updating message status:', msgErr)
  }

  // 2) Mirror onto broadcast_recipients via whatsapp_message_id
  //    (added in migration 003). The aggregate trigger on
  //    broadcast_recipients re-derives the parent broadcast's
  //    sent/delivered/read/failed counts automatically.
  const tsIso = new Date(parseInt(status.timestamp) * 1000).toISOString()

  const { data: recipient, error: recFetchErr } = await supabaseAdmin()
    .from('broadcast_recipients')
    .select('id, status')
    .eq('whatsapp_message_id', status.id)
    .maybeSingle()

  if (recFetchErr) {
    console.error('Error fetching broadcast recipient:', recFetchErr)
    return
  }
  if (!recipient) return // message wasn't part of a broadcast — fine

  // Guard transitions — forward-only on the success ladder, and
  // `failed` only from pre-delivered states.
  if (!isValidStatusTransition(recipient.status, status.status)) return

  const update: Record<string, unknown> = { status: status.status }
  if (status.status === 'sent' && !('sent_at' in update)) update.sent_at = tsIso
  if (status.status === 'delivered') update.delivered_at = tsIso
  if (status.status === 'read') update.read_at = tsIso

  const { error: recUpdateErr } = await supabaseAdmin()
    .from('broadcast_recipients')
    .update(update)
    .eq('id', recipient.id)

  if (recUpdateErr) {
    console.error('Error updating broadcast recipient status:', recUpdateErr)
  }
}

/**
 * If an inbound message's sender is on a still-unreplied
 * broadcast_recipients row, flip it to `replied` so the reply count
 * advances on the parent broadcast.
 *
 * Runs on a best-effort basis — failures here must not break the
 * main inbound-message flow, so errors are swallowed with a log.
 */
async function flagBroadcastReplyIfAny(userId: string, contactId: string) {
  try {
    // Most recent outbound broadcast that hasn't been replied to yet.
    const { data: recs, error } = await supabaseAdmin()
      .from('broadcast_recipients')
      .select('id, status, broadcast_id, broadcasts!inner(user_id)')
      .eq('contact_id', contactId)
      .eq('broadcasts.user_id', userId)
      .in('status', ['sent', 'delivered', 'read'])
      .order('created_at', { ascending: false })
      .limit(1)

    if (error || !recs || recs.length === 0) return

    const row = recs[0]
    const { error: updErr } = await supabaseAdmin()
      .from('broadcast_recipients')
      .update({ status: 'replied', replied_at: new Date().toISOString() })
      .eq('id', row.id)

    if (updErr) {
      console.error('Error marking broadcast recipient replied:', updErr)
    }
  } catch (err) {
    console.error('flagBroadcastReplyIfAny failed:', err)
  }
}

/**
 * Resolve a Meta-side message_id into the matching internal UUID, scoped
 * to one conversation. Returns null when we never received the parent
 * (e.g. a swipe-reply to a message older than this CRM install).
 */
async function lookupInternalIdByMetaId(
  metaId: string,
  conversationId: string
): Promise<string | null> {
  const { data, error } = await supabaseAdmin()
    .from('messages')
    .select('id')
    .eq('message_id', metaId)
    .eq('conversation_id', conversationId)
    .maybeSingle()
  if (error) {
    console.error('[webhook] lookupInternalIdByMetaId failed:', error.message)
    return null
  }
  return data?.id ?? null
}

/**
 * Persist an inbound reaction. WhatsApp reactions are not new messages —
 * they're per-(target, actor) state. We upsert / delete on
 * `message_reactions`, never write a row into `messages`.
 *
 * Best-effort: a missing parent (we never received it) is logged and
 * skipped so the webhook still acks 200 to Meta.
 */
async function handleReaction(
  message: WhatsAppMessage,
  conversationId: string,
  contactId: string
) {
  const reaction = message.reaction
  if (!reaction?.message_id) return

  const targetInternalId = await lookupInternalIdByMetaId(
    reaction.message_id,
    conversationId
  )
  if (!targetInternalId) {
    console.warn(
      '[webhook] reaction target message not found; skipping',
      reaction.message_id
    )
    return
  }

  // Empty emoji = removal (per Meta's Cloud API spec).
  if (!reaction.emoji) {
    const { error: delError } = await supabaseAdmin()
      .from('message_reactions')
      .delete()
      .eq('message_id', targetInternalId)
      .eq('actor_type', 'customer')
      .eq('actor_id', contactId)
    if (delError) {
      console.error('[webhook] reaction delete failed:', delError.message)
    }
    return
  }

  const { error: upsertError } = await supabaseAdmin()
    .from('message_reactions')
    .upsert(
      {
        message_id: targetInternalId,
        conversation_id: conversationId,
        actor_type: 'customer',
        actor_id: contactId,
        emoji: reaction.emoji,
      },
      { onConflict: 'message_id,actor_type,actor_id' }
    )
  if (upsertError) {
    console.error('[webhook] reaction upsert failed:', upsertError.message)
  }
}

async function processMessage(
  message: WhatsAppMessage,
  contact: { profile: { name: string }; wa_id: string },
  userId: string,
  accessToken: string,
  scope: {
    whatsappAccountId: string | null
    workspaceId: string | null
    organizationId: string | null
  } = { whatsappAccountId: null, workspaceId: null, organizationId: null },
) {
  const senderPhone = normalizePhone(message.from)
  const contactName = contact.profile.name

  // Find or create contact
  const contactOutcome = await findOrCreateContact(
    userId,
    senderPhone,
    contactName,
    { workspaceId: scope.workspaceId, organizationId: scope.organizationId },
  )
  if (!contactOutcome) return
  const contactRecord = contactOutcome.contact

  // Find or create conversation
  const conversation = await findOrCreateConversation(
    userId,
    contactRecord.id,
    {
      workspaceId: scope.workspaceId,
      organizationId: scope.organizationId,
      whatsappAccountId: scope.whatsappAccountId,
      customerWaId: contact.wa_id,
    },
  )
  if (!conversation) return

  await resumeBotIfPauseExpired(conversation.id)

  const { data: convState } = await supabaseAdmin()
    .from('conversations')
    .select('bot_status, bot_paused_until, assigned_agent_id')
    .eq('id', conversation.id)
    .maybeSingle()

  const runAutomation = shouldRunAutomation(convState ?? conversation)

  // Reactions short-circuit here — they aren't messages. We never insert
  // into `messages`, never bump unread_count, never update last_message_text.
  // Done before parseMessageContent so the media-URL fetch is skipped.
  if (message.type === 'reaction') {
    await handleReaction(message, conversation.id, contactRecord.id)
    return
  }

  // Build a provider for media verification from the bound account so
  // BSP inbound media resolves through the right transport. Falls back
  // to the legacy Meta access token when no account is bound.
  let mediaProvider: { getMediaUrl: (mediaId: string) => Promise<unknown> } | null =
    null
  if (scope.whatsappAccountId) {
    try {
      const resolved = await getAccountById(scope.whatsappAccountId)
      if (resolved) mediaProvider = providerForResolvedAccount(resolved)
    } catch (err) {
      console.warn(
        '[webhook] media provider build failed, using Meta fallback:',
        err instanceof Error ? err.message : err,
      )
    }
  }

  // Parse message content based on type
  const { contentText, mediaUrl, mediaType, interactiveReplyId } =
    await parseMessageContent(message, accessToken, mediaProvider)

  // Resolve swipe-reply context if present. A missing parent is fine —
  // we just store NULL and the UI renders the message without a quote.
  let replyToInternalId: string | null = null
  if (message.context?.id) {
    replyToInternalId = await lookupInternalIdByMetaId(
      message.context.id,
      conversation.id
    )
    if (!replyToInternalId) {
      console.warn(
        '[webhook] reply context parent not found:',
        message.context.id
      )
    }
  }

  // Insert message — field names MUST match the messages table schema
  // (see supabase/migrations/001_initial_schema.sql):
  //   conversation_id, sender_type, content_type, content_text,
  //   media_url, template_name, message_id, status, created_at
  // `mediaType` is intentionally unused — the schema has no media_type
  // column; the MIME type is only used to construct the proxy URL during
  // parseMessageContent. Silence the unused-var warning:
  void mediaType

  // The messages.content_type CHECK constraint (widened in migration 010
  // to add 'interactive' for button/list taps) allows:
  //   text, image, document, audio, video, location, template, interactive
  // Map incoming WhatsApp types that aren't in that list to the closest
  // allowed value so the INSERT doesn't fail with a constraint error.
  const ALLOWED_CONTENT_TYPES = new Set([
    'text', 'image', 'document', 'audio', 'video',
    'location', 'template', 'interactive',
  ])
  const contentType = ALLOWED_CONTENT_TYPES.has(message.type)
    ? message.type
    : message.type === 'sticker'
      ? 'image'   // stickers are images
      : 'text'    // reaction, unknown → text fallback

  // Determine whether this is the contact's very first inbound message
  // BEFORE we insert, so the count is accurate. Covers the case where
  // the contact row already exists (manual add / CSV import) but they've
  // never messaged us before — which new_contact_created wouldn't catch.
  const { count: priorCustomerMsgCount } = await supabaseAdmin()
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', conversation.id)
    .eq('sender_type', 'customer')
  const isFirstInboundMessage = (priorCustomerMsgCount ?? 0) === 0

  const { error: msgError } = await supabaseAdmin().from('messages').insert({
    conversation_id: conversation.id,
    whatsapp_account_id: scope.whatsappAccountId,
    provider_message_id: message.id,
    sender_type: 'customer',
    content_type: contentType,
    content_text: contentText,
    media_url: mediaUrl,
    message_id: message.id,
    status: 'delivered',
    message_source: 'customer',
    direction: 'inbound',
    raw_payload: message,
    created_at: new Date(parseInt(message.timestamp) * 1000).toISOString(),
    reply_to_message_id: replyToInternalId,
    interactive_reply_id: interactiveReplyId,
  })

  if (msgError) {
    if (msgError.code === '23505') return
    console.error('Error inserting message:', msgError)
    return
  }

  const { error: convError } = await supabaseAdmin()
    .from('conversations')
    .update({
      last_message_text: contentText || `[${message.type}]`,
      last_message_at: new Date().toISOString(),
      last_message_source: 'customer',
      unread_count: (conversation.unread_count || 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversation.id)

  if (convError) {
    console.error('Error updating conversation:', convError)
  }

  // If this contact was a recent broadcast recipient, flag the reply
  // so the broadcast's `replied_count` advances (via the aggregate
  // trigger installed in migration 003).
  await flagBroadcastReplyIfAny(userId, contactRecord.id)

  if (!runAutomation) {
    return
  }

  const flowResult = await dispatchInboundToFlows({
    userId,
    contactId: contactRecord.id,
    conversationId: conversation.id,
    message:
      interactiveReplyId
        ? {
            kind: 'interactive_reply',
            reply_id: interactiveReplyId,
            reply_title: contentText ?? '',
            meta_message_id: message.id,
          }
        : {
            kind: 'text',
            text: contentText ?? message.text?.body ?? '',
            meta_message_id: message.id,
          },
    isFirstInboundMessage,
  })
  const flowConsumed = flowResult.consumed

  // Fire any automations that react to this webhook event. All dispatches
  // run here (not earlier) so the contact, conversation, and inbound
  // message all exist before any step — including send_message — runs.
  // Fire-and-forget: a slow or failing automation must not block the
  // webhook's 200 OK response to Meta.
  const inboundText = contentText ?? message.text?.body ?? ''
  const automationTriggers: (
    | 'new_contact_created'
    | 'first_inbound_message'
    | 'new_message_received'
    | 'keyword_match'
  )[] = []
  // Content-level triggers are suppressed when a flow consumed the
  // message — see the comment block above.
  if (!flowConsumed) {
    automationTriggers.push('new_message_received', 'keyword_match')
  }
  // new_contact_created fires only when the webhook just auto-created the
  // contact row. first_inbound_message fires whenever this is the contact's
  // first-ever customer-sent message — a superset that also catches
  // manually-imported contacts sending for the first time. We dispatch both
  // so users can pick whichever semantic they want; an automation that
  // listens to only one trigger runs only when that trigger matches.
  if (contactOutcome.wasCreated) automationTriggers.unshift('new_contact_created')
  if (isFirstInboundMessage) automationTriggers.unshift('first_inbound_message')
  for (const triggerType of automationTriggers) {
    runAutomationsForTrigger({
      userId,
      triggerType,
      contactId: contactRecord.id,
      context: {
        message_text: inboundText,
        conversation_id: conversation.id,
      },
    }).catch((err) => console.error('[automations] dispatch failed:', err))
  }
}

async function parseMessageContent(
  message: WhatsAppMessage,
  accessToken: string,
  mediaProvider?: { getMediaUrl: (mediaId: string) => Promise<unknown> } | null,
): Promise<{
  contentText: string | null
  mediaUrl: string | null
  mediaType: string | null
  /**
   * For interactive button / list replies: the stable id of the tapped
   * option (whatever we put on the button when sending). Used by the
   * Flows engine to advance the per-contact run; persisted to
   * `messages.interactive_reply_id` so the inbox bubble can render the
   * tap with the right affordance. Null for everything else.
   */
  interactiveReplyId: string | null
}> {
  // Verify the media id resolves (so the inbox proxy URL is only set
  // when the bytes are actually fetchable), then build the proxy URL.
  // Uses the account's provider when available (so BSP media works),
  // falling back to a direct Meta call with the access token.
  const verifyAndBuildUrl = async (
    mediaId: string
  ): Promise<string | null> => {
    try {
      if (mediaProvider) {
        await mediaProvider.getMediaUrl(mediaId)
      } else {
        await getMediaUrl({ mediaId, accessToken })
      }
      return `/api/whatsapp/media/${mediaId}`
    } catch (error) {
      console.error(
        `Failed to verify media ${mediaId}:`,
        error instanceof Error ? error.message : error
      )
      return null
    }
  }

  // Default shape — each case overrides only the fields it cares about.
  // Keeps the new `interactiveReplyId` field DRY across every return site.
  const empty = {
    contentText: null,
    mediaUrl: null,
    mediaType: null,
    interactiveReplyId: null,
  }

  switch (message.type) {
    case 'text':
      return { ...empty, contentText: message.text?.body || null }

    case 'image':
      if (message.image?.id) {
        return {
          ...empty,
          contentText: message.image.caption || null,
          mediaUrl: await verifyAndBuildUrl(message.image.id),
          mediaType: message.image.mime_type,
        }
      }
      return empty

    case 'video':
      if (message.video?.id) {
        return {
          ...empty,
          contentText: message.video.caption || null,
          mediaUrl: await verifyAndBuildUrl(message.video.id),
          mediaType: message.video.mime_type,
        }
      }
      return empty

    case 'document':
      if (message.document?.id) {
        return {
          ...empty,
          contentText:
            message.document.caption || message.document.filename || null,
          mediaUrl: await verifyAndBuildUrl(message.document.id),
          mediaType: message.document.mime_type,
        }
      }
      return empty

    case 'audio':
      if (message.audio?.id) {
        return {
          ...empty,
          mediaUrl: await verifyAndBuildUrl(message.audio.id),
          mediaType: message.audio.mime_type,
        }
      }
      return empty

    case 'sticker':
      // Stickers are images under the hood. Treat them as such so the
      // MessageBubble renders the <img>. The caller maps the DB
      // content_type to 'image' for the CHECK constraint.
      if (message.sticker?.id) {
        return {
          ...empty,
          mediaUrl: await verifyAndBuildUrl(message.sticker.id),
          mediaType: message.sticker.mime_type,
        }
      }
      return empty

    case 'location':
      if (message.location) {
        const loc = message.location
        const locationText = [loc.name, loc.address, `${loc.latitude},${loc.longitude}`]
          .filter(Boolean)
          .join(' - ')
        return { ...empty, contentText: locationText }
      }
      return empty

    case 'reaction':
      return { ...empty, contentText: message.reaction?.emoji || null }

    case 'interactive': {
      // The customer tapped a reply button or a list row on a message
      // we previously sent. Meta delivers `interactive.button_reply` for
      // 3-button messages and `interactive.list_reply` for list messages.
      // Use the human-readable title as contentText so the inbox bubble
      // renders the tap legibly ("Existing customer"), and stash the
      // stable id separately so the Flows engine can route on it.
      const reply =
        message.interactive?.button_reply ?? message.interactive?.list_reply
      if (reply?.id) {
        return {
          ...empty,
          contentText: reply.title || reply.id,
          interactiveReplyId: reply.id,
        }
      }
      return { ...empty, contentText: '[Interactive reply]' }
    }

    default:
      return {
        ...empty,
        contentText: `[Unsupported message type: ${message.type}]`,
      }
  }
}

