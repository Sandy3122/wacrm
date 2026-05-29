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

/** Pause active flow runs when a human takes over (CRM or Business App). */
export async function pauseActiveFlowRunsForContact(
  userId: string,
  contactId: string,
  endReason: 'agent_replied' | 'business_app_replied',
): Promise<void> {
  const { error } = await supabaseAdmin()
    .from('flow_runs')
    .update({
      status: 'paused_by_agent',
      ended_at: new Date().toISOString(),
      end_reason: endReason,
    })
    .eq('user_id', userId)
    .eq('contact_id', contactId)
    .eq('status', 'active')

  if (error) {
    console.error(`[flows] pause-on-${endReason} failed:`, error.message)
  }
}
