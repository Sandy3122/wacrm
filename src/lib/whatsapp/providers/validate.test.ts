import { describe, expect, it } from 'vitest'
import {
  validateProviderCredentials,
  presetFor,
  PROVIDER_PRESETS,
} from './validate'

describe('validateProviderCredentials', () => {
  it('accepts a complete Meta payload', () => {
    const res = validateProviderCredentials({
      provider_type: 'meta',
      phone_number_id: 'pn-1',
      access_token: 'tok',
    })
    expect(res.ok).toBe(true)
    expect(res.errors).toHaveLength(0)
  })

  it('rejects a Meta payload missing required fields', () => {
    const res = validateProviderCredentials({ provider_type: 'meta' })
    expect(res.ok).toBe(false)
    expect(res.errors.join(' ')).toMatch(/Phone Number ID/)
    expect(res.errors.join(' ')).toMatch(/Access Token/)
  })

  it('accepts a 360dialog payload with API key', () => {
    const res = validateProviderCredentials({
      provider_type: '360dialog',
      provider_api_key: 'key',
    })
    expect(res.ok).toBe(true)
  })

  it('requires webhookUrl for the custom provider', () => {
    const res = validateProviderCredentials({ provider_type: 'custom' })
    expect(res.ok).toBe(false)
    expect(res.errors.join(' ')).toMatch(/webhookUrl/)
  })

  it('accepts custom provider with webhookUrl', () => {
    const res = validateProviderCredentials({
      provider_type: 'custom',
      provider_config: { webhookUrl: 'https://example.com/hook' },
    })
    expect(res.ok).toBe(true)
  })

  it('rejects an unknown provider', () => {
    const res = validateProviderCredentials({ provider_type: 'nope' })
    expect(res.ok).toBe(false)
  })
})

describe('presetFor', () => {
  it('returns presets for each known provider', () => {
    for (const p of PROVIDER_PRESETS) {
      expect(presetFor(p.providerType)?.providerType).toBe(p.providerType)
    }
  })

  it('360dialog preset carries config defaults', () => {
    expect(presetFor('360dialog')?.configDefaults?.baseUrl).toBe(
      'https://waba-v2.360dialog.io',
    )
  })
})
