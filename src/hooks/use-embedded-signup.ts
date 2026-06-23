'use client';

import { useCallback, useState } from 'react';
import {
  buildEmbeddedSignupOAuthUrl,
  embeddedSignupOriginError,
  EMBEDDED_SIGNUP_STATE_KEY,
  getEmbeddedSignupCallbackPath,
} from '@/lib/whatsapp/embedded-signup-oauth';

export interface EmbeddedSignupSession {
  waba_id?: string;
  phone_number_id?: string;
  business_id?: string;
  display_phone_number?: string;
  event?: string;
}

/**
 * Starts Meta Embedded Signup via OAuth redirect (no FB.login / JS SDK).
 */
export function useEmbeddedSignup() {
  const [connecting, setConnecting] = useState(false);

  const appId = process.env.NEXT_PUBLIC_META_APP_ID;
  const configId = process.env.NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID;

  const startEmbeddedSignupRedirect = useCallback(() => {
    if (!appId || !configId) {
      throw new Error(
        'Set NEXT_PUBLIC_META_APP_ID and NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID in your environment.',
      );
    }

    const originError = embeddedSignupOriginError(window.location.origin);
    if (originError) {
      throw new Error(originError);
    }

    const state = crypto.randomUUID();
    sessionStorage.setItem(EMBEDDED_SIGNUP_STATE_KEY, state);

    const redirectUri = `${window.location.origin}${getEmbeddedSignupCallbackPath()}`;
    const url = buildEmbeddedSignupOAuthUrl({
      appId,
      configId,
      redirectUri,
      state,
    });

    setConnecting(true);
    window.location.assign(url);
  }, [appId, configId]);

  const callbackPath = getEmbeddedSignupCallbackPath();
  const originAllowed =
    typeof window !== 'undefined'
      ? embeddedSignupOriginError(window.location.origin) === null
      : true;

  return {
    startEmbeddedSignupRedirect,
    /** @deprecated Use startEmbeddedSignupRedirect — kept for HMR / stale bundle compatibility */
    launchEmbeddedSignup: startEmbeddedSignupRedirect,
    connecting,
    canLaunch: Boolean(appId && configId) && originAllowed,
    originBlocked: Boolean(appId && configId) && !originAllowed,
    originError:
      typeof window !== 'undefined'
        ? embeddedSignupOriginError(window.location.origin)
        : null,
    callbackPath,
  };
}
