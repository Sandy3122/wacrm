/**
 * Provider credential schema validation (Sprint 6).
 *
 * Validates the connection payload before an account is created, so a
 * misconfigured BSP fails at save time with a clear message rather than
 * mid-conversation with a 4xx from the provider.
 */

export interface ProviderFieldSpec {
  key: string
  label: string
  required: boolean
  secret: boolean
  placeholder?: string
  help?: string
}

export interface ProviderPreset {
  providerType: string
  connectionType: 'legacy_cloud_api' | 'coexistence' | 'bsp_adapter'
  label: string
  fields: ProviderFieldSpec[]
  /** Defaults merged into provider_config when omitted by the user. */
  configDefaults?: Record<string, unknown>
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    providerType: 'meta',
    connectionType: 'legacy_cloud_api',
    label: 'Meta Cloud API (direct)',
    fields: [
      { key: 'phone_number_id', label: 'Phone Number ID', required: true, secret: false },
      { key: 'waba_id', label: 'WABA ID', required: false, secret: false },
      { key: 'access_token', label: 'Access Token', required: true, secret: true },
      { key: 'verify_token', label: 'Webhook Verify Token', required: false, secret: true },
    ],
  },
  {
    providerType: '360dialog',
    connectionType: 'bsp_adapter',
    label: '360dialog',
    fields: [
      { key: 'provider_api_key', label: 'API Key', required: true, secret: true },
      { key: 'phone_number_id', label: 'Phone Number ID', required: false, secret: false },
    ],
    configDefaults: {
      baseUrl: 'https://waba-v2.360dialog.io',
      authHeader: 'D360-API-KEY',
      authScheme: '',
    },
  },
  {
    providerType: 'twilio',
    connectionType: 'bsp_adapter',
    label: 'Twilio',
    fields: [
      { key: 'provider_api_key', label: 'Account SID', required: true, secret: false },
      { key: 'provider_api_secret', label: 'Auth Token', required: true, secret: true },
      {
        key: 'display_phone_number',
        label: 'WhatsApp Sender (whatsapp:+…)',
        required: true,
        secret: false,
      },
    ],
  },
  {
    providerType: 'gupshup',
    connectionType: 'bsp_adapter',
    label: 'Gupshup',
    fields: [
      { key: 'provider_api_key', label: 'API Key', required: true, secret: true },
      { key: 'display_phone_number', label: 'Source Number', required: true, secret: false },
    ],
    configDefaults: {
      baseUrl: 'https://api.gupshup.io/wa/api/v1',
      authHeader: 'apikey',
      authScheme: '',
    },
  },
  {
    providerType: 'messagebird',
    connectionType: 'bsp_adapter',
    label: 'MessageBird / Bird',
    fields: [
      { key: 'provider_api_key', label: 'Access Key', required: true, secret: true },
      { key: 'phone_number_id', label: 'Channel ID', required: true, secret: false },
    ],
    configDefaults: {
      baseUrl: 'https://conversations.messagebird.com/v1',
      authHeader: 'Authorization',
      authScheme: 'AccessKey ',
    },
  },
  {
    providerType: 'custom',
    connectionType: 'bsp_adapter',
    label: 'Custom Webhook',
    fields: [
      { key: 'provider_api_key', label: 'API Key (optional)', required: false, secret: true },
    ],
  },
]

export function presetFor(providerType: string): ProviderPreset | undefined {
  return PROVIDER_PRESETS.find((p) => p.providerType === providerType)
}

export interface ValidationResult {
  ok: boolean
  errors: string[]
}

/**
 * Validate a create-account payload against the provider's field spec.
 */
export function validateProviderCredentials(
  payload: Record<string, unknown>,
): ValidationResult {
  const providerType = String(payload.provider_type ?? 'meta')
  const preset = presetFor(providerType)
  const errors: string[] = []

  if (!preset) {
    errors.push(`Unknown provider type "${providerType}"`)
    return { ok: false, errors }
  }

  for (const field of preset.fields) {
    if (field.required) {
      const value = payload[field.key]
      if (value === undefined || value === null || value === '') {
        errors.push(`${field.label} is required`)
      }
    }
  }

  // Custom webhook needs a webhookUrl in provider_config.
  if (providerType === 'custom') {
    const config = (payload.provider_config ?? {}) as { webhookUrl?: string }
    if (!config.webhookUrl) {
      errors.push('Custom provider requires a webhookUrl in provider_config')
    }
  }

  return { ok: errors.length === 0, errors }
}
