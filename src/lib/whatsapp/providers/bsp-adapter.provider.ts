import type {
  WhatsAppProvider,
  ProviderContext,
  ProviderCapabilities,
  PhoneInfo,
  SendResult,
  SendTextInput,
  SendTemplateInput,
  SendInteractiveButtonsInput,
  SendInteractiveListInput,
  SendReactionInput,
  MediaResolution,
} from './types'
import { ProviderNotSupportedError } from './types'

/**
 * BSP adapter provider (Sprint 6).
 *
 * Many Business Solution Providers (360dialog being the cleanest
 * example) expose a near-identical clone of Meta's Cloud API "messages"
 * surface, differing mainly in base URL and auth header. This adapter
 * targets that shape:
 *
 *   POST {baseUrl}/messages           (Cloud-API-compatible body)
 *   GET  {baseUrl}/{phoneNumberId}    (phone metadata; optional)
 *
 * Auth is sent via a configurable header (default `D360-API-KEY` for
 * 360dialog; `Authorization: Bearer` for others). Non-Cloud-API BSPs
 * (e.g. Twilio's very different REST shape) should get their own
 * provider class; this adapter intentionally covers the common case.
 *
 * provider_config (JSONB) shape:
 *   {
 *     "baseUrl": "https://waba-v2.360dialog.io",
 *     "authHeader": "D360-API-KEY",        // or "Authorization"
 *     "authScheme": "",                    // e.g. "Bearer " for Authorization
 *     "apiVersion": ""                     // optional path segment
 *   }
 */

interface BspConfig {
  baseUrl: string
  authHeader: string
  authScheme: string
  apiVersion?: string
}

const PROVIDER_DEFAULTS: Record<string, Partial<BspConfig>> = {
  '360dialog': {
    baseUrl: 'https://waba-v2.360dialog.io',
    authHeader: 'D360-API-KEY',
    authScheme: '',
  },
  gupshup: {
    baseUrl: 'https://api.gupshup.io/wa/api/v1',
    authHeader: 'apikey',
    authScheme: '',
  },
  messagebird: {
    baseUrl: 'https://conversations.messagebird.com/v1',
    authHeader: 'Authorization',
    authScheme: 'AccessKey ',
  },
  custom: {
    baseUrl: '',
    authHeader: 'Authorization',
    authScheme: 'Bearer ',
  },
}

export class BspAdapterProvider implements WhatsAppProvider {
  readonly providerType: string
  readonly capabilities: ProviderCapabilities = {
    text: true,
    template: true,
    interactiveButtons: true,
    interactiveList: true,
    // Reactions are inconsistently supported across BSPs — declare
    // unsupported by default; a custom config can't currently flip it.
    reactions: false,
    media: true,
  }

  private readonly apiKey: string
  private readonly cfg: BspConfig
  private readonly phoneNumberId: string | null

  constructor(ctx: ProviderContext) {
    this.providerType = ctx.providerType
    const apiKey = ctx.apiKey ?? ctx.accessToken
    if (!apiKey) {
      throw new Error(`${ctx.providerType} adapter requires a provider API key`)
    }
    this.apiKey = apiKey
    this.phoneNumberId = ctx.phoneNumberId

    const defaults = PROVIDER_DEFAULTS[ctx.providerType] ?? PROVIDER_DEFAULTS.custom
    const userCfg = (ctx.config ?? {}) as Partial<BspConfig>
    const baseUrl = (userCfg.baseUrl ?? defaults.baseUrl ?? '').replace(/\/$/, '')
    if (!baseUrl) {
      throw new Error(
        `${ctx.providerType} adapter requires a baseUrl in provider_config`,
      )
    }
    this.cfg = {
      baseUrl,
      authHeader: userCfg.authHeader ?? defaults.authHeader ?? 'Authorization',
      authScheme: userCfg.authScheme ?? defaults.authScheme ?? '',
      apiVersion: userCfg.apiVersion ?? defaults.apiVersion,
    }
  }

