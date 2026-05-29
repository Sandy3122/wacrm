'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    FB?: {
      init: (params: { appId: string; cookie?: boolean; xfbml?: boolean; version: string }) => void;
      login: (
        callback: (response: { authResponse?: { code?: string } }) => void,
        options: Record<string, unknown>,
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

export interface EmbeddedSignupSession {
  waba_id?: string;
  phone_number_id?: string;
  business_id?: string;
  display_phone_number?: string;
  event?: string;
}

const SDK_URL = 'https://connect.facebook.net/en_US/sdk.js';

function loadFacebookSdk(appId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.FB) {
      resolve();
      return;
    }

    const existing = document.querySelector(`script[src="${SDK_URL}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Facebook SDK')));
      return;
    }

    window.fbAsyncInit = () => {
      window.FB?.init({
        appId,
        cookie: true,
        xfbml: true,
        version: 'v21.0',
      });
      resolve();
    };

    const script = document.createElement('script');
    script.src = SDK_URL;
    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';
    script.onerror = () => reject(new Error('Failed to load Facebook SDK'));
    document.body.appendChild(script);
  });
}

export function useEmbeddedSignup() {
  const [connecting, setConnecting] = useState(false);
  const sessionRef = useRef<EmbeddedSignupSession>({});

  const appId = process.env.NEXT_PUBLIC_META_APP_ID;
  const configId = process.env.NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID;

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (
        typeof event.origin !== 'string' ||
        (!event.origin.includes('facebook.com') && !event.origin.includes('meta.com'))
      ) {
        return;
      }
      if (typeof event.data !== 'string' && typeof event.data !== 'object') return;

      try {
        const payload =
          typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (payload?.type !== 'WA_EMBEDDED_SIGNUP') return;

        const data = payload.data ?? {};
        sessionRef.current = {
          waba_id: data.waba_id,
          phone_number_id: data.phone_number_id,
          business_id: data.business_id,
          display_phone_number: data.display_phone_number,
          event: payload.event,
        };
      } catch {
        // ignore non-JSON messages
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const launchEmbeddedSignup = useCallback(async (): Promise<{
    code: string;
    session: EmbeddedSignupSession;
  }> => {
    if (!appId || !configId) {
      throw new Error(
        'Set NEXT_PUBLIC_META_APP_ID and NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID in your environment.',
      );
    }

    setConnecting(true);
    sessionRef.current = {};

    try {
      await loadFacebookSdk(appId);

      return await new Promise((resolve, reject) => {
        window.FB?.login(
          (response) => {
            const code = response.authResponse?.code;
            if (!code) {
              reject(new Error('Embedded Signup was cancelled or did not return a code.'));
              return;
            }
            resolve({ code, session: { ...sessionRef.current } });
          },
          {
            config_id: configId,
            response_type: 'code',
            override_default_response_type: true,
            extras: {
              featureType: 'whatsapp_business_app_onboarding',
              sessionInfoVersion: '3',
            },
          },
        );
      });
    } finally {
      setConnecting(false);
    }
  }, [appId, configId]);

  return {
    launchEmbeddedSignup,
    connecting,
    canLaunch: Boolean(appId && configId),
  };
}
