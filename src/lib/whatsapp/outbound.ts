import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { decrypt } from '@/lib/whatsapp/encryption'
import {
  getAccountById,
  getAccountForUserId,
  resolveAccountForWorkspace,
  type ResolvedAccount,
} from '@/lib/whatsapp/accounts'
import {
  providerForResolvedAccount,
  providerContextFromAccount,
} from '@/lib/whatsapp/providers/factory'
import { MetaCloudProvider } from '@/lib/whatsapp/providers/meta-cloud.provider'
import type { WhatsAppProvider } from '@/lib/whatsapp/providers/types'

/**
 * Unified outbound resolver.
 *
 * Every outbound path (send, broadcast, react, media, template sync)
 * resolves its messaging context through here so a single code path
 * supports BOTH the new whatsapp_accounts model (any provider) AND the
 * legacy whatsapp_config rows that haven't been migrated.
 *
 * Resolution order:
 *   1. explicit account id (e.g. conversation.whatsapp_account_id) so a
 *      reply goes out through the same number the thread belongs to.
 *   2. the workspace's resolved account.
 *   3. the user's (single) account.
 *   4. legacy whatsapp_config for the user → wrapped in a Meta provider.
 *
 * The returned context exposes a ready provider plus the raw Meta
 * fields (phone_number_id / accessToken / waba_id) that a few
 * Meta-specific routes (template sync) still need directly.
 */

let _adminClient: SupabaseClient | null = null
function admin(): SupabaseClient {
  if (!_adminClient) {
    _adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
  }
  return _adminClient
}

export interface OutboundContext {
  provider: WhatsAppProvider
  /** Meta phone number id — null for non-Meta BSPs that don't expose one. */
  phoneNumberId: string | null
  /** Decrypted Meta/bearer token — null for BSPs that use an API key. */
  accessToken: string | null
  wabaId: string | null
  accountId: string | null
  providerType: string
  source: 'account' | 'legacy_config'
}

interface ResolveArgs {
  /** Prefer this account (usually conversation.whatsapp_account_id). */
  accountId?: string | null
  /** Active workspace — used to pick a connected account. */
  workspaceId?: string | null
  /** Legacy fallback — the owning user. */
  userId?: string | null
}

function contextFromResolvedAccount(resolved: ResolvedAccount): OutboundContext {
  const provider = providerForResolvedAccount(resolved)
  const ctx = providerContextFromAccount(resolved.account, resolved.accessToken)
  return {
    provider,
    phoneNumberId: resolved.account.phone_number_id,
    accessToken: ctx.accessToken,
    wabaId: resolved.account.waba_id,
    accountId: resolved.account.id,
    providerType: resolved.account.provider_type,
    source: 'account',
  }
}

/**
 * Build an OutboundContext from a legacy whatsapp_config row for a user.
 * Returns null when there is no config (or its token can't be decrypted).
 */
async function legacyConfigContext(userId: string): Promise<OutboundContext | null> {
  const { data: config, error } = await admin()
    .from('whatsapp_config')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error || !config) return null

  let accessToken: string
  try {
    accessToken = decrypt(config.access_token)
  } catch {
    return null
  }

  const provider = new MetaCloudProvider({
    accountId: config.id,
    connectionType:
      config.connection_type === 'coexistence' ? 'coexistence' : 'legacy_cloud_api',
    providerType: 'meta',
    phoneNumberId: config.phone_number_id,
    accessToken,
    apiKey: null,
    apiSecret: null,
    config: null,
  })

  return {
    provider,
    phoneNumberId: config.phone_number_id,
    accessToken,
    wabaId: config.waba_id ?? null,
    accountId: null,
    providerType: 'meta',
    source: 'legacy_config',
  }
}

/**
 * Resolve the outbound context. Throws a descriptive error when nothing
 * can be resolved so callers return a clear 400.
 */
export async function resolveOutbound(args: ResolveArgs): Promise<OutboundContext> {
  // 1) explicit account
  if (args.accountId) {
    const byId = await getAccountById(args.accountId)
    if (byId) return contextFromResolvedAccount(byId)
  }
  // 2) workspace's account
  if (args.workspaceId) {
    const byWs = await resolveAccountForWorkspace(args.workspaceId)
    if (byWs) return contextFromResolvedAccount(byWs)
  }
  // 3) user's account
  if (args.userId) {
    const byUser = await getAccountForUserId(args.userId)
    if (byUser) return contextFromResolvedAccount(byUser)
    // 4) legacy config fallback
    const legacy = await legacyConfigContext(args.userId)
    if (legacy) return legacy
  }
  throw new Error(
    'WhatsApp not configured. Connect a WhatsApp account in Settings → Accounts (or WhatsApp Config).',
  )
}

/** Soft variant — returns null instead of throwing. */
export async function tryResolveOutbound(
  args: ResolveArgs,
): Promise<OutboundContext | null> {
  try {
    return await resolveOutbound(args)
  } catch {
    return null
  }
}
