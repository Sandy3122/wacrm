-- ============================================================
-- Sprint 2 — WhatsApp Account Refactor
-- 020_migrate_from_legacy_whatsapp_config.sql
--
-- Copies every whatsapp_config row into whatsapp_accounts, resolving
-- the workspace from the owner's default workspace (backfilled in 017).
-- Then backfills conversations.whatsapp_account_id for each user's
-- threads.
--
-- Idempotent — keyed on phone_number_id so re-running won't duplicate.
-- ============================================================

SET search_path TO public, extensions;

-- Coexistence columns on whatsapp_config (also in 028_whatsapp_coexistence.sql;
-- duplicated here so 020 can read them before 028 runs on fresh installs).
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

-- 1) whatsapp_config → whatsapp_accounts
INSERT INTO whatsapp_accounts (
  organization_id, workspace_id, user_id, name,
  connection_type, provider_type,
  phone_number_id, waba_id, business_id, display_phone_number,
  access_token, verify_token,
  status, webhook_status, history_sync_status,
  app_sync_enabled, pause_bot_on_app_reply, bot_pause_duration_hours,
  automation_outside_hours, fallback_message,
  connected_at, coexistence_onboarded_at, last_webhook_at, created_at
)
SELECT
  o.id,
  w.id,
  c.user_id,
  COALESCE(NULLIF(c.display_phone_number, ''), 'WhatsApp Account'),
  CASE
    WHEN c.connection_type = 'coexistence' THEN 'coexistence'
    ELSE 'legacy_cloud_api'
  END,
  'meta',
  c.phone_number_id,
  c.waba_id,
  c.business_id,
  c.display_phone_number,
  c.access_token,
  c.verify_token,
  c.status,
  COALESCE(c.webhook_status, 'pending'),
  COALESCE(c.history_sync_status, 'pending'),
  COALESCE(c.app_sync_enabled, true),
  COALESCE(c.pause_bot_on_app_reply, true),
  COALESCE(c.bot_pause_duration_hours, 24),
  COALESCE(c.automation_outside_hours, false),
  c.fallback_message,
  c.connected_at,
  c.coexistence_onboarded_at,
  c.last_webhook_at,
  c.created_at
FROM whatsapp_config c
JOIN organizations o ON o.owner_id = c.user_id
JOIN workspaces w ON w.organization_id = o.id AND w.is_default = true
WHERE c.phone_number_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM whatsapp_accounts a
    WHERE a.phone_number_id = c.phone_number_id
  );

-- 2) Backfill conversations.whatsapp_account_id from the owning user's
--    (single) migrated account.
UPDATE conversations conv
SET whatsapp_account_id = a.id
FROM whatsapp_accounts a
WHERE a.user_id = conv.user_id
  AND conv.whatsapp_account_id IS NULL;

-- 3) Backfill messages.whatsapp_account_id + provider_message_id from
--    their conversation + legacy message_id.
UPDATE messages m
SET
  whatsapp_account_id = conv.whatsapp_account_id,
  provider = COALESCE(m.provider, 'meta'),
  provider_message_id = COALESCE(m.provider_message_id, m.message_id)
FROM conversations conv
WHERE conv.id = m.conversation_id
  AND conv.whatsapp_account_id IS NOT NULL
  AND m.whatsapp_account_id IS NULL;
