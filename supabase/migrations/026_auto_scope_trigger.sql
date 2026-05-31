-- ============================================================
-- Sprint 1/2 — Auto-scope trigger
-- 026_auto_scope_trigger.sql
--
-- Many rows are inserted client-side with only user_id set (the
-- dashboard uses the Supabase browser client directly). Rather than
-- touch every insert site, this BEFORE INSERT trigger fills
-- organization_id + workspace_id from the inserting user's default
-- workspace whenever they're NULL. New code that sets them explicitly
-- is unaffected.
--
-- Idempotent.
-- ============================================================

SET search_path TO public, extensions;

CREATE OR REPLACE FUNCTION public.auto_scope_to_default_workspace()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org UUID;
  v_ws UUID;
  v_user UUID;
BEGIN
  -- Already scoped — nothing to do.
  IF NEW.workspace_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Determine the relevant user: the row's user_id, else the caller.
  v_user := NEW.user_id;
  IF v_user IS NULL THEN
    v_user := auth.uid();
  END IF;
  IF v_user IS NULL THEN
    RETURN NEW; -- service-role insert without a user — leave as-is.
  END IF;

  SELECT o.id, w.id
    INTO v_org, v_ws
  FROM organizations o
  JOIN workspaces w ON w.organization_id = o.id AND w.is_default = true
  WHERE o.owner_id = v_user
  LIMIT 1;

  IF v_ws IS NOT NULL THEN
    NEW.workspace_id := v_ws;
    IF NEW.organization_id IS NULL THEN
      NEW.organization_id := v_org;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Attach to every tenant-scoped table that has workspace_id + user_id.
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
    EXECUTE format('DROP TRIGGER IF EXISTS auto_scope_ws ON %I', tbl);
    EXECUTE format(
      'CREATE TRIGGER auto_scope_ws BEFORE INSERT ON %I '
      || 'FOR EACH ROW EXECUTE FUNCTION public.auto_scope_to_default_workspace()',
      tbl
    );
  END LOOP;
END $$;
