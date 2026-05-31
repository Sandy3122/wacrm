-- ============================================================
-- Sprint 2 — WhatsApp Account Refactor
-- 019_whatsapp_conversations_messages.sql
--
-- Rather than fork parallel whatsapp_conversations / whatsapp_messages
-- tables (which would split the inbox in two), we attach the existing
-- conversations + messages to a whatsapp_account via FK. This keeps the
-- working inbox intact while moving routing off user_id onto
-- whatsapp_account_id.
--
-- Idempotent.
-- ============================================================

SET search_path TO public, extensions;

-- conversations: which WhatsApp account this thread belongs to + the
-- customer's wa_id for fast provider lookups.
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS whatsapp_account_id UUID REFERENCES whatsapp_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS customer_wa_id TEXT;
CREATE INDEX IF NOT EXISTS idx_conversations_whatsapp_account_id
  ON conversations(whatsapp_account_id);

-- messages: account linkage + provider identifiers for dedupe across
-- BSP/Meta. provider_message_id is the canonical external id (Meta's
-- wamid or a BSP id); we keep the existing message_id column for
-- backward compat but new code writes provider_message_id too.
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS whatsapp_account_id UUID REFERENCES whatsapp_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS provider_message_id TEXT,
  ADD COLUMN IF NOT EXISTS provider TEXT;
CREATE INDEX IF NOT EXISTS idx_messages_whatsapp_account_id
  ON messages(whatsapp_account_id);

-- Dedupe provider deliveries: a provider message id is globally unique.
CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_provider_message_id_unique
  ON messages (provider_message_id)
  WHERE provider_message_id IS NOT NULL;
