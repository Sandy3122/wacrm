import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'

/**
 * Durable webhook ingestion (Sprint 4).
 *
 * The pipeline is: ingest (store raw + dedupe) → normalize → dispatch.
 * This module owns the ingest + status bookkeeping; the existing
 * webhook handler owns normalize + dispatch.
 *
 * Storing raw-first means a crash mid-processing leaves a replayable
 * record rather than a lost message, and dedupe at ingest stops
 * provider retries from double-inserting.
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

export type RawEventStatus =
  | 'pending'
  | 'processing'
  | 'processed'
  | 'failed'
  | 'skipped'

export interface IngestArgs {
  provider?: string
  phoneNumberId?: string | null
  whatsappAccountId?: string | null
  workspaceId?: string | null
  dedupeKey?: string | null
  payload: unknown
}

export interface IngestedEvent {
  id: string
  /** True when this is a brand-new event; false when deduped (already seen). */
  isNew: boolean
}

/** Stable dedupe key from an arbitrary payload (sha256 of JSON). */
export function hashPayload(payload: unknown): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(payload))
    .digest('hex')
}

/**
 * Store a raw webhook event. Returns isNew=false when a row with the
 * same dedupe_key already exists (provider retry / duplicate delivery).
 */
export async function ingestRawEvent(args: IngestArgs): Promise<IngestedEvent> {
  const db = admin()
  const dedupeKey = args.dedupeKey ?? hashPayload(args.payload)

  const { data, error } = await db
    .from('raw_webhook_events')
    .insert({
      provider: args.provider ?? 'meta',
      phone_number_id: args.phoneNumberId ?? null,
      whatsapp_account_id: args.whatsappAccountId ?? null,
      workspace_id: args.workspaceId ?? null,
      dedupe_key: dedupeKey,
      status: 'pending',
      payload: args.payload,
    })
    .select('id')
    .single()

  if (error) {
    // 23505 = unique violation on dedupe_key → already ingested.
    if ((error as { code?: string }).code === '23505') {
      const { data: existing } = await db
        .from('raw_webhook_events')
        .select('id')
        .eq('dedupe_key', dedupeKey)
        .maybeSingle()
      return { id: existing?.id ?? '', isNew: false }
    }
    // Unexpected error — surface a synthetic id so the caller can still
    // attempt processing; we don't want to drop the event.
    console.error('[webhook-ingest] insert failed:', error.message)
    return { id: '', isNew: true }
  }

  return { id: data.id, isNew: true }
}

export async function markEventStatus(
  eventId: string,
  status: RawEventStatus,
  opts: { error?: string; accountId?: string; workspaceId?: string } = {},
): Promise<void> {
  if (!eventId) return
  const update: Record<string, unknown> = { status }
  if (status === 'processed') update.processed_at = new Date().toISOString()
  if (opts.error) update.last_error = opts.error
  if (opts.accountId) update.whatsapp_account_id = opts.accountId
  if (opts.workspaceId) update.workspace_id = opts.workspaceId
  if (status === 'failed') {
    // Exponential-ish backoff scheduled retry (capped). The cron/replay
    // endpoint picks up rows whose next_retry_at has passed.
    update.next_retry_at = new Date(Date.now() + 5 * 60 * 1000).toISOString()
  }
  await admin().from('raw_webhook_events').update(update).eq('id', eventId)
}

export async function incrementAttempts(eventId: string): Promise<number> {
  if (!eventId) return 0
  const db = admin()
  const { data } = await db
    .from('raw_webhook_events')
    .select('attempts')
    .eq('id', eventId)
    .maybeSingle()
  const attempts = (data?.attempts ?? 0) + 1
  await db
    .from('raw_webhook_events')
    .update({ attempts, status: 'processing' })
    .eq('id', eventId)
  return attempts
}

export interface FailedEventRow {
  id: string
  provider: string
  phone_number_id: string | null
  payload: unknown
  attempts: number
  last_error: string | null
}

/**
 * Fetch failed events that are due for retry (next_retry_at passed),
 * up to `limit`. Used by the replay endpoint/cron.
 */
export async function fetchReplayableEvents(
  limit = 50,
): Promise<FailedEventRow[]> {
  const { data, error } = await admin()
    .from('raw_webhook_events')
    .select('id, provider, phone_number_id, payload, attempts, last_error')
    .eq('status', 'failed')
    .lte('next_retry_at', new Date().toISOString())
    .order('received_at', { ascending: true })
    .limit(limit)
  if (error || !data) return []
  return data as FailedEventRow[]
}
