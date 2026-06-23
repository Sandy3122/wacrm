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
