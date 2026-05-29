import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/whatsapp/encryption'
import { fetchPhoneCoexistenceInfo } from '@/lib/whatsapp/embedded-signup-meta'

/**
 * GET /api/whatsapp/embedded-signup/status
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: config, error } = await supabase
      .from('whatsapp_config')
      .select(
        'connection_type, phone_number_id, waba_id, display_phone_number, webhook_status, app_sync_enabled, history_sync_status, coexistence_onboarded_at, last_webhook_at, access_token',
      )
      .eq('user_id', user.id)
      .maybeSingle()

    if (error || !config) {
      return NextResponse.json({ configured: false })
    }

    let coexistenceCheck: {
      is_on_biz_app?: boolean
      platform_type?: string
    } | null = null

    if (
      config.connection_type === 'coexistence' &&
      config.phone_number_id &&
      config.access_token
    ) {
      try {
        const token = decrypt(config.access_token)
        coexistenceCheck = await fetchPhoneCoexistenceInfo(config.phone_number_id, token)
      } catch {
        coexistenceCheck = null
      }
    }

    return NextResponse.json({
      configured: true,
      connection_type: config.connection_type,
      phone_number_id: config.phone_number_id,
      waba_id: config.waba_id,
      display_phone_number: config.display_phone_number,
      webhook_status: config.webhook_status,
      app_sync_enabled: config.app_sync_enabled,
      history_sync_status: config.history_sync_status,
      coexistence_onboarded_at: config.coexistence_onboarded_at,
      last_webhook_at: config.last_webhook_at,
      is_on_biz_app: coexistenceCheck?.is_on_biz_app,
      platform_type: coexistenceCheck?.platform_type,
    })
  } catch (error) {
    console.error('[embedded-signup/status]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
