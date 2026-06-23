const META_OAUTH_VERSION = 'v21.0';

export interface EmbeddedSignupOAuthParams {
  appId: string;
  configId: string;
  redirectUri: string;
  state: string;
}

/**
 * Build the Meta OAuth URL for WhatsApp Embedded Signup (Coexistence).
 * Uses a full-page redirect instead of FB.login so HTTP dev pages
 * (e.g. http://localhost:3000) do not hit the SDK HTTPS restriction.
 */
export function buildEmbeddedSignupOAuthUrl(params: EmbeddedSignupOAuthParams): string {
  const { appId, configId, redirectUri, state } = params;

  const query = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    response_type: 'code',
    config_id: configId,
    override_default_response_type: 'true',
    state,
    extras: JSON.stringify({
      featureType: 'whatsapp_business_app_onboarding',
      sessionInfoVersion: '3',
    }),
  });

  return `https://www.facebook.com/${META_OAUTH_VERSION}/dialog/oauth?${query.toString()}`;
}

export const EMBEDDED_SIGNUP_STATE_KEY = 'wa_embedded_signup_state';

export function getEmbeddedSignupCallbackPath(): string {
  return '/settings/whatsapp/embedded-signup/callback';
}

/**
 * Meta allows http://localhost redirect URIs in dev. Other HTTP origins
 * (LAN IP, plain HTTP deploys) must use HTTPS or a tunnel (ngrok, etc.).
 */
export function isEmbeddedSignupOriginAllowed(origin: string): boolean {
  try {
    const url = new URL(origin);
    if (url.protocol === 'https:') return true;
    if (url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function embeddedSignupOriginError(origin: string): string | null {
  if (isEmbeddedSignupOriginAllowed(origin)) return null;

  return (
    'WhatsApp Embedded Signup requires HTTPS (or http://localhost for local dev). ' +
    `You are on ${origin}. Use "next dev --experimental-https", ngrok, or deploy behind HTTPS. ` +
    'Add your callback URL to Meta App → Facebook Login → Valid OAuth Redirect URIs.'
  );
}
