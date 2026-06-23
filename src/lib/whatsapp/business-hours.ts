import { createClient } from '@supabase/supabase-js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _adminClient: any = null

function supabaseAdmin() {
  if (!_adminClient) {
    _adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
  }
  return _adminClient
}

/**
 * Pure business-hours decision. When `automationOutsideHours` is true the
 * automation may always run; otherwise it's limited to Mon–Fri 09:00–18:00
 * in the server timezone. Phase 2 — configurable hours can replace this
 * hardcoded window later.
 *
 * Extracted as a pure function so the time-window logic is unit-testable
 * without a Supabase round-trip.
 */
export function isAutomationAllowedAt(
  automationOutsideHours: boolean,
  now: Date = new Date(),
): boolean {
  if (automationOutsideHours) return true

  const day = now.getDay()
  if (day === 0 || day === 6) return false

  const hour = now.getHours()
  return hour >= 9 && hour < 18
}

/**
 * Resolve the `automation_outside_hours` setting for a user.
 *
 * Coexistence / account-based setups store the toggle on
 * whatsapp_accounts; legacy setups store it on whatsapp_config. Check the
 * accounts table first so the "Allow automation outside business hours"
 * switch is honored for coexistence numbers, then fall back to the legacy
 * config row. Defaults to false (business-hours-only) when neither exists.
 */
export async function resolveAutomationOutsideHours(
  userId: string,
): Promise<boolean> {
  const { data: account } = await supabaseAdmin()
    .from('whatsapp_accounts')
    .select('automation_outside_hours')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (account && account.automation_outside_hours != null) {
    return Boolean(account.automation_outside_hours)
  }

  const { data: config } = await supabaseAdmin()
    .from('whatsapp_config')
    .select('automation_outside_hours')
    .eq('user_id', userId)
    .maybeSingle()

  return Boolean(config?.automation_outside_hours)
}

export async function isAutomationAllowedNow(userId: string): Promise<boolean> {
  const outsideHours = await resolveAutomationOutsideHours(userId)
  return isAutomationAllowedAt(outsideHours)
}
