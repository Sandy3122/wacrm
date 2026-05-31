-- ============================================================
-- Sprint 7 — Billing, Usage, Limits, RBAC
-- 024_plan_limits.sql
--
-- Per-plan limit definitions. Enforcement middleware reads these +
-- usage_logs to gate workspace actions. -1 means unlimited.
--
-- Idempotent — upserts the canonical plan rows.
-- ============================================================

SET search_path TO public, extensions;

CREATE TABLE IF NOT EXISTS plan_limits (
  plan TEXT PRIMARY KEY
    CHECK (plan IN ('free', 'starter', 'pro', 'business', 'enterprise')),
  max_whatsapp_accounts INTEGER NOT NULL DEFAULT 1,
  max_workspaces INTEGER NOT NULL DEFAULT 1,
  max_team_members INTEGER NOT NULL DEFAULT 1,
  max_messages_per_month INTEGER NOT NULL DEFAULT 1000,
  max_automation_runs_per_month INTEGER NOT NULL DEFAULT 500,
  max_broadcasts_per_month INTEGER NOT NULL DEFAULT 5,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE plan_limits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone authenticated can read plan limits" ON plan_limits;
CREATE POLICY "Anyone authenticated can read plan limits" ON plan_limits
  FOR SELECT USING (auth.role() = 'authenticated');

-- Canonical plan matrix. -1 = unlimited.
INSERT INTO plan_limits (
  plan, max_whatsapp_accounts, max_workspaces, max_team_members,
  max_messages_per_month, max_automation_runs_per_month, max_broadcasts_per_month
) VALUES
  ('free',       1,  1,  2,    1000,   500,   5),
  ('starter',    2,  2,  5,   10000,  5000,  25),
  ('pro',        5,  5, 20,  100000, 50000, 200),
  ('business',  20, 20, 100, 1000000, 500000, 2000),
  ('enterprise', -1, -1, -1,     -1,    -1,   -1)
ON CONFLICT (plan) DO UPDATE SET
  max_whatsapp_accounts = EXCLUDED.max_whatsapp_accounts,
  max_workspaces = EXCLUDED.max_workspaces,
  max_team_members = EXCLUDED.max_team_members,
  max_messages_per_month = EXCLUDED.max_messages_per_month,
  max_automation_runs_per_month = EXCLUDED.max_automation_runs_per_month,
  max_broadcasts_per_month = EXCLUDED.max_broadcasts_per_month,
  updated_at = NOW();
