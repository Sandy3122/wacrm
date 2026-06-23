import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabasePublicEnv } from './env'

// Singleton instance — one client shared across the whole browser session.
// Creating multiple clients causes auth-lock contention ("Lock was released
// because another request stole it") and intermittent fetch failures.
let browserClient: SupabaseClient | undefined

export function createClient() {
  if (browserClient) return browserClient

  const env = getSupabasePublicEnv()
  if (!env) {
    // Static prerender runs client components on the server without
    // NEXT_PUBLIC_* vars (e.g. CI before secrets are configured).
    // Auth/forms only touch Supabase in effects or event handlers, so
    // the HTML shell can render without a live client.
    if (typeof window === 'undefined') {
      return {} as SupabaseClient
    }

    throw new Error(
      'Missing Supabase configuration. Set NEXT_PUBLIC_SUPABASE_URL and ' +
        'NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment.',
    )
  }

  browserClient = createBrowserClient(env.url, env.key)
  return browserClient
}

/**
 * Authenticate the Realtime socket with the current session's JWT.
 *
 * `postgres_changes` subscriptions enforce RLS using the token attached
 * to the websocket — NOT the auth cookie used by REST queries. If a
 * channel subscribes before the session has been restored, it joins
 * unauthenticated, `auth.uid()` evaluates to NULL, every row is filtered
 * out by RLS, and the already-joined subscription is never re-evaluated
 * even after the SDK later refreshes the token. The channel then stays
 * silently dead for the whole session while REST refetches keep working
 * (they ride the cookie) — the classic "realtime shows nothing until I
 * reload / refetch" symptom.
 *
 * Call (and await) this BEFORE `.subscribe()` so the socket carries a
 * valid token at join time. Safe to call repeatedly.
 */
export async function ensureRealtimeAuth(): Promise<void> {
  if (typeof window === 'undefined') return
  const client = createClient()
  if (!client.auth) return
  const {
    data: { session },
  } = await client.auth.getSession()
  if (session?.access_token) {
    await client.realtime.setAuth(session.access_token)
  }
}
