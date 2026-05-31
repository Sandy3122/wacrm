-- ============================================================
-- Sprint 7 — Billing, Usage, Limits, RBAC
-- 023_usage_logs.sql
--
-- Append-only usage counters, scoped to workspace. Drives plan
-- enforcement and the usage dashboard. We store one row per metric
-- event (cheap to write, aggregated on read) plus a helper to increment
-- a daily rollup.
--
-- Idempotent.
-- ============================================================

SET search_path TO public, extensions;

CREATE TABLE IF NOT EXISTS usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  metric TEXT NOT NULL
    CHECK (metric IN ('messages_sent', 'automation_runs', 'broadcast_sent', 'flow_runs')),
  quantity INTEGER NOT NULL DEFAULT 1,
  -- Day bucket (UTC) for fast period aggregation.
  usage_date DATE NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc')::date,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_logs_ws_metric_date
  ON usage_logs(workspace_id, metric, usage_date);
CREATE INDEX IF NOT EXISTS idx_usage_logs_org_metric_date
  ON usage_logs(organization_id, metric, usage_date);

ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Workspace members can view usage" ON usage_logs;
CREATE POLICY "Workspace members can view usage" ON usage_logs
  FOR SELECT USING (workspace_id IN (SELECT public.user_workspace_ids()));
DROP POLICY IF EXISTS "Service role records usage" ON usage_logs;
CREATE POLICY "Service role records usage" ON usage_logs
  FOR INSERT WITH CHECK (true);

-- ------------------------------------------------------------
-- record_usage(): SECURITY DEFINER helper to append a usage row.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_usage(
  p_workspace_id UUID,
  p_organization_id UUID,
  p_metric TEXT,
  p_quantity INTEGER DEFAULT 1
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO usage_logs (workspace_id, organization_id, metric, quantity)
  VALUES (p_workspace_id, p_organization_id, p_metric, p_quantity);
END;
$$;
