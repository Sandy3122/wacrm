import { NextResponse } from 'next/server'
import { getRequestWorkspace } from '@/lib/auth/request-context'
import { can } from '@/lib/auth/rbac'
import {
  getLimitsForOrg,
  getOrgPlan,
  getMonthlyUsage,
  checkResourceLimit,
} from '@/lib/billing/usage'

/**
 * GET /api/billing
 *
 * Workspace usage dashboard: current plan, limits, and usage for the
 * active billing period. Any workspace member can read; billing
 * mutations (not implemented here — left to a payment provider
 * integration) require billing.manage.
 */
export async function GET() {
  const ctx = await getRequestWorkspace()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [plan, limits, messagesSent, automationRuns, broadcastsSent, accounts, members] =
    await Promise.all([
      getOrgPlan(ctx.organizationId),
      getLimitsForOrg(ctx.organizationId),
      getMonthlyUsage(ctx.workspaceId, 'messages_sent'),
      getMonthlyUsage(ctx.workspaceId, 'automation_runs'),
      getMonthlyUsage(ctx.workspaceId, 'broadcast_sent'),
      checkResourceLimit({ organizationId: ctx.organizationId, resource: 'whatsapp_accounts' }),
      checkResourceLimit({ organizationId: ctx.organizationId, resource: 'team_members' }),
    ])

  return NextResponse.json({
    plan,
    canManageBilling: can(ctx.role, 'billing.manage'),
    limits,
    usage: {
      messages_sent: {
        used: messagesSent,
        limit: limits.max_messages_per_month,
      },
      automation_runs: {
        used: automationRuns,
        limit: limits.max_automation_runs_per_month,
      },
      broadcasts_sent: {
        used: broadcastsSent,
        limit: limits.max_broadcasts_per_month,
      },
      whatsapp_accounts: { used: accounts.used, limit: accounts.limit },
      team_members: { used: members.used, limit: members.limit },
    },
  })
}
