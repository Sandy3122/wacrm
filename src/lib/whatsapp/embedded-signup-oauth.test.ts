import { describe, expect, it } from 'vitest'
import {
  buildEmbeddedSignupOAuthUrl,
  embeddedSignupOriginError,
  isEmbeddedSignupOriginAllowed,
} from './embedded-signup-oauth'

describe('embedded-signup-oauth', () => {
  it('builds Meta OAuth URL with coexistence extras', () => {
    const url = buildEmbeddedSignupOAuthUrl({
      appId: '123',
      configId: 'cfg',
      redirectUri: 'http://localhost:3000/settings/whatsapp/embedded-signup/callback',
      state: 'abc',
    })
    expect(url).toContain('https://www.facebook.com/v21.0/dialog/oauth')
    expect(url).toContain('client_id=123')
    expect(url).toContain('config_id=cfg')
    expect(url).toContain('whatsapp_business_app_onboarding')
  })

  it('allows https and localhost http', () => {
    expect(isEmbeddedSignupOriginAllowed('https://crm.example.com')).toBe(true)
    expect(isEmbeddedSignupOriginAllowed('http://localhost:3000')).toBe(true)
    expect(isEmbeddedSignupOriginAllowed('http://192.168.1.5:3000')).toBe(false)
  })

  it('returns error for non-localhost http', () => {
    expect(embeddedSignupOriginError('http://192.168.1.5:3000')).toMatch(/HTTPS/)
  })
})
