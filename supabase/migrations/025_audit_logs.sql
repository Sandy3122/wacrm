-- ============================================================
-- Sprint 8 — Reliability, Security, GA Readiness
-- 025_audit_logs.sql
--
-- Workspace-scoped audit trail for security-sensitive actions:
-- connection changes, credential rotation, role/permission changes,
-- billing changes. Append-only; visible to workspace admins/owners.
--
-- Idempotent.
-- ============================================================

SET search_path TO public, extensions;

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  metadata JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_workspace
  ON audit_logs(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org
  ON audit_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action
  ON audit_logs(action);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Workspace members can view audit logs" ON audit_logs;
CREATE POLICY "Workspace members can view audit logs" ON audit_logs
  FOR SELECT USING (workspace_id IN (SELECT public.user_workspace_ids()));
DROP POLICY IF EXISTS "Service role writes audit logs" ON audit_logs;
CREATE POLICY "Service role writes audit logs" ON audit_logs
  FOR INSERT WITH CHECK (true);
