-- ============================================================
-- Sprint 7 — Billing, Usage, Limits, RBAC
-- 022_billing_subscriptions.sql
--
-- Per-organization subscription record. Plan limits live in
-- plan_limits (024); usage in usage_logs (023). Billing is workspace-
-- agnostic at the org level (an org pays once, gets N workspaces).
--
-- Idempotent.
-- ============================================================

SET search_path TO public, extensions;

CREATE TABLE IF NOT EXISTS billing_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free', 'starter', 'pro', 'business', 'enterprise')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'paused')),
  -- External billing provider linkage (Stripe etc.) — nullable for
  -- self-hosted installs that don't bill.
  external_customer_id TEXT,
  external_subscription_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id)
);

CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_org
  ON billing_subscriptions(organization_id);

ALTER TABLE billing_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Org members can view subscription" ON billing_subscriptions;
CREATE POLICY "Org members can view subscription" ON billing_subscriptions
  FOR SELECT USING (organization_id IN (SELECT public.user_organization_ids()));
-- Mutations via service role (billing webhooks / admin).
DROP POLICY IF EXISTS "Service role manages subscription" ON billing_subscriptions;
CREATE POLICY "Service role manages subscription" ON billing_subscriptions
  FOR ALL USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  ) WITH CHECK (true);

DROP TRIGGER IF EXISTS set_updated_at ON billing_subscriptions;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON billing_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Default every existing org onto the free plan.
INSERT INTO billing_subscriptions (organization_id, plan, status)
SELECT o.id, 'free', 'active'
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM billing_subscriptions b WHERE b.organization_id = o.id
);
