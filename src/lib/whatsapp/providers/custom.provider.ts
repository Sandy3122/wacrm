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
 * Custom webhook provider (Sprint 6).
 *
 * For integrations that don't match the Cloud-API-compatible BSP shape,
 * this forwards a normalized event to a single user-configured webhook
 * URL and expects `{ message_id }` back. Useful as an escape hatch /
 * for self-hosted gateways.
 *
 * provider_config:
 *   { "webhookUrl": "https://...", "headerName": "X-API-Key" }
 * provider_api_key is sent in `headerName` (default `X-API-Key`).
 */
export class CustomProvider implements WhatsAppProvider {
  readonly providerType = 'custom'
  readonly capabilities: ProviderCapabilities = {
    text: true,
    template: true,
    interactiveButtons: false,
    interactiveList: false,
    reactions: false,
    media: false,
  }

  private readonly webhookUrl: string
  private readonly headerName: string
  private readonly apiKey: string | null

  constructor(ctx: ProviderContext) {
    const config = (ctx.config ?? {}) as { webhookUrl?: string; headerName?: string }
    if (!config.webhookUrl) {
      throw new Error('Custom provider requires webhookUrl in provider_config')
    }
    this.webhookUrl = config.webhookUrl
    this.headerName = config.headerName ?? 'X-API-Key'
    this.apiKey = ctx.apiKey ?? ctx.accessToken ?? null
  }

  private async dispatch(payload: Record<string, unknown>): Promise<SendResult> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (this.apiKey) headers[this.headerName] = this.apiKey
    const response = await fetch(this.webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })
    if (!response.ok) {
      throw new Error(`Custom provider webhook error: ${response.status}`)
    }
    const data = (await response.json().catch(() => ({}))) as {
      message_id?: string
      id?: string
    }
    return { messageId: data.message_id ?? data.id ?? `custom-${Date.now()}` }
  }

  async verifyConnection(): Promise<PhoneInfo> {
    return { id: 'custom' }
  }

  sendText(input: SendTextInput): Promise<SendResult> {
    return this.dispatch({ kind: 'text', ...input })
  }

  sendTemplate(input: SendTemplateInput): Promise<SendResult> {
    return this.dispatch({ kind: 'template', ...input })
  }

  sendInteractiveButtons(_input: SendInteractiveButtonsInput): Promise<SendResult> {
    void _input
    throw new ProviderNotSupportedError('custom', 'sendInteractiveButtons')
  }

  sendInteractiveList(_input: SendInteractiveListInput): Promise<SendResult> {
    void _input
    throw new ProviderNotSupportedError('custom', 'sendInteractiveList')
  }

  sendReaction(_input: SendReactionInput): Promise<SendResult> {
    void _input
    throw new ProviderNotSupportedError('custom', 'sendReaction')
  }

  getMediaUrl(_mediaId: string): Promise<MediaResolution> {
    void _mediaId
    throw new ProviderNotSupportedError('custom', 'getMediaUrl')
  }

  downloadMedia(
    _downloadUrl: string,
  ): Promise<{ buffer: Buffer; contentType: string }> {
    void _downloadUrl
    throw new ProviderNotSupportedError('custom', 'downloadMedia')
  }
}
