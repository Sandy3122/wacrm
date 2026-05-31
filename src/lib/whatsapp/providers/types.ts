/**
 * Provider abstraction (Sprint 3).
 *
 * A WhatsAppProvider hides the transport (Meta Cloud API, a BSP like
 * 360dialog/Twilio, or a fully custom integration) behind a stable
 * business-facing interface. Business logic (send routes, engine,
 * broadcasts) talks to a provider, never to Graph directly.
 */

import type {
  InteractiveButton,
  InteractiveListSection,
} from '@/lib/whatsapp/meta-api'

export interface SendResult {
  /** Canonical external message id (Meta wamid or BSP id). */
  messageId: string
}

export interface PhoneInfo {
  id: string
  display_phone_number?: string
  verified_name?: string
  quality_rating?: string
}

export interface SendTextInput {
  to: string
  text: string
  contextMessageId?: string
}

export interface SendTemplateInput {
  to: string
  templateName: string
  language?: string
  params?: string[]
  contextMessageId?: string
}

export interface SendInteractiveButtonsInput {
  to: string
  bodyText: string
  buttons: InteractiveButton[]
  headerText?: string
  footerText?: string
  contextMessageId?: string
}

export interface SendInteractiveListInput {
  to: string
  bodyText: string
  buttonLabel: string
  sections: InteractiveListSection[]
  headerText?: string
  footerText?: string
  contextMessageId?: string
}

export interface SendReactionInput {
  to: string
  targetMessageId: string
  emoji: string
}

export interface MediaResolution {
  url: string
  mimeType: string
}

/**
 * Capabilities a provider may or may not support. Callers can branch
 * gracefully instead of catching "not implemented" errors mid-send.
 */
export interface ProviderCapabilities {
  text: boolean
  template: boolean
  interactiveButtons: boolean
  interactiveList: boolean
  reactions: boolean
  media: boolean
}

export interface WhatsAppProvider {
  readonly providerType: string
  readonly capabilities: ProviderCapabilities

  verifyConnection(): Promise<PhoneInfo>

  sendText(input: SendTextInput): Promise<SendResult>
  sendTemplate(input: SendTemplateInput): Promise<SendResult>
  sendInteractiveButtons(input: SendInteractiveButtonsInput): Promise<SendResult>
  sendInteractiveList(input: SendInteractiveListInput): Promise<SendResult>
  sendReaction(input: SendReactionInput): Promise<SendResult>

  /** Resolve a provider media id to a fetchable URL + mime type. */
  getMediaUrl(mediaId: string): Promise<MediaResolution>
  /** Download media bytes (proxied to the client). */
  downloadMedia(downloadUrl: string): Promise<{ buffer: Buffer; contentType: string }>
}

/** Context a provider is built from — resolved from a whatsapp_accounts row. */
export interface ProviderContext {
  accountId: string
  connectionType: string
  providerType: string
  phoneNumberId: string | null
  accessToken: string | null
  apiKey: string | null
  apiSecret: string | null
  config: Record<string, unknown> | null
}

export class ProviderNotSupportedError extends Error {
  constructor(providerType: string, operation: string) {
    super(`Provider "${providerType}" does not support "${operation}"`)
    this.name = 'ProviderNotSupportedError'
  }
}
