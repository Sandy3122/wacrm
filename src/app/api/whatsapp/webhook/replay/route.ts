import { NextResponse } from 'next/server'
import {
  fetchReplayableEvents,
  incrementAttempts,
  markEventStatus,
} from '@/lib/whatsapp/webhook-ingest'
import { processWebhook } from '@/app/api/whatsapp/webhook/route'

/**
 * POST /api/whatsapp/webhook/replay
 *
 * Drains failed raw_webhook_events that are due for retry and re-runs
 * them through the pipeline. Protected by AUTOMATION_CRON_SECRET (same
 * shared secret the other cron endpoints use) so it can be triggered by
 * a scheduler or an operator.
 *
 * Body (optional): { limit?: number }
 */
function authorized(request: Request): boolean {
  const secret = process.env.AUTOMATION_CRON_SECRET
  // If no secret is configured, only allow same-origin/manual calls in
  // dev. In production a secret MUST be set to enable replay.
  if (!secret) return process.env.NODE_ENV !== 'production'
  const header =
    request.headers.get('authorization') ?? request.headers.get('x-cron-secret')
  if (!header) return false
  const token = header.startsWith('Bearer ') ? header.slice(7) : header
  return token === secret
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const limit = Math.min(Number(body?.limit) || 50, 200)

  const events = await fetchReplayableEvents(limit)
  let processed = 0
  let failed = 0

  for (const event of events) {
    await incrementAttempts(event.id)
    try {
      const payload = event.payload as { field?: string; value?: Record<string, unknown> }
      // Stored payload is a single change ({ field, value }); rewrap into
      // the entry/changes envelope processWebhook expects.
      if (payload?.value) {
        await processWebhook({
          entry: [
            {
              id: '',
              changes: [
                {
                  value: payload.value as never,
                  field: payload.field ?? 'messages',
                },
              ],
            },
          ],
        })
      } else {
        // Whole-body payload — pass through directly.
        await processWebhook(event.payload as { entry?: never[] })
      }
      await markEventStatus(event.id, 'processed')
      processed += 1
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      await markEventStatus(event.id, 'failed', { error: message })
      failed += 1
    }
  }

  return NextResponse.json({
    success: true,
    candidates: events.length,
    processed,
    failed,
  })
}

export async function GET(request: Request) {
  // Allow GET for simple cron pingers that can't POST.
  return POST(request)
}
