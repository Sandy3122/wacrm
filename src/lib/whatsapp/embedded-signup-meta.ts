/**
 * Meta Graph helpers for WhatsApp Embedded Signup (Coexistence).
 */

const META_API_VERSION = 'v21.0'
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`

export interface ExchangeCodeResult {
  access_token: string
  token_type?: string
}

/**
 * Exchange the Embedded Signup authorization code for a business token.
 */
export async function exchangeEmbeddedSignupCode(code: string): Promise<ExchangeCodeResult> {
  const appId = process.env.NEXT_PUBLIC_META_APP_ID
  const appSecret = process.env.META_APP_SECRET
  if (!appId || !appSecret) {
    throw new Error('NEXT_PUBLIC_META_APP_ID and META_APP_SECRET are required for Embedded Signup')
  }

  const params = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    code,
  })

  const url = `${META_API_BASE}/oauth/access_token?${params.toString()}`
  const response = await fetch(url)
  const data = (await response.json()) as ExchangeCodeResult & { error?: { message?: string } }
  if (!response.ok || !data.access_token) {
    throw new Error(data.error?.message ?? `Token exchange failed (${response.status})`)
  }
  return data
}

export interface PhoneCoexistenceInfo {
  id: string
  display_phone_number?: string
  is_on_biz_app?: boolean
  platform_type?: string
}

export async function fetchPhoneCoexistenceInfo(
  phoneNumberId: string,
  accessToken: string,
): Promise<PhoneCoexistenceInfo> {
  const fields = 'id,display_phone_number,is_on_biz_app,platform_type'
  const url = `${META_API_BASE}/${phoneNumberId}?fields=${fields}`
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const data = (await response.json()) as PhoneCoexistenceInfo & { error?: { message?: string } }
  if (!response.ok) {
    throw new Error(data.error?.message ?? `Failed to fetch phone info (${response.status})`)
  }
  return data
}

/**
 * Subscribe the app to webhooks on the customer's WABA.
 *
 * This ensures the app is listed as a subscriber on the WABA so Meta
 * knows where to deliver events. It does NOT configure which *fields*
 * are delivered — that is a separate app-level subscription (see
 * `ensureWebhookFieldSubscriptions`).
 */
export async function subscribeAppToWaba(wabaId: string, accessToken: string): Promise<void> {
  const url = `${META_API_BASE}/${wabaId}/subscribed_apps`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })
  if (!response.ok) {
    const data = (await response.json()) as { error?: { message?: string } }
    throw new Error(data.error?.message ?? `WABA subscribe failed (${response.status})`)
  }
}

/**
 * Ensure the Meta App webhook subscription includes every field the
 * platform needs to function correctly. Without this call the operator
 * must manually configure fields in the Meta App Dashboard, and a
 * missing field (e.g. `statuses`) silently breaks delivery/read
 * tracking and inbox population.
 *
 * Required env:
 *   - NEXT_PUBLIC_META_APP_ID
 *   - META_APP_SECRET
 *
 * Fields we subscribe:
 *   - `messages`         — inbound text, media, reactions, order messages
 *   - `statuses`         — message status ladder (sent → delivered → read → failed)
 *
 * Non-breaking: the call is a POST which replaces the field list for
 * `whatsapp_business_account`; it is idempotent from the caller's pov.
 * The callback_url and verify_token are preserved from the existing
 * subscription (this call only mutates `fields`).
 */
export async function ensureWebhookFieldSubscriptions(): Promise<void> {
  const appId = process.env.NEXT_PUBLIC_META_APP_ID
  const appSecret = process.env.META_APP_SECRET
  if (!appId || !appSecret) {
    console.warn('[embedded-signup] skipping field subscription — missing app credentials')
    return
  }

  const appToken = `${appId}|${appSecret}`
  const FIELDS = ['messages', 'statuses']

  try {
    // GET existing subscription so we can re-POST with the same
    // callback_url + verify_token — we only want to add fields.
    const getUrl = `https://graph.facebook.com/v22.0/${appId}/subscriptions?access_token=${encodeURIComponent(appToken)}`
    const existingRes = await fetch(getUrl)
    const existing = (await existingRes.json()) as {
      data?: Array<{
        object: string
        callback_url: string
        fields: Array<{ name: string; version: string }>
      }>
    }

    const waba = (existing.data ?? []).find(
      (s) => s.object === 'whatsapp_business_account',
    )

    if (!waba) {
      console.warn(
        '[embedded-signup] no existing whatsapp_business_account subscription — ' +
          'configure the webhook in the Meta App Dashboard first, then re-run onboarding',
      )
      return
    }

    const currentFields = new Set(waba.fields.map((f) => f.name))
    const missing = FIELDS.filter((f) => !currentFields.has(f))

    if (missing.length === 0) {
      // Already subscribed — nothing to do.
      return
    }

    // Re-POST with the merged field list. Meta replaces the field set
    // for this `object`; previously subscribed fields stay included.
    const all = [...new Set([...currentFields, ...FIELDS])]
    const postParams = new URLSearchParams({
      object: 'whatsapp_business_account',
      callback_url: waba.callback_url,
      fields: JSON.stringify(all),
      include_values: 'true',
      access_token: appToken,
    })

    const postUrl = `https://graph.facebook.com/v22.0/${appId}/subscriptions`
    const postRes = await fetch(postUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: postParams.toString(),
    })

    if (!postRes.ok) {
      const err = (await postRes.json()) as { error?: { message?: string } }
      console.error(
        `[embedded-signup] field subscription update failed (${postRes.status}): ${err.error?.message ?? 'unknown'}`,
      )
      return
    }

    console.info(
      `[embedded-signup] subscribed webhook fields: ${all.join(', ')}`,
    )
  } catch (err) {
    // Best-effort — don't fail onboarding if the subscription call
    // flakes. The operator can always add fields manually.
    console.error('[embedded-signup] field subscription error:', err)
  }
}

export async function fetchWabaPhoneNumbers(
  wabaId: string,
  accessToken: string,
): Promise<Array<{ id: string; display_phone_number?: string }>> {
  const url = `${META_API_BASE}/${wabaId}/phone_numbers?fields=id,display_phone_number`
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const data = (await response.json()) as {
    data?: Array<{ id: string; display_phone_number?: string }>
    error?: { message?: string }
  }
  if (!response.ok) {
    throw new Error(data.error?.message ?? `Failed to list phone numbers (${response.status})`)
  }
  return data.data ?? []
}
