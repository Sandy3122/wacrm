import { decrypt } from '@/lib/whatsapp/encryption'
import type { WhatsAppAccountRow, ResolvedAccount } from '@/lib/whatsapp/accounts'
import type { WhatsAppProvider, ProviderContext } from './types'
import { MetaCloudProvider } from './meta-cloud.provider'
import { BspAdapterProvider } from './bsp-adapter.provider'
import { CustomProvider } from './custom.provider'

function decryptMaybe(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    return decrypt(value)
  } catch {
    return null
  }
}

/**
 * Build the ProviderContext (with decrypted secrets) from an account row.
 */
export function providerContextFromAccount(
  account: WhatsAppAccountRow,
  accessTokenOverride?: string | null,
): ProviderContext {
  return {
    accountId: account.id,
    connectionType: account.connection_type,
    providerType: account.provider_type,
    phoneNumberId: account.phone_number_id,
    accessToken: accessTokenOverride ?? decryptMaybe(account.access_token),
    apiKey: decryptMaybe(account.provider_api_key),
    apiSecret: decryptMaybe(account.provider_api_secret),
    config: account.provider_config,
  }
}

/**
 * Construct the right provider for an account. Coexistence + legacy
 * Cloud API both use Meta; bsp_adapter dispatches on provider_type.
 */
export function createProvider(ctx: ProviderContext): WhatsAppProvider {
  if (ctx.connectionType === 'bsp_adapter') {
    if (ctx.providerType === 'custom') {
      return new CustomProvider(ctx)
    }
    return new BspAdapterProvider(ctx)
  }
  // legacy_cloud_api + coexistence → Meta Cloud API.
  return new MetaCloudProvider(ctx)
}

/** Convenience: build a provider straight from a ResolvedAccount. */
export function providerForResolvedAccount(
  resolved: ResolvedAccount,
): WhatsAppProvider {
  const ctx = providerContextFromAccount(resolved.account, resolved.accessToken)
  return createProvider(ctx)
}