  private url(path: string): string {
    const version = this.cfg.apiVersion ? `/${this.cfg.apiVersion}` : ''
    return `${this.cfg.baseUrl}${version}${path}`
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      [this.cfg.authHeader]: `${this.cfg.authScheme}${this.apiKey}`,
    }
  }

  private async postMessage(body: Record<string, unknown>): Promise<SendResult> {
    const response = await fetch(this.url('/messages'), {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ messaging_product: 'whatsapp', ...body }),
    })
    if (!response.ok) {
      let message = `${this.providerType} API error: ${response.status}`
      try {
        const data = (await response.json()) as {
          error?: { message?: string }
          message?: string
        }
        message = data.error?.message ?? data.message ?? message
      } catch {
        // non-JSON body
      }
      throw new Error(message)
    }
    const data = (await response.json()) as {
      messages?: Array<{ id: string }>
      id?: string
    }
    const messageId = data.messages?.[0]?.id ?? data.id ?? ''
    return { messageId }
  }

  async verifyConnection(): Promise<PhoneInfo> {
    // Best-effort: many BSPs expose a settings/profile endpoint. We try
    // the Cloud-API-style phone metadata path and degrade gracefully.
    if (!this.phoneNumberId) {
      return { id: 'bsp', display_phone_number: undefined }
    }
    try {
      const response = await fetch(this.url(`/${this.phoneNumberId}`), {
        headers: this.headers(),
      })
      if (response.ok) {
        const data = (await response.json()) as PhoneInfo
        return { ...data, id: data.id ?? this.phoneNumberId }
      }
    } catch {
      // fall through
    }
    return { id: this.phoneNumberId }
  }

  sendText(input: SendTextInput): Promise<SendResult> {
    const body: Record<string, unknown> = {
      recipient_type: 'individual',
      to: input.to,
      type: 'text',
      text: { body: input.text },
    }
    if (input.contextMessageId) body.context = { message_id: input.contextMessageId }
    return this.postMessage(body)
  }

  sendTemplate(input: SendTemplateInput): Promise<SendResult> {
    const template: Record<string, unknown> = {
      name: input.templateName,
      language: { code: input.language ?? 'en_US' },
    }
    if (input.params && input.params.length > 0) {
      template.components = [
        {
          type: 'body',
          parameters: input.params.map((p) => ({ type: 'text', text: String(p) })),
        },
      ]
    }
    const body: Record<string, unknown> = {
      recipient_type: 'individual',
      to: input.to,
      type: 'template',
      template,
    }
    if (input.contextMessageId) body.context = { message_id: input.contextMessageId }
    return this.postMessage(body)
  }

  sendInteractiveButtons(input: SendInteractiveButtonsInput): Promise<SendResult> {
    const interactive: Record<string, unknown> = {
      type: 'button',
      body: { text: input.bodyText },
      action: {
        buttons: input.buttons.map((b) => ({
          type: 'reply',
          reply: { id: b.id, title: b.title },
        })),
      },
    }
    if (input.headerText) interactive.header = { type: 'text', text: input.headerText }
    if (input.footerText) interactive.footer = { text: input.footerText }
    const body: Record<string, unknown> = {
      recipient_type: 'individual',
      to: input.to,
      type: 'interactive',
      interactive,
    }
    if (input.contextMessageId) body.context = { message_id: input.contextMessageId }
    return this.postMessage(body)
  }

  sendInteractiveList(input: SendInteractiveListInput): Promise<SendResult> {
    const interactive: Record<string, unknown> = {
      type: 'list',
      body: { text: input.bodyText },
      action: {
        button: input.buttonLabel,
        sections: input.sections.map((s) => ({
          ...(s.title ? { title: s.title } : {}),
          rows: s.rows.map((r) => ({
            id: r.id,
            title: r.title,
            ...(r.description ? { description: r.description } : {}),
          })),
        })),
      },
    }
    if (input.headerText) interactive.header = { type: 'text', text: input.headerText }
    if (input.footerText) interactive.footer = { text: input.footerText }
    const body: Record<string, unknown> = {
      recipient_type: 'individual',
      to: input.to,
      type: 'interactive',
      interactive,
    }
    if (input.contextMessageId) body.context = { message_id: input.contextMessageId }
    return this.postMessage(body)
  }

  sendReaction(_input: SendReactionInput): Promise<SendResult> {
    void _input
    throw new ProviderNotSupportedError(this.providerType, 'sendReaction')
  }

  async getMediaUrl(mediaId: string): Promise<MediaResolution> {
    const response = await fetch(this.url(`/${mediaId}`), {
      headers: this.headers(),
    })
    if (!response.ok) {
      throw new Error(`${this.providerType} media fetch failed: ${response.status}`)
    }
    const data = (await response.json()) as { url?: string; mime_type?: string }
    if (!data.url) throw new Error('Media URL not found in provider response')
    return { url: data.url, mimeType: data.mime_type ?? 'application/octet-stream' }
  }

  async downloadMedia(
    downloadUrl: string,
  ): Promise<{ buffer: Buffer; contentType: string }> {
    const response = await fetch(downloadUrl, { headers: this.headers() })
    if (!response.ok) {
      throw new Error(`${this.providerType} media download failed: ${response.status}`)
    }
    const contentType =
      response.headers.get('content-type') ?? 'application/octet-stream'
    const buffer = Buffer.from(await response.arrayBuffer())
    return { buffer, contentType }
  }
}
