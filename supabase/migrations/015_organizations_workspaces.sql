-- ============================================================
-- Sprint 1 — Tenant Foundation
-- 015_organizations_workspaces.sql
--
-- Introduces the org / workspace structure WITHOUT breaking the
-- existing single-user model. Existing `user_id` columns stay; the
-- new tables sit alongside and are backfilled in migration 017.
--
-- Idempotent — safe to run multiple times.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
SET search_path TO public, extensions;

-- ============================================================
-- ORGANIZATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizations_owner_id ON organizations(owner_id);

-- ============================================================
-- WORKSPACES
-- ============================================================
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workspaces_organization_id ON workspaces(organization_id);

-- ============================================================
-- ORGANIZATION_MEMBERS
-- ============================================================
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member'
    CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON organization_members(organization_id);

-- ============================================================
-- WORKSPACE_MEMBERS
-- ============================================================
CREATE TABLE IF NOT EXISTS workspace_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'agent'
    CHECK (role IN ('owner', 'admin', 'agent', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_ws_members_user_id ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_ws_members_ws_id ON workspace_members(workspace_id);

-- ============================================================
-- RLS HELPER FUNCTIONS
--
-- SECURITY DEFINER so they bypass RLS on the membership tables —
-- this is what prevents infinite policy recursion when other tables'
-- policies reference these helpers (and when the membership tables'
-- own policies reference them).
-- ============================================================
CREATE OR REPLACE FUNCTION public.user_organization_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.user_workspace_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
$$;

-- Role of the current user inside a given workspace (NULL if not a member).
CREATE OR REPLACE FUNCTION public.user_workspace_role(target_workspace_id UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM workspace_members
  WHERE user_id = auth.uid() AND workspace_id = target_workspace_id
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.user_organization_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_workspace_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_workspace_role(UUID) TO authenticated;

-- ============================================================
-- RLS POLICIES
-- ============================================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view their organizations" ON organizations;
DROP POLICY IF EXISTS "Owners can update their organizations" ON organizations;
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Owners can delete their organizations" ON organizations;
CREATE POLICY "Members can view their organizations" ON organizations
  FOR SELECT USING (id IN (SELECT public.user_organization_ids()) OR owner_id = auth.uid());
CREATE POLICY "Users can create organizations" ON organizations
  FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owners can update their organizations" ON organizations
  FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Owners can delete their organizations" ON organizations
  FOR DELETE USING (owner_id = auth.uid());

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view their workspaces" ON workspaces;
DROP POLICY IF EXISTS "Org members can manage workspaces" ON workspaces;
CREATE POLICY "Members can view their workspaces" ON workspaces
  FOR SELECT USING (
    id IN (SELECT public.user_workspace_ids())
    OR organization_id IN (SELECT public.user_organization_ids())
  );
CREATE POLICY "Org members can manage workspaces" ON workspaces
  FOR ALL USING (organization_id IN (SELECT public.user_organization_ids()));

ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view org membership" ON organization_members;
DROP POLICY IF EXISTS "Users can join via service role" ON organization_members;
CREATE POLICY "Members can view org membership" ON organization_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR organization_id IN (SELECT public.user_organization_ids())
  );
-- Mutations go through the service role (server) for invites/backfill.
CREATE POLICY "Users can join via service role" ON organization_members
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (true);

ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view workspace membership" ON workspace_members;
DROP POLICY IF EXISTS "Users can join workspace via service role" ON workspace_members;
CREATE POLICY "Members can view workspace membership" ON workspace_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR workspace_id IN (SELECT public.user_workspace_ids())
  );
CREATE POLICY "Users can join workspace via service role" ON workspace_members
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (true);

-- ============================================================
-- updated_at triggers
-- ============================================================
DROP TRIGGER IF EXISTS set_updated_at ON organizations;
DROP TRIGGER IF EXISTS set_updated_at ON workspaces;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
