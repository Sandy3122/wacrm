import { NextResponse } from 'next/server'
import { getAccountById } from '@/lib/whatsapp/accounts'
import {
  normalizeProviderWebhook,
  providerSignature,
} from '@/lib/whatsapp/providers/webhook-normalize'
import { verifyMetaWebhookSignature } from '@/lib/whatsapp/webhook-signature'
import { processWebhook } from '@/app/api/whatsapp/webhook/route'
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit'

/**
 * POST /api/whatsapp/webhook/:provider/:accountId
 *
 * Per-account BSP webhook ingress (Sprint 4 + 6). Normalizes the
 * provider payload into the Meta-shaped envelope and feeds it through
 * the same durable processWebhook pipeline.
 *
 * GET serves provider webhook verification challenges where applicable.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string; accountId: string }> },
) {
  await params
  const { searchParams } = new URL(request.url)
  const challenge = searchParams.get('hub.challenge')
  // Most BSPs echo the hub challenge like Meta. Return it verbatim.
  if (challenge) {
    return new Response(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })
  }
  return NextResponse.json({ status: 'ok' })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ provider: string; accountId: string }> },
) {
  const { provider, accountId } = await params

  const limit = checkRateLimit(`webhook:${accountId}`, RATE_LIMITS.webhook)
  if (!limit.success) return rateLimitResponse(limit)

  const resolved = await getAccountById(accountId)
  if (!resolved) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  }
  if (resolved.account.provider_type !== provider) {
    return NextResponse.json({ error: 'Provider mismatch' }, { status: 400 })
  }

  const rawBody = await request.text()

  // Signature verification where the provider supports it. 360dialog
  // forwards Meta's HMAC, so we can reuse the Meta verifier.
  const sig = providerSignature(provider)
  if (sig.signs && sig.header) {
    const header = request.headers.get(sig.header)
    if (!verifyMetaWebhookSignature(rawBody, header)) {
      console.warn(`[webhook/${provider}] invalid signature for ${accountId}`)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const normalized = normalizeProviderWebhook(
    provider,
    parsed,
    resolved.account.phone_number_id,
  )

  processWebhook(normalized as Parameters<typeof processWebhook>[0]).catch((err) => {
    console.error(`[webhook/${provider}] processing error:`, err)
  })

  return NextResponse.json({ status: 'received' }, { status: 200 })
}
