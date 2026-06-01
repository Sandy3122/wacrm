-- ============================================================
-- Sprint 1 — Tenant Foundation (follow-up)
-- 027_provision_workspace_on_signup.sql
--
-- Extends handle_new_user so every NEW signup immediately gets an
-- organization + default workspace + owner memberships, in the same
-- transaction that creates their profile. This closes the race where a
-- brand-new user could insert contacts before any route provisioned
-- their workspace (leaving workspace_id NULL on those early rows).
--
-- The whole body is wrapped so a provisioning failure never blocks
-- signup — worst case, lazy provisioning in workspace-context.ts still
-- heals it on first request.
--
-- Idempotent.
-- ============================================================

SET search_path TO public, extensions;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_ws_id UUID;
  v_name TEXT;
BEGIN
  -- 1) Profile (original behaviour).
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  );

  -- 2) Organization + default workspace + memberships.
  v_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    'My Organization'
  );

  SELECT id INTO v_org_id FROM public.organizations WHERE owner_id = NEW.id LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO public.organizations (name, owner_id)
    VALUES (v_name, NEW.id)
    RETURNING id INTO v_org_id;
  END IF;

  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (v_org_id, NEW.id, 'owner')
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  SELECT id INTO v_ws_id
  FROM public.workspaces
  WHERE organization_id = v_org_id AND is_default = true
  LIMIT 1;
  IF v_ws_id IS NULL THEN
    INSERT INTO public.workspaces (organization_id, name, is_default)
    VALUES (v_org_id, 'Default Workspace', true)
    RETURNING id INTO v_ws_id;
  END IF;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (v_ws_id, NEW.id, 'owner')
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  -- 3) Free-tier subscription for the org (if billing table exists).
  BEGIN
    INSERT INTO public.billing_subscriptions (organization_id, plan, status)
    VALUES (v_org_id, 'free', 'active')
    ON CONFLICT (organization_id) DO NOTHING;
  EXCEPTION WHEN undefined_table THEN
    -- billing migration not applied yet — ignore.
    NULL;
  END;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user provisioning failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

-- Trigger already exists from migration 001; recreate defensively in
-- case this migration is applied to a DB where it was dropped.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
