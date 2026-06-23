'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { EMBEDDED_SIGNUP_STATE_KEY } from '@/lib/whatsapp/embedded-signup-oauth';

export default function EmbeddedSignupCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState('Completing WhatsApp connection…');
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    async function complete() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');
      const error = params.get('error');
      const errorDescription = params.get('error_description');

      if (error) {
        toast.error(errorDescription || error || 'Embedded Signup was cancelled');
        router.replace('/settings?tab=whatsapp');
        return;
      }

      const savedState = sessionStorage.getItem(EMBEDDED_SIGNUP_STATE_KEY);
      sessionStorage.removeItem(EMBEDDED_SIGNUP_STATE_KEY);

      if (!code || !state || !savedState || state !== savedState) {
        toast.error('Invalid Embedded Signup callback. Please try connecting again.');
        router.replace('/settings?tab=whatsapp');
        return;
      }

      try {
        const res = await fetch('/api/whatsapp/embedded-signup/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, event: 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING' }),
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Embedded Signup failed');
        }

        toast.success(
          data.display_phone_number
            ? `Connected: ${data.display_phone_number}`
            : 'WhatsApp Business App connected via Coexistence',
        );

        if (data.verify_token) {
          sessionStorage.setItem('wa_embedded_signup_verify_token', data.verify_token);
        }

        router.replace('/settings?tab=whatsapp&coexistence=connected');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Embedded Signup failed';
        setMessage(msg);
        toast.error(msg);
        router.replace('/settings?tab=whatsapp');
      }
    }

    void complete();
  }, [router]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-slate-300">
      <Loader2 className="size-8 animate-spin text-primary" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
