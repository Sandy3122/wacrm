-- ============================================================
-- Sprint 1 — Tenant Foundation
-- 016_workspace_scope_columns.sql
--
-- Adds organization_id + workspace_id to every tenant-scoped table.
-- Columns are NULLable at this stage; migration 017 backfills them,
-- and the RLS policies are widened to accept "owner via user_id OR
-- member via workspace_id" so nothing breaks during the transition.
--
-- Idempotent — safe to run multiple times.
-- ============================================================

SET search_path TO public, extensions;

-- Helper: add scope columns + indexes to a table that has a user_id.
-- Done inline per-table (Postgres has no parametric DDL macro), but
-- all follow the same shape.

-- contacts
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_contacts_workspace_id ON contacts(workspace_id);

-- conversations
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_conversations_workspace_id ON conversations(workspace_id);

-- tags
ALTER TABLE tags
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_tags_workspace_id ON tags(workspace_id);

-- custom_fields
ALTER TABLE custom_fields
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_custom_fields_workspace_id ON custom_fields(workspace_id);

-- contact_notes
ALTER TABLE contact_notes
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_contact_notes_workspace_id ON contact_notes(workspace_id);

-- pipelines
ALTER TABLE pipelines
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_pipelines_workspace_id ON pipelines(workspace_id);

-- deals
ALTER TABLE deals
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_deals_workspace_id ON deals(workspace_id);

-- automations
ALTER TABLE automations
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_automations_workspace_id ON automations(workspace_id);

-- flows
ALTER TABLE flows
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_flows_workspace_id ON flows(workspace_id);

-- broadcasts
ALTER TABLE broadcasts
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_broadcasts_workspace_id ON broadcasts(workspace_id);

-- message_templates
ALTER TABLE message_templates
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_message_templates_workspace_id ON message_templates(workspace_id);

-- ============================================================
-- Widen RLS policies: a row is visible if the user owns it (legacy
-- user_id path) OR the row's workspace is one the user belongs to.
-- This keeps existing single-user installs working while enabling
-- multi-member workspaces.
-- ============================================================

-- contacts
DROP POLICY IF EXISTS "Users can manage own contacts" ON contacts;
CREATE POLICY "Workspace members can manage contacts" ON contacts
  FOR ALL USING (
    auth.uid() = user_id
    OR workspace_id IN (SELECT public.user_workspace_ids())
  );

-- conversations
DROP POLICY IF EXISTS "Users can manage own conversations" ON conversations;
CREATE POLICY "Workspace members can manage conversations" ON conversations
  FOR ALL USING (
    auth.uid() = user_id
    OR workspace_id IN (SELECT public.user_workspace_ids())
  );

-- tags
DROP POLICY IF EXISTS "Users can manage own tags" ON tags;
CREATE POLICY "Workspace members can manage tags" ON tags
  FOR ALL USING (
    auth.uid() = user_id
    OR workspace_id IN (SELECT public.user_workspace_ids())
  );

-- custom_fields
DROP POLICY IF EXISTS "Users can manage own custom fields" ON custom_fields;
CREATE POLICY "Workspace members can manage custom fields" ON custom_fields
  FOR ALL USING (
    auth.uid() = user_id
    OR workspace_id IN (SELECT public.user_workspace_ids())
  );

-- contact_notes
DROP POLICY IF EXISTS "Users can manage own notes" ON contact_notes;
CREATE POLICY "Workspace members can manage notes" ON contact_notes
  FOR ALL USING (
    auth.uid() = user_id
    OR workspace_id IN (SELECT public.user_workspace_ids())
  );

-- pipelines
DROP POLICY IF EXISTS "Users can manage own pipelines" ON pipelines;
CREATE POLICY "Workspace members can manage pipelines" ON pipelines
  FOR ALL USING (
    auth.uid() = user_id
    OR workspace_id IN (SELECT public.user_workspace_ids())
  );

-- deals
DROP POLICY IF EXISTS "Users can manage own deals" ON deals;
CREATE POLICY "Workspace members can manage deals" ON deals
  FOR ALL USING (
    auth.uid() = user_id
    OR workspace_id IN (SELECT public.user_workspace_ids())
  );

-- automations
DROP POLICY IF EXISTS "Users can manage own automations" ON automations;
CREATE POLICY "Workspace members can manage automations" ON automations
  FOR ALL USING (
    auth.uid() = user_id
    OR workspace_id IN (SELECT public.user_workspace_ids())
  );

-- flows
DROP POLICY IF EXISTS "Users can manage own flows" ON flows;
CREATE POLICY "Workspace members can manage flows" ON flows
  FOR ALL USING (
    auth.uid() = user_id
    OR workspace_id IN (SELECT public.user_workspace_ids())
  );

-- broadcasts
DROP POLICY IF EXISTS "Users can manage own broadcasts" ON broadcasts;
CREATE POLICY "Workspace members can manage broadcasts" ON broadcasts
  FOR ALL USING (
    auth.uid() = user_id
    OR workspace_id IN (SELECT public.user_workspace_ids())
  );

-- message_templates
DROP POLICY IF EXISTS "Users can manage own templates" ON message_templates;
CREATE POLICY "Workspace members can manage templates" ON message_templates
  FOR ALL USING (
    auth.uid() = user_id
    OR workspace_id IN (SELECT public.user_workspace_ids())
  );
