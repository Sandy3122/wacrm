-- ============================================================
-- Sprint 1 — Tenant Foundation
-- 017_backfill_default_workspace.sql
--
-- Creates a default organization + workspace for every existing user
-- (derived from profiles), enrolls them as owner, and backfills
-- workspace_id / organization_id onto all their existing rows.
--
-- Idempotent — uses NOT EXISTS guards so re-running is a no-op.
-- ============================================================

SET search_path TO public, extensions;

-- ------------------------------------------------------------
-- 1) One organization per existing user (owner = that user).
-- ------------------------------------------------------------
INSERT INTO organizations (id, name, owner_id, created_at)
SELECT
  uuid_generate_v4(),
  COALESCE(NULLIF(p.full_name, ''), p.email, 'My Organization'),
  p.user_id,
  NOW()
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM organizations o WHERE o.owner_id = p.user_id
);

-- ------------------------------------------------------------
-- 2) owner membership row in organization_members.
-- ------------------------------------------------------------
INSERT INTO organization_members (organization_id, user_id, role)
SELECT o.id, o.owner_id, 'owner'
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM organization_members m
  WHERE m.organization_id = o.id AND m.user_id = o.owner_id
);

-- ------------------------------------------------------------
-- 3) One default workspace per organization.
-- ------------------------------------------------------------
INSERT INTO workspaces (id, organization_id, name, is_default, created_at)
SELECT uuid_generate_v4(), o.id, 'Default Workspace', true, NOW()
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM workspaces w WHERE w.organization_id = o.id AND w.is_default = true
);

-- ------------------------------------------------------------
-- 4) owner membership row in workspace_members.
-- ------------------------------------------------------------
INSERT INTO workspace_members (workspace_id, user_id, role)
SELECT w.id, o.owner_id, 'owner'
FROM workspaces w
JOIN organizations o ON o.id = w.organization_id
WHERE w.is_default = true
  AND NOT EXISTS (
    SELECT 1 FROM workspace_members m
    WHERE m.workspace_id = w.id AND m.user_id = o.owner_id
  );

-- ------------------------------------------------------------
-- 5) Backfill scope columns on every tenant table.
--    Resolve (organization_id, workspace_id) from the row's user_id
--    via the owner's default org/workspace.
-- ------------------------------------------------------------
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'contacts', 'conversations', 'tags', 'custom_fields', 'contact_notes',
    'pipelines', 'deals', 'automations', 'flows', 'broadcasts',
    'message_templates'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format($f$
      UPDATE %I t
      SET
        workspace_id = w.id,
        organization_id = o.id
      FROM organizations o
      JOIN workspaces w ON w.organization_id = o.id AND w.is_default = true
      WHERE o.owner_id = t.user_id
        AND t.workspace_id IS NULL
    $f$, tbl);
  END LOOP;
END $$;
