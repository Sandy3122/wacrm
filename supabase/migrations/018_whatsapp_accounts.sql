-- ============================================================
-- Sprint 2 — WhatsApp Account Refactor (Account-per-Workspace)
-- 018_whatsapp_accounts.sql
--
-- Replaces the single whatsapp_config-per-user model with
-- whatsapp_accounts scoped to a workspace. The legacy whatsapp_config
-- table is kept; migration 020 copies rows across. New code resolves
-- through whatsapp_accounts.
--
-- Idempotent.
-- ============================================================

SET search_path TO public, extensions;

CREATE TABLE IF NOT EXISTS whatsapp_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  -- Legacy linkage: the user who originally owned the config. Kept so
  -- service-role webhook/engine paths that still key off user_id keep
  -- working through the transition.
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  name TEXT NOT NULL DEFAULT 'WhatsApp Account',

  -- How we talk to WhatsApp for this account.
  connection_type TEXT NOT NULL DEFAULT 'legacy_cloud_api'
    CHECK (connection_type IN ('legacy_cloud_api', 'coexistence', 'bsp_adapter')),
  -- Which backend transport / vendor.
  provider_type TEXT NOT NULL DEFAULT 'meta'
    CHECK (provider_type IN ('meta', '360dialog', 'twilio', 'messagebird', 'gupshup', 'custom')),

  -- Meta / phone identifiers.
  phone_number_id TEXT,
  waba_id TEXT,
  business_id TEXT,
  display_phone_number TEXT,

  -- Encrypted credentials (AES-256-GCM via src/lib/whatsapp/encryption).
  access_token TEXT,           -- Meta / generic bearer token (encrypted)
  verify_token TEXT,           -- webhook verify token (encrypted)
  provider_api_key TEXT,       -- BSP API key (encrypted)
  provider_api_secret TEXT,    -- BSP API secret (encrypted)
  provider_config JSONB,       -- non-secret provider settings (base URL, channel id…)

  -- Status / sync.
  status TEXT NOT NULL DEFAULT 'disconnected'
    CHECK (status IN ('connected', 'disconnected', 'error')),
  webhook_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (webhook_status IN ('pending', 'verified', 'error')),
  history_sync_status TEXT DEFAULT 'pending'
    CHECK (history_sync_status IN ('pending', 'complete', 'failed')),

  -- Coexistence / bot behaviour (mirrors the legacy config columns).
  app_sync_enabled BOOLEAN NOT NULL DEFAULT true,
  pause_bot_on_app_reply BOOLEAN NOT NULL DEFAULT true,
  bot_pause_duration_hours INTEGER NOT NULL DEFAULT 24,
  automation_outside_hours BOOLEAN NOT NULL DEFAULT false,
  fallback_message TEXT,

  connected_at TIMESTAMPTZ,
  coexistence_onboarded_at TIMESTAMPTZ,
  last_webhook_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- A phone_number_id can only be claimed once across the whole instance
-- (the webhook resolves config by phone_number_id and must be
-- unambiguous). NULLs allowed for BSP accounts that have no Meta phone id.
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_accounts_phone_number_id
  ON whatsapp_accounts (phone_number_id)
  WHERE phone_number_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_whatsapp_accounts_workspace_id
  ON whatsapp_accounts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_accounts_user_id
  ON whatsapp_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_accounts_provider
  ON whatsapp_accounts(provider_type);

ALTER TABLE whatsapp_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Workspace members can view accounts" ON whatsapp_accounts;
DROP POLICY IF EXISTS "Workspace members can manage accounts" ON whatsapp_accounts;
-- Read: any workspace member. Write: owner (legacy user_id) or workspace member.
CREATE POLICY "Workspace members can view accounts" ON whatsapp_accounts
  FOR SELECT USING (
    auth.uid() = user_id
    OR workspace_id IN (SELECT public.user_workspace_ids())
  );
CREATE POLICY "Workspace members can manage accounts" ON whatsapp_accounts
  FOR ALL USING (
    auth.uid() = user_id
    OR workspace_id IN (SELECT public.user_workspace_ids())
  );

DROP TRIGGER IF EXISTS set_updated_at ON whatsapp_accounts;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON whatsapp_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
