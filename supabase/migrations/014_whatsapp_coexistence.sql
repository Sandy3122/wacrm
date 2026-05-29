-- WhatsApp Coexistence: extend existing tables for connection modes,
-- bot pause, message source tracking, and webhook debugging.

-- ============================================================
-- WHATSAPP_CONFIG
-- ============================================================
ALTER TABLE whatsapp_config
  ADD COLUMN IF NOT EXISTS connection_type TEXT NOT NULL DEFAULT 'legacy'
    CHECK (connection_type IN ('legacy', 'coexistence')),
  ADD COLUMN IF NOT EXISTS business_id TEXT,
  ADD COLUMN IF NOT EXISTS display_phone_number TEXT,
  ADD COLUMN IF NOT EXISTS webhook_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (webhook_status IN ('pending', 'verified', 'error')),
  ADD COLUMN IF NOT EXISTS app_sync_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS pause_bot_on_app_reply BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS bot_pause_duration_hours INTEGER NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS automation_outside_hours BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fallback_message TEXT,
  ADD COLUMN IF NOT EXISTS coexistence_onboarded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS history_sync_status TEXT DEFAULT 'pending'
    CHECK (history_sync_status IN ('pending', 'complete', 'failed')),
  ADD COLUMN IF NOT EXISTS last_webhook_at TIMESTAMPTZ;

-- ============================================================
-- CONVERSATIONS
-- ============================================================
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS bot_status TEXT NOT NULL DEFAULT 'active'
    CHECK (bot_status IN ('active', 'paused', 'closed')),
  ADD COLUMN IF NOT EXISTS bot_paused_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_message_source TEXT
    CHECK (last_message_source IS NULL OR last_message_source IN ('customer', 'api', 'business_app'));

-- ============================================================
-- MESSAGES
-- ============================================================
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS message_source TEXT
    CHECK (message_source IS NULL OR message_source IN ('customer', 'api', 'business_app', 'template')),
  ADD COLUMN IF NOT EXISTS direction TEXT
    CHECK (direction IS NULL OR direction IN ('inbound', 'outbound')),
  ADD COLUMN IF NOT EXISTS raw_payload JSONB;

-- Dedupe Meta webhook retries and echo vs API sends
CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_message_id_unique
  ON messages (message_id)
  WHERE message_id IS NOT NULL;

-- ============================================================
-- WEBHOOK_EVENTS (debug / audit)
-- ============================================================
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number_id TEXT,
  field TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_user_id ON webhook_events(user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at DESC);

ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own webhook events" ON webhook_events;
CREATE POLICY "Users can view own webhook events" ON webhook_events
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Service role can insert webhook events" ON webhook_events;
CREATE POLICY "Service role can insert webhook events" ON webhook_events
  FOR INSERT WITH CHECK (true);
