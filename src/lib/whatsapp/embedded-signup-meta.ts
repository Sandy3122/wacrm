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
