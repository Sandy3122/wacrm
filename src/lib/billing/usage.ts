import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Usage tracking + plan enforcement (Sprint 7).
 *
 * Reads plan_limits + billing_subscriptions, aggregates usage_logs over
 * the current billing period (calendar month fallback), and answers
 * "is this workspace within limit for metric X?".
 *
 * All best-effort: if the billing tables don't exist yet (mid-
 * migration) enforcement fails OPEN (allows the action) so the core
 * product keeps working. Limits only bite once the tables are present.
 */

let _adminClient: SupabaseClient | null = null
function admin(): SupabaseClient {
  if (!_adminClient) {
    _adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
  }
  return _adminClient
}

export type UsageMetric =
  | 'messages_sent'
  | 'automation_runs'
  | 'broadcast_sent'
  | 'flow_runs'

export interface PlanLimits {
  plan: string
  max_whatsapp_accounts: number
  max_workspaces: number
  max_team_members: number
  max_messages_per_month: number
  max_automation_runs_per_month: number
  max_broadcasts_per_month: number
}

const FREE_FALLBACK: PlanLimits = {
  plan: 'free',
  max_whatsapp_accounts: 1,
  max_workspaces: 1,
  max_team_members: 2,
  max_messages_per_month: 1000,
  max_automation_runs_per_month: 500,
  max_broadcasts_per_month: 5,
}

export async function getOrgPlan(organizationId: string): Promise<string> {
  try {
    const { data } = await admin()
      .from('billing_subscriptions')
      .select('plan, status')
      .eq('organization_id', organizationId)
      .maybeSingle()
    if (!data) return 'free'
    // Treat non-active subscriptions as free-tier limits.
    return data.status === 'active' || data.status === 'trialing' ? data.plan : 'free'
  } catch {
    return 'free'
  }
}

export async function getPlanLimits(plan: string): Promise<PlanLimits> {
  try {
    const { data } = await admin()
      .from('plan_limits')
      .select('*')
      .eq('plan', plan)
      .maybeSingle()
    if (data) return data as PlanLimits
  } catch {
    // table missing — fall through
  }
  return { ...FREE_FALLBACK, plan }
}

export async function getLimitsForOrg(organizationId: string): Promise<PlanLimits> {
  const plan = await getOrgPlan(organizationId)
  return getPlanLimits(plan)
}

function monthStartUtc(): string {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10)
}

/** Sum a metric for a workspace over the current calendar month. */
export async function getMonthlyUsage(
  workspaceId: string,
  metric: UsageMetric,
): Promise<number> {
  try {
    const { data, error } = await admin()
      .from('usage_logs')
      .select('quantity')
      .eq('workspace_id', workspaceId)
      .eq('metric', metric)
      .gte('usage_date', monthStartUtc())
    if (error || !data) return 0
    return data.reduce((sum, r) => sum + (r.quantity ?? 0), 0)
  } catch {
    return 0
  }
}

export async function recordUsage(args: {
  workspaceId: string
  organizationId: string | null
  metric: UsageMetric
  quantity?: number
}): Promise<void> {
  try {
    const { error } = await admin().from('usage_logs').insert({
      workspace_id: args.workspaceId,
      organization_id: args.organizationId,
      metric: args.metric,
      quantity: args.quantity ?? 1,
    })
    if (error) console.warn('[usage] record failed:', error.message)
  } catch (err) {
    console.warn('[usage] record threw:', err instanceof Error ? err.message : err)
  }
}

export interface LimitCheck {
  allowed: boolean
  limit: number
  used: number
  metric: UsageMetric
  reason?: string
}

const METRIC_TO_LIMIT_KEY: Record<UsageMetric, keyof PlanLimits> = {
  messages_sent: 'max_messages_per_month',
  automation_runs: 'max_automation_runs_per_month',
  flow_runs: 'max_automation_runs_per_month',
  broadcast_sent: 'max_broadcasts_per_month',
}

/**
 * Check whether a workspace can perform `count` more of `metric` this
 * period. Fails OPEN on any internal error.
 */
export async function checkUsageLimit(args: {
  workspaceId: string
  organizationId: string
  metric: UsageMetric
  count?: number
}): Promise<LimitCheck> {
  const count = args.count ?? 1
  try {
    const limits = await getLimitsForOrg(args.organizationId)
    const limitKey = METRIC_TO_LIMIT_KEY[args.metric]
    const limit = Number(limits[limitKey])

    // -1 = unlimited.
    if (limit < 0) {
      return { allowed: true, limit: -1, used: 0, metric: args.metric }
    }

    const used = await getMonthlyUsage(args.workspaceId, args.metric)
    const allowed = used + count <= limit
    return {
      allowed,
      limit,
      used,
      metric: args.metric,
      reason: allowed
        ? undefined
        : `Monthly ${args.metric} limit reached (${used}/${limit}) on the ${limits.plan} plan.`,
    }
  } catch {
    return { allowed: true, limit: -1, used: 0, metric: args.metric }
  }
}

/** Count resources for resource-based limits (accounts, members). */
export async function checkResourceLimit(args: {
  organizationId: string
  workspaceId?: string
  resource: 'whatsapp_accounts' | 'team_members' | 'workspaces'
}): Promise<LimitCheck> {
  try {
    const limits = await getLimitsForOrg(args.organizationId)
    let limit: number
    let used: number

    if (args.resource === 'whatsapp_accounts') {
      limit = limits.max_whatsapp_accounts
      const { count } = await admin()
        .from('whatsapp_accounts')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', args.organizationId)
      used = count ?? 0
    } else if (args.resource === 'workspaces') {
      limit = limits.max_workspaces
      const { count } = await admin()
        .from('workspaces')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', args.organizationId)
      used = count ?? 0
    } else {
      limit = limits.max_team_members
      const { count } = await admin()
        .from('organization_members')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', args.organizationId)
      used = count ?? 0
    }

    if (limit < 0) {
      return { allowed: true, limit: -1, used, metric: 'messages_sent' }
    }
    const allowed = used < limit
    return {
      allowed,
      limit,
      used,
      metric: 'messages_sent',
      reason: allowed ? undefined : `${args.resource} limit reached (${used}/${limit}).`,
    }
  } catch {
    return { allowed: true, limit: -1, used: 0, metric: 'messages_sent' }
  }
}
