import {
  verifyPhoneNumber,
  sendTextMessage,
  sendTemplateMessage,
  sendInteractiveButtons as metaSendButtons,
  sendInteractiveList as metaSendList,
  sendReactionMessage,
  getMediaUrl as metaGetMediaUrl,
  downloadMedia as metaDownloadMedia,
} from '@/lib/whatsapp/meta-api'
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

/**
 * Meta Cloud API provider — the original transport. Wraps the existing
 * meta-api helpers so the rest of the app stops calling Graph directly.
 * Covers both `legacy_cloud_api` and `coexistence` connection types,
 * which share the same Cloud API surface.
 */
export class MetaCloudProvider implements WhatsAppProvider {
  readonly providerType = 'meta'
  readonly capabilities: ProviderCapabilities = {
    text: true,
    template: true,
    interactiveButtons: true,
    interactiveList: true,
    reactions: true,
    media: true,
  }

  private readonly phoneNumberId: string
  private readonly accessToken: string

  constructor(ctx: ProviderContext) {
    if (!ctx.phoneNumberId) {
      throw new Error('MetaCloudProvider requires a phone_number_id')
    }
    if (!ctx.accessToken) {
      throw new Error('MetaCloudProvider requires an access token')
    }
    this.phoneNumberId = ctx.phoneNumberId
    this.accessToken = ctx.accessToken
  }

  verifyConnection(): Promise<PhoneInfo> {
    return verifyPhoneNumber({
      phoneNumberId: this.phoneNumberId,
      accessToken: this.accessToken,
    })
  }

  sendText(input: SendTextInput): Promise<SendResult> {
    return sendTextMessage({
      phoneNumberId: this.phoneNumberId,
      accessToken: this.accessToken,
      to: input.to,
      text: input.text,
      contextMessageId: input.contextMessageId,
    })
  }

  sendTemplate(input: SendTemplateInput): Promise<SendResult> {
    return sendTemplateMessage({
      phoneNumberId: this.phoneNumberId,
      accessToken: this.accessToken,
      to: input.to,
      templateName: input.templateName,
      language: input.language,
      params: input.params,
      contextMessageId: input.contextMessageId,
    })
  }

  sendInteractiveButtons(input: SendInteractiveButtonsInput): Promise<SendResult> {
    return metaSendButtons({
      phoneNumberId: this.phoneNumberId,
      accessToken: this.accessToken,
      to: input.to,
      bodyText: input.bodyText,
      buttons: input.buttons,
      headerText: input.headerText,
      footerText: input.footerText,
      contextMessageId: input.contextMessageId,
    })
  }

  sendInteractiveList(input: SendInteractiveListInput): Promise<SendResult> {
    return metaSendList({
      phoneNumberId: this.phoneNumberId,
      accessToken: this.accessToken,
      to: input.to,
      bodyText: input.bodyText,
      buttonLabel: input.buttonLabel,
      sections: input.sections,
      headerText: input.headerText,
      footerText: input.footerText,
      contextMessageId: input.contextMessageId,
    })
  }

  sendReaction(input: SendReactionInput): Promise<SendResult> {
    return sendReactionMessage({
      phoneNumberId: this.phoneNumberId,
      accessToken: this.accessToken,
      to: input.to,
      targetMessageId: input.targetMessageId,
      emoji: input.emoji,
    })
  }

  getMediaUrl(mediaId: string): Promise<MediaResolution> {
    return metaGetMediaUrl({ mediaId, accessToken: this.accessToken })
  }

  downloadMedia(
    downloadUrl: string,
  ): Promise<{ buffer: Buffer; contentType: string }> {
    return metaDownloadMedia({ downloadUrl, accessToken: this.accessToken })
  }
}
