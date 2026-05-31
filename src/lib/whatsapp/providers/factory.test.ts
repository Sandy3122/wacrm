import { describe, expect, it } from 'vitest'
import { createProvider } from './factory'
import type { ProviderContext } from './types'
import { MetaCloudProvider } from './meta-cloud.provider'
import { BspAdapterProvider } from './bsp-adapter.provider'
import { CustomProvider } from './custom.provider'

function ctx(overrides: Partial<ProviderContext>): ProviderContext {
  return {
    accountId: 'acc-1',
    connectionType: 'legacy_cloud_api',
    providerType: 'meta',
    phoneNumberId: 'pn-1',
    accessToken: 'token',
    apiKey: null,
    apiSecret: null,
    config: null,
    ...overrides,
  }
}

describe('createProvider', () => {
  it('builds a Meta provider for legacy_cloud_api', () => {
    const p = createProvider(ctx({ connectionType: 'legacy_cloud_api' }))
    expect(p).toBeInstanceOf(MetaCloudProvider)
    expect(p.providerType).toBe('meta')
  })

  it('builds a Meta provider for coexistence', () => {
    const p = createProvider(ctx({ connectionType: 'coexistence' }))
    expect(p).toBeInstanceOf(MetaCloudProvider)
  })

  it('builds a BSP adapter for bsp_adapter + 360dialog', () => {
    const p = createProvider(
      ctx({
        connectionType: 'bsp_adapter',
        providerType: '360dialog',
        apiKey: 'key',
        accessToken: null,
      }),
    )
    expect(p).toBeInstanceOf(BspAdapterProvider)
    expect(p.capabilities.reactions).toBe(false)
  })

  it('builds a Custom provider for bsp_adapter + custom', () => {
    const p = createProvider(
      ctx({
        connectionType: 'bsp_adapter',
        providerType: 'custom',
        apiKey: 'key',
        accessToken: null,
        config: { webhookUrl: 'https://example.com/hook' },
      }),
    )
    expect(p).toBeInstanceOf(CustomProvider)
  })

  it('Meta provider requires phone_number_id', () => {
    expect(() => createProvider(ctx({ phoneNumberId: null }))).toThrow()
  })

  it('360dialog adapter applies default base URL', () => {
    const p = createProvider(
      ctx({
        connectionType: 'bsp_adapter',
        providerType: '360dialog',
        apiKey: 'key',
        accessToken: null,
      }),
    ) as BspAdapterProvider
    expect(p.providerType).toBe('360dialog')
  })
})
