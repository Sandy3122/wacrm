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
  bindRealtimeAuth(browserClient)
  return browserClient
}

// Set once so we register the realtime-auth listener a single time for
// the singleton client, even though createClient() is called from many
// components.
let realtimeAuthBound = false

/**
 * Keep the Realtime websocket's JWT in lock-step with the auth session
 * for the WHOLE lifetime of the client — not just at subscribe time.
 *
 * `postgres_changes` enforces RLS using the token attached to the
 * socket. supabase-js only auto-pushes the token to Realtime on
 * `SIGNED_IN` / `TOKEN_REFRESHED` — NOT on `INITIAL_SESSION`, which is
 * the event that fires on a normal page load with a restored cookie
 * session. Without this, a channel that joins on first paint rides the
 * anon key, `auth.uid()` is NULL, RLS filters every row, and the
 * subscription stays silently dead for the session while REST keeps
 * working — the "messages only show after a manual refresh" bug.
 *
 * Binding to `onAuthStateChange` here covers every transition
 * (INITIAL_SESSION, SIGNED_IN, TOKEN_REFRESHED, SIGNED_OUT) so the
 * socket is authenticated regardless of subscribe timing and re-auths
 * itself when the hourly token rotation happens.
 */
function bindRealtimeAuth(client: SupabaseClient) {
  if (realtimeAuthBound || typeof window === 'undefined') return
  if (!client.auth || !client.realtime) return
  realtimeAuthBound = true

  client.auth.onAuthStateChange((_event, session) => {
    // setAuth(undefined) on sign-out drops the socket back to anon.
    void client.realtime.setAuth(session?.access_token)
  })
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

  let {
    data: { session },
  } = await client.auth.getSession()

  // `getSession()` returns whatever is in storage and does NOT reliably
  // refresh — so the access_token it hands back can already be expired
  // (background tab, machine sleep, a missed auto-refresh tick). Pushing
  // an expired JWT to the socket makes Realtime reject the join with
  // CHANNEL_ERROR, and because the retry calls back through here and gets
  // the SAME stale token, the channel stays stuck "Connecting…" forever.
  // Force a refresh when the token is expired or within 60s of it.
  const expiresAt = session?.expires_at // unix seconds
  const nowSec = Math.floor(Date.now() / 1000)
  if (session && (!expiresAt || expiresAt - nowSec < 60)) {
    const { data, error } = await client.auth.refreshSession()
    if (!error && data.session) {
      session = data.session
    }
  }

  if (session?.access_token) {
    await client.realtime.setAuth(session.access_token)
  }
}
