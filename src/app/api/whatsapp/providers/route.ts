import { NextResponse } from 'next/server'
import { PROVIDER_PRESETS } from '@/lib/whatsapp/providers/validate'

/**
 * GET /api/whatsapp/providers
 *
 * Returns provider presets (form field specs + connection modes) for
 * the account-connection UI. No secrets, no auth-sensitive data.
 */
export async function GET() {
  return NextResponse.json({ presets: PROVIDER_PRESETS })
}
