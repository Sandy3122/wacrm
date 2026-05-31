import { describe, expect, it } from 'vitest'
import {
  normalizeProviderWebhook,
  providerSignature,
} from './webhook-normalize'

describe('providerSignature', () => {
  it('360dialog forwards Meta HMAC', () => {
    expect(providerSignature('360dialog')).toEqual({
      signs: true,
      header: 'x-hub-signature-256',
    })
  })

  it('unknown providers do not sign', () => {
    expect(providerSignature('gupshup').signs).toBe(false)
    expect(providerSignature('whatever').signs).toBe(false)
  })
})

describe('normalizeProviderWebhook', () => {
  it('360dialog passes through and injects phone_number_id metadata', () => {
    const body = {
      entry: [
        {
          changes: [
            {
              field: 'messages',
              value: {
                messages: [{ id: 'm1', from: '123', type: 'text' }],
              },
            },
          ],
        },
      ],
    }
    const out = normalizeProviderWebhook('360dialog', body, 'pn-123')
    const value = out.entry?.[0]?.changes?.[0]?.value as {
      metadata?: { phone_number_id?: string }
    }
    expect(value.metadata?.phone_number_id).toBe('pn-123')
  })

  it('maps a Gupshup text message into the Meta envelope', () => {
    const body = {
      type: 'message',
      payload: {
        type: 'text',
        id: 'gs-1',
        sender: { phone: '15551234567', name: 'Ada' },
        payload: { text: 'hello' },
      },
    }
    const out = normalizeProviderWebhook('gupshup', body, 'pn-9')
    const change = out.entry?.[0]?.changes?.[0]
    expect(change?.field).toBe('messages')
    const value = change?.value as {
      messages?: Array<{ text?: { body?: string }; from?: string }>
      contacts?: Array<{ wa_id?: string }>
    }
    expect(value.messages?.[0]?.text?.body).toBe('hello')
    expect(value.messages?.[0]?.from).toBe('15551234567')
    expect(value.contacts?.[0]?.wa_id).toBe('15551234567')
  })

  it('returns empty for a non-message Gupshup event', () => {
    const out = normalizeProviderWebhook('gupshup', { type: 'status' }, 'pn-9')
    expect(out.entry).toBeUndefined()
  })
})
