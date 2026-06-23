import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  sanitizePhoneForMeta,
  isValidE164,
  phoneVariants,
  isRecipientNotAllowedError,
} from '@/lib/whatsapp/phone-utils'
import {
  checkRateLimit,
  rateLimitResponse,
  RATE_LIMITS,
} from '@/lib/rate-limit'
import { getRequestWorkspace } from '@/lib/auth/request-context'
import { checkUsageLimit, recordUsage } from '@/lib/billing/usage'
import { resolveOutbound } from '@/lib/whatsapp/outbound'
import {
  pauseActiveFlowRunsForContact,
  resolveBotPauseSettings,
  pauseConversationBot,
} from '@/lib/whatsapp/pause-flows'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Per-user rate limit. Bucket key is scoped to this route so
    // `/broadcast` has an independent budget.
    const limit = checkRateLimit(`send:${user.id}`, RATE_LIMITS.send)
    if (!limit.success) {
      return rateLimitResponse(limit)
    }

    // Plan usage enforcement (Sprint 7). Resolves the active workspace
    // and blocks the send if the monthly message limit is reached.
    // Fails open on any internal error so a billing-table hiccup never
    // takes down messaging.
    const ws = await getRequestWorkspace()
    if (ws) {
      const usage = await checkUsageLimit({
        workspaceId: ws.workspaceId,
        organizationId: ws.organizationId,
        metric: 'messages_sent',
      })
      if (!usage.allowed) {
        return NextResponse.json(
          { error: usage.reason ?? 'Message limit reached', limit: usage.limit, used: usage.used },
          { status: 402 },
        )
      }
    }

    const body = await request.json()
    const {
      conversation_id,
      message_type,
      content_text,
      media_url,
      template_name,
      template_params,
      reply_to_message_id,
    } = body

    if (!conversation_id || !message_type) {
      return NextResponse.json(
        { error: 'conversation_id and message_type are required' },
        { status: 400 }
      )
    }

    if (message_type === 'text' && !content_text) {
      return NextResponse.json(
        { error: 'content_text is required for text messages' },
        { status: 400 }
      )
    }

    if (message_type === 'template' && !template_name) {
      return NextResponse.json(
        { error: 'template_name is required for template messages' },
        { status: 400 }
      )
    }

    // Fetch conversation and contact
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*, contact:contacts(*)')
      .eq('id', conversation_id)
      .eq('user_id', user.id)
      .single()

    if (convError || !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    const contact = conversation.contact
    if (!contact?.phone) {
      return NextResponse.json(
        { error: 'Contact phone number not found' },
        { status: 400 }
      )
    }

    // Sanitize and validate phone
    const sanitizedPhone = sanitizePhoneForMeta(contact.phone)
    if (!isValidE164(sanitizedPhone)) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      )
    }

    // Resolve the outbound context — prefers the conversation's bound
    // WhatsApp account (so multi-account workspaces reply through the
    // right number / provider), then the workspace, then the user's
    // account, then the legacy whatsapp_config row.
    let outbound
    try {
      outbound = await resolveOutbound({
        accountId: conversation.whatsapp_account_id ?? null,
        workspaceId: ws?.workspaceId ?? null,
        userId: user.id,
      })
    } catch (err) {
      return NextResponse.json(
        {
          error:
            err instanceof Error
              ? err.message
              : 'WhatsApp not configured. Please set up your WhatsApp integration first.',
        },
        { status: 400 }
      )
    }

    // Resolve the reply target (if any) to its Meta message_id, which is
    // what `context.message_id` on the outgoing Meta payload needs. The
    // parent must belong to this same conversation — otherwise a caller
    // could quote messages they can't see by guessing UUIDs.
    let contextMessageId: string | undefined
    if (reply_to_message_id) {
      const { data: parent, error: parentError } = await supabase
        .from('messages')
        .select('message_id, conversation_id')
        .eq('id', reply_to_message_id)
        .eq('conversation_id', conversation_id)
        .maybeSingle()

      if (parentError || !parent) {
        return NextResponse.json(
          { error: 'reply_to_message_id not found in this conversation' },
          { status: 400 }
        )
      }
      if (!parent.message_id) {
        // Parent never reached Meta (still in 'sending' or 'failed') — we
        // can't quote it on WhatsApp. Send without context rather than
        // dropping the message entirely.
        console.warn(
          '[whatsapp/send] reply target has no Meta message_id; sending without context'
        )
      } else {
        contextMessageId = parent.message_id
      }
    }

    // Send via Meta API — retry with phone-number variants if Meta rejects
    // with "recipient not in allowed list" (common in sandbox / when a
    // number was registered with/without a trunk 0). If an alternate
    // format succeeds, we persist it back to the contact row so the
    // next send goes through on the first attempt.
    let waMessageId = ''
    let workingPhone = sanitizedPhone

    const attempt = async (phone: string): Promise<string> => {
      if (message_type === 'template') {
        const result = await outbound.provider.sendTemplate({
          to: phone,
          templateName: template_name,
          params: template_params || [],
          contextMessageId,
        })
        return result.messageId
      }
      const result = await outbound.provider.sendText({
        to: phone,
        text: content_text,
        contextMessageId,
      })
      return result.messageId
    }

    try {
      const variants = phoneVariants(sanitizedPhone)
      let lastError: unknown = null

      for (const variant of variants) {
        try {
          waMessageId = await attempt(variant)
          workingPhone = variant
          lastError = null
          break
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          // Only retry when the failure is specifically that the
          // recipient isn't in Meta's allowed list. Any other error
          // (bad token, invalid template, etc.) bubbles up immediately.
          if (!isRecipientNotAllowedError(message)) {
            throw err
          }
          lastError = err
          console.warn(`[whatsapp/send] variant "${variant}" rejected by Meta, trying next…`)
        }
      }

      if (lastError) throw lastError
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown Meta API error'
      console.error('Meta API send failed for all variants:', message)
      return NextResponse.json(
        { error: `Meta API error: ${message}` },
        { status: 502 }
      )
    }

    // If a non-original variant succeeded, update the contact so future
    // sends go straight through. sanitizePhoneForMeta on workingPhone
    // will yield workingPhone itself, so re-storing preserves it.
    if (workingPhone !== sanitizedPhone) {
      console.log(
        `[whatsapp/send] Auto-corrected contact phone: ${sanitizedPhone} → ${workingPhone}`
      )
      await supabase
        .from('contacts')
        .update({ phone: workingPhone })
        .eq('id', contact.id)
    }

    // Insert message into DB — field names MUST match the messages schema
    // (see supabase/migrations/001_initial_schema.sql):
    //   conversation_id, sender_type, content_type, content_text,
    //   media_url, template_name, message_id, status, created_at
    const { data: messageRecord, error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id,
        whatsapp_account_id: outbound.accountId,
        provider_message_id: waMessageId,
        provider: outbound.providerType,
        sender_type: 'agent',
        content_type: message_type,
        content_text: content_text || null,
        media_url: media_url || null,
        template_name: template_name || null,
        message_id: waMessageId,
        status: 'sent',
        reply_to_message_id: reply_to_message_id || null,
        message_source: message_type === 'template' ? 'template' : 'api',
        direction: 'outbound',
      })
      .select()
      .single()

    if (msgError) {
      console.error('Error inserting sent message:', msgError)
      return NextResponse.json(
        { error: `Message sent to Meta but failed to save to DB: ${msgError.message}` },
        { status: 500 }
      )
    }

    // Update conversation
    await supabase
      .from('conversations')
      .update({
        last_message_text: content_text || `[${message_type}]`,
        last_message_at: new Date().toISOString(),
        last_message_source: 'api',
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversation_id)

    // Human takeover: the agent stepping in is the strongest "yield,
    // human is here" signal. Pause two things, consistent with the
    // Business-App echo path (src/lib/whatsapp/webhook-echo.ts):
    //
    //   1. Active Flow runs for this contact — paused (not ended) to
    //      preserve diagnostic state; the 24h stale-run sweep resolves
    //      them if the agent never returns.
    //   2. The conversation bot — so the NEXT inbound customer message
    //      doesn't re-fire keyword/message automations while the human
    //      is handling the thread. Governed by the account's
    //      pause_bot_on_app_reply toggle; the webhook auto-resumes via
    //      resumeBotIfPauseExpired once the window expires.
    //
    // Best-effort — the message already landed at Meta, so a bookkeeping
    // miss here must not fail the response.
    try {
      await pauseActiveFlowRunsForContact(user.id, contact.id, 'agent_replied')
      const pause = await resolveBotPauseSettings({
        accountId: outbound.accountId,
        userId: user.id,
      })
      if (pause.pauseEnabled) {
        await pauseConversationBot(conversation_id, pause.hours)
      }
    } catch (err) {
      console.error(
        '[flows] pause-on-agent-send threw:',
        err instanceof Error ? err.message : err,
      )
    }

    // Record usage for plan metering (best-effort).
    if (ws) {
      void recordUsage({
        workspaceId: ws.workspaceId,
        organizationId: ws.organizationId,
        metric: 'messages_sent',
      })
    }

    return NextResponse.json({
      success: true,
      message_id: messageRecord.id,
      whatsapp_message_id: waMessageId,
    })
  } catch (error) {
    console.error('Error in WhatsApp send POST:', error)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}
