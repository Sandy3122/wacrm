import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { encrypt } from '@/lib/whatsapp/encryption'
import {
  exchangeEmbeddedSignupCode,
  fetchPhoneCoexistenceInfo,
  fetchWabaPhoneNumbers,
  subscribeAppToWaba,
  ensureWebhookFieldSubscriptions,
} from '@/lib/whatsapp/embedded-signup-meta'
import { randomBytes } from 'crypto'
import { syncLegacyConfigToAccount } from '@/lib/whatsapp/account-sync'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function generateVerifyToken(): string {
  return randomBytes(24).toString('hex')
}

/**
 * POST /api/whatsapp/embedded-signup/complete
 *
 * Exchanges Embedded Signup code, stores coexistence config. Skips phone
 * registration — number is already on Cloud API + Business App.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      code,
      waba_id: wabaIdInput,
      phone_number_id: phoneNumberIdInput,
      business_id: businessIdInput,
      display_phone_number: displayPhoneInput,
      event,
    } = body as {
      code?: string
      waba_id?: string
      phone_number_id?: string
      business_id?: string
      display_phone_number?: string
      event?: string
    }

    if (!code) {
      return NextResponse.json({ error: 'code is required' }, { status: 400 })
    }

    const { access_token: accessToken } = await exchangeEmbeddedSignupCode(code)

    const wabaId = wabaIdInput ?? null
    let phoneNumberId = phoneNumberIdInput ?? null
    let displayPhoneNumber = displayPhoneInput ?? null

    if (wabaId && !phoneNumberId) {
      const phones = await fetchWabaPhoneNumbers(wabaId, accessToken)
      if (phones.length === 1) {
        phoneNumberId = phones[0].id
        displayPhoneNumber = phones[0].display_phone_number ?? displayPhoneNumber
      }
    }

    if (!phoneNumberId) {
      return NextResponse.json(
        {
          error:
            'phone_number_id is required. Complete Embedded Signup or pass phone_number_id from the session callback.',
        },
        { status: 400 },
      )
    }

    const phoneInfo = await fetchPhoneCoexistenceInfo(phoneNumberId, accessToken)
    displayPhoneNumber = displayPhoneNumber ?? phoneInfo.display_phone_number ?? null

    if (wabaId) {
      try {
        await subscribeAppToWaba(wabaId, accessToken)
      } catch (err) {
        console.warn('[embedded-signup] WABA subscribe warning:', err)
      }
    }

    // Best-effort: ensure the app-level webhook subscription carries
    // `messages` + `statuses` so status tracking and inbox work without
    // manual configuration in the Meta App Dashboard.
    void ensureWebhookFieldSubscriptions()

    const admin = supabaseAdmin()

    const { data: claimed } = await admin
      .from('whatsapp_config')
      .select('user_id')
      .eq('phone_number_id', phoneNumberId)
      .neq('user_id', user.id)
      .maybeSingle()

    if (claimed) {
      return NextResponse.json(
        { error: 'This phone number is already linked to another account.' },
        { status: 409 },
      )
    }

    const verifyTokenPlain = generateVerifyToken()
    const encryptedAccessToken = encrypt(accessToken)
    const encryptedVerifyToken = encrypt(verifyTokenPlain)

    const row = {
      phone_number_id: phoneNumberId,
      waba_id: wabaId,
      business_id: businessIdInput ?? null,
      display_phone_number: displayPhoneNumber,
      access_token: encryptedAccessToken,
      verify_token: encryptedVerifyToken,
      status: 'connected',
      connection_type: 'coexistence',
      webhook_status: 'pending',
      app_sync_enabled: true,
      pause_bot_on_app_reply: true,
      bot_pause_duration_hours: 24,
      history_sync_status: 'pending',
      coexistence_onboarded_at: new Date().toISOString(),
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data: existing } = await supabase
      .from('whatsapp_config')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (existing) {
      const { error: updateError } = await supabase
        .from('whatsapp_config')
        .update(row)
        .eq('user_id', user.id)

      if (updateError) {
        console.error('[embedded-signup] update failed:', updateError)
        return NextResponse.json({ error: 'Failed to save configuration' }, { status: 500 })
      }
    } else {
      const { error: insertError } = await supabase.from('whatsapp_config').insert({
        user_id: user.id,
        ...row,
      })

      if (insertError) {
        console.error('[embedded-signup] insert failed:', insertError)
        return NextResponse.json({ error: 'Failed to save configuration' }, { status: 500 })
      }
    }

    // Mirror into whatsapp_accounts for the new Accounts UI + routing.
    const { data: savedConfig } = await supabase
      .from('whatsapp_config')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
    if (savedConfig) {
      await syncLegacyConfigToAccount(savedConfig)
    }

    return NextResponse.json({
      success: true,
      event: event ?? null,
      phone_number_id: phoneNumberId,
      waba_id: wabaId,
      display_phone_number: displayPhoneNumber,
      is_on_biz_app: phoneInfo.is_on_biz_app,
      platform_type: phoneInfo.platform_type,
      verify_token: verifyTokenPlain,
      message:
        'Connected via Coexistence. Add the verify token and webhook URL in Meta Dashboard, and subscribe to smb_message_echoes.',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    console.error('[embedded-signup/complete]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
