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
 * When automation_outside_hours is false (default), automations only run
 * Mon–Fri 09:00–18:00 in the server timezone. Phase 2 — configurable hours
 * can replace this hardcoded window later.
 */
export async function isAutomationAllowedNow(userId: string): Promise<boolean> {
  const { data: config } = await supabaseAdmin()
    .from('whatsapp_config')
    .select('automation_outside_hours')
    .eq('user_id', userId)
    .maybeSingle()

  const row = config as { automation_outside_hours?: boolean } | null
  if (row?.automation_outside_hours) {
    return true
  }

  const now = new Date()
  const day = now.getDay()
  if (day === 0 || day === 6) return false

  const hour = now.getHours()
  return hour >= 9 && hour < 18
}
