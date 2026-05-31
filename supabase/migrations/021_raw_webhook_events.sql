-- ============================================================
-- Sprint 4 — Webhook Ingestion + Normalization Pipeline
-- 021_raw_webhook_events.sql
--
-- Durable, replayable webhook store. Every inbound webhook is written
-- here RAW before any processing, then normalized and dispatched. A
-- dedupe key prevents duplicate provider deliveries from creating
-- duplicate messages; failed events are visible and replayable.
--
-- Idempotent.
-- ============================================================

SET search_path TO public, extensions;

CREATE TABLE IF NOT EXISTS raw_webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider TEXT NOT NULL DEFAULT 'meta',
  whatsapp_account_id UUID REFERENCES whatsapp_accounts(id) ON DELETE SET NULL,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  -- Routing hint extracted before account resolution.
  phone_number_id TEXT,
  -- Stable per-delivery dedupe key (provider id / hash of payload).
  dedupe_key TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'processed', 'failed', 'skipped')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ
);

-- Dedupe: the same delivery key is stored once. Replays/retries from
-- the provider hit this and are skipped at ingest.
CREATE UNIQUE INDEX IF NOT EXISTS idx_raw_webhook_events_dedupe_key
  ON raw_webhook_events (dedupe_key)
  WHERE dedupe_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_raw_webhook_events_status
  ON raw_webhook_events (status, received_at);
CREATE INDEX IF NOT EXISTS idx_raw_webhook_events_account
  ON raw_webhook_events (whatsapp_account_id);
CREATE INDEX IF NOT EXISTS idx_raw_webhook_events_retry
  ON raw_webhook_events (next_retry_at)
  WHERE status = 'failed';

ALTER TABLE raw_webhook_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Workspace members can view raw webhook events" ON raw_webhook_events;
CREATE POLICY "Workspace members can view raw webhook events" ON raw_webhook_events
  FOR SELECT USING (workspace_id IN (SELECT public.user_workspace_ids()));
-- Inserts/updates happen via the service role (webhook handler).
DROP POLICY IF EXISTS "Service role manages raw webhook events" ON raw_webhook_events;
CREATE POLICY "Service role manages raw webhook events" ON raw_webhook_events
  FOR INSERT WITH CHECK (true);
