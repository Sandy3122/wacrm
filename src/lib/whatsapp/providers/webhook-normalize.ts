/**
 * Provider webhook normalization (Sprint 6).
 *
 * BSPs deliver webhooks in their own shapes. We normalize them into the
 * Meta Cloud API `{ entry: [{ changes: [{ value, field }] }] }` shape so
 * the single processWebhook pipeline handles every provider.
 *
 * 360dialog already mirrors Meta's shape almost exactly, so its
 * "normalization" is largely a pass-through. Others (Twilio,
 * MessageBird) need real mapping — stubbed here with the structure to
 * extend.
 */

export interface NormalizedWebhook {
  entry?: Array<{
    id?: string
    changes: Array<{ value: Record<string, unknown>; field: string }>
  }>
}

export interface SignatureCheck {
  /** Header name carrying the signature, if the provider signs. */
  header?: string
  /** True when this provider signs webhooks (so the route should verify). */
  signs: boolean
}

export function providerSignature(providerType: string): SignatureCheck {
  switch (providerType) {
    case '360dialog':
      // 360dialog forwards Meta's x-hub-signature-256 when configured.
      return { signs: true, header: 'x-hub-signature-256' }
    case 'gupshup':
      return { signs: false }
    default:
      return { signs: false }
  }
}

/**
 * Normalize a raw provider webhook body into the Meta-shaped envelope.
 * `phoneNumberId` is injected when the provider doesn't include Meta's
 * metadata (so account resolution still works).
 */
export function normalizeProviderWebhook(
  providerType: string,
  body: unknown,
  fallbackPhoneNumberId?: string | null,
): NormalizedWebhook {
  switch (providerType) {
    case '360dialog':
      // Already Meta-shaped. Pass through, ensuring metadata exists.
      return ensureMetadata(body as NormalizedWebhook, fallbackPhoneNumberId)

    case 'gupshup':
      return normalizeGupshup(body, fallbackPhoneNumberId)

    default:
      // Custom / unknown: assume Meta shape, best-effort.
      return ensureMetadata(body as NormalizedWebhook, fallbackPhoneNumberId)
  }
}

function ensureMetadata(
  body: NormalizedWebhook,
  fallbackPhoneNumberId?: string | null,
): NormalizedWebhook {
  if (!body?.entry || !fallbackPhoneNumberId) return body ?? {}
  for (const entry of body.entry) {
    for (const change of entry.changes ?? []) {
      const value = change.value as { metadata?: { phone_number_id?: string } }
      if (!value.metadata) {
        value.metadata = { phone_number_id: fallbackPhoneNumberId }
      } else if (!value.metadata.phone_number_id) {
        value.metadata.phone_number_id = fallbackPhoneNumberId
      }
    }
  }
  return body
}

interface GupshupPayload {
  type?: string
  payload?: {
    type?: string
    payload?: { text?: string; id?: string }
    sender?: { phone?: string; name?: string }
    id?: string
  }
}

/**
 * Minimal Gupshup → Meta normalization for inbound text messages.
 * Extend per message type as needed.
 */
function normalizeGupshup(
  body: unknown,
  phoneNumberId?: string | null,
): NormalizedWebhook {
  const g = body as GupshupPayload
  const inner = g.payload
  if (!inner || g.type !== 'message') return {}

  const sender = inner.sender?.phone ?? ''
  const text = inner.payload?.text ?? ''
  const messageId = inner.id ?? inner.payload?.id ?? `gupshup-${Date.now()}`

  return {
    entry: [
      {
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: { phone_number_id: phoneNumberId ?? '' },
              contacts: [
                { profile: { name: inner.sender?.name ?? sender }, wa_id: sender },
              ],
              messages: [
                {
                  id: messageId,
                  from: sender,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  type: 'text',
                  text: { body: text },
                },
              ],
            },
          },
        ],
      },
    ],
  }
}
