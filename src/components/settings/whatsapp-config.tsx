'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Eye,
  EyeOff,
  Copy,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  Zap,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import type { WhatsAppConfig as WhatsAppConfigType, WhatsAppConnectionType } from '@/types';
import { useEmbeddedSignup } from '@/hooks/use-embedded-signup';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const MASKED_TOKEN = '••••••••••••••••';

type ConnectionStatus = 'connected' | 'disconnected' | 'unknown';
type ResetReason = 'token_corrupted' | 'meta_api_error' | null;

export function WhatsAppConfig() {
  const supabase = createClient();
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [config, setConfig] = useState<WhatsAppConfigType | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('unknown');
  const [resetReason, setResetReason] = useState<ResetReason>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [wabaId, setWabaId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [verifyToken, setVerifyToken] = useState('');
  const [tokenEdited, setTokenEdited] = useState(false);
  const [connectionType, setConnectionType] = useState<WhatsAppConnectionType>('legacy');
  const [displayPhoneNumber, setDisplayPhoneNumber] = useState('');
  const [pauseBotOnAppReply, setPauseBotOnAppReply] = useState(true);
  const [botPauseHours, setBotPauseHours] = useState(24);
  const [automationOutsideHours, setAutomationOutsideHours] = useState(false);
  const [fallbackMessage, setFallbackMessage] = useState('');
  const [appSyncEnabled, setAppSyncEnabled] = useState(true);
  const [webhookStatus, setWebhookStatus] = useState<string>('pending');
  const [connectingSignup, setConnectingSignup] = useState(false);

  const { launchEmbeddedSignup, canLaunch } = useEmbeddedSignup();

  const webhookUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/whatsapp/webhook`
      : '';

  const fetchConfig = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      // Load form values from Supabase (shows what's in DB)
      const { data, error } = await supabase
        .from('whatsapp_config')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Failed to load config row:', error);
      }

      if (data) {
        setConfig(data);
        setPhoneNumberId(data.phone_number_id || '');
        setWabaId(data.waba_id || '');
        setAccessToken(MASKED_TOKEN);
        setVerifyToken('');
        setTokenEdited(false);
        setConnectionType(data.connection_type ?? 'legacy');
        setDisplayPhoneNumber(data.display_phone_number || '');
        setPauseBotOnAppReply(data.pause_bot_on_app_reply ?? true);
        setBotPauseHours(data.bot_pause_duration_hours ?? 24);
        setAutomationOutsideHours(data.automation_outside_hours ?? false);
        setFallbackMessage(data.fallback_message || '');
        setAppSyncEnabled(data.app_sync_enabled ?? true);
        setWebhookStatus(data.webhook_status || 'pending');
      } else {
        setConfig(null);
        setPhoneNumberId('');
        setWabaId('');
        setAccessToken('');
        setVerifyToken('');
        setTokenEdited(false);
      }

      // Then verify health via the API (decrypts token + pings Meta)
      if (data) {
        try {
          const res = await fetch('/api/whatsapp/config', { method: 'GET' });
          const payload = await res.json();

          if (payload.connected) {
            setConnectionStatus('connected');
            setResetReason(null);
            setStatusMessage('');
          } else {
            setConnectionStatus('disconnected');
            setResetReason(payload.needs_reset ? 'token_corrupted' : payload.reason === 'meta_api_error' ? 'meta_api_error' : null);
            setStatusMessage(payload.message || '');
          }
        } catch (err) {
          console.error('Health check failed:', err);
          setConnectionStatus('disconnected');
        }
      } else {
        setConnectionStatus('disconnected');
        setResetReason(null);
        setStatusMessage('');
      }
    } catch (err) {
      console.error('fetchConfig error:', err);
      toast.error('Failed to load WhatsApp configuration');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    fetchConfig(user.id);
  }, [authLoading, user, fetchConfig]);

  async function handleSave() {
    if (!phoneNumberId.trim()) {
      toast.error('Phone Number ID is required');
      return;
    }
    if (!config && (!accessToken.trim() || !tokenEdited)) {
      toast.error('Access Token is required for initial setup');
      return;
    }

    try {
      setSaving(true);

      // Always POST through the API — it verifies with Meta and encrypts
      // the access_token server-side with ENCRYPTION_KEY. Skipping this
      // and writing direct to Supabase stores the token in plaintext,
      // which then fails decryption on every subsequent health check.
      const payload: Record<string, unknown> = {
        phone_number_id: phoneNumberId.trim(),
        waba_id: wabaId.trim() || null,
        verify_token: verifyToken.trim() || null,
        connection_type: connectionType,
        display_phone_number: displayPhoneNumber.trim() || null,
        pause_bot_on_app_reply: pauseBotOnAppReply,
        bot_pause_duration_hours: botPauseHours,
        automation_outside_hours: automationOutsideHours,
        fallback_message: fallbackMessage.trim() || null,
        app_sync_enabled: appSyncEnabled,
      };

      if (tokenEdited && accessToken !== MASKED_TOKEN && accessToken.trim()) {
        payload.access_token = accessToken.trim();
      } else if (!config) {
        toast.error('Access Token is required for initial setup');
        setSaving(false);
        return;
      }

      const res = await fetch('/api/whatsapp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to save configuration');
        setSaving(false);
        return;
      }

      toast.success(
        data.phone_info?.verified_name
          ? `Connected to ${data.phone_info.verified_name}`
          : 'Configuration saved successfully'
      );

      if (user) await fetchConfig(user.id);
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  }

  async function handleTestConnection() {
    try {
      setTesting(true);
      const res = await fetch('/api/whatsapp/config', { method: 'GET' });
      const payload = await res.json();

      if (payload.connected) {
        setConnectionStatus('connected');
        setResetReason(null);
        setStatusMessage('');
        toast.success(
          payload.phone_info?.verified_name
            ? `Connected to ${payload.phone_info.verified_name}`
            : 'API connection successful'
        );
      } else {
        setConnectionStatus('disconnected');
        setResetReason(payload.needs_reset ? 'token_corrupted' : payload.reason === 'meta_api_error' ? 'meta_api_error' : null);
        setStatusMessage(payload.message || '');
        toast.error(payload.message || 'API connection failed');
      }
    } catch (err) {
      console.error('Test connection error:', err);
      setConnectionStatus('disconnected');
      toast.error('Connection test failed. Check network and try again.');
    } finally {
      setTesting(false);
    }
  }

  async function handleReset() {
    if (!confirm('This will delete the current WhatsApp config so you can re-enter it. Continue?')) {
      return;
    }

    try {
      setResetting(true);
      const res = await fetch('/api/whatsapp/config', { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to reset configuration');
        return;
      }

      toast.success('Configuration cleared. You can now re-enter your credentials.');
      setConfig(null);
      setPhoneNumberId('');
      setWabaId('');
      setAccessToken('');
      setVerifyToken('');
      setTokenEdited(false);
      setConnectionStatus('disconnected');
      setResetReason(null);
      setStatusMessage('');
    } catch (err) {
      console.error('Reset error:', err);
      toast.error('Failed to reset configuration');
    } finally {
      setResetting(false);
    }
  }

  function handleCopyWebhookUrl() {
    navigator.clipboard.writeText(webhookUrl);
    toast.success('Webhook URL copied to clipboard');
  }

  async function handleConnectCoexistence() {
    try {
      setConnectingSignup(true);
      const { code, session } = await launchEmbeddedSignup();
      const res = await fetch('/api/whatsapp/embedded-signup/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          waba_id: session.waba_id,
          phone_number_id: session.phone_number_id,
          business_id: session.business_id,
          display_phone_number: session.display_phone_number,
          event: session.event,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Embedded Signup failed');
        return;
      }
      toast.success('WhatsApp Business App connected via Coexistence');
      if (data.verify_token) {
        setVerifyToken(data.verify_token);
      }
      if (user) await fetchConfig(user.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Embedded Signup failed';
      toast.error(message);
    } finally {
      setConnectingSignup(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  const showResetBanner = resetReason === 'token_corrupted';

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px] mt-4">
      {/* Main config form */}
      <div className="space-y-6">
        {/* Corrupted-token reset banner */}
        {showResetBanner && (
          <Alert className="bg-amber-950/40 border-amber-600/40">
            <div className="flex items-start gap-3">
              <AlertTriangle className="size-5 text-amber-400 mt-0.5 shrink-0" />
              <div className="flex-1">
                <AlertTitle className="text-amber-200 mb-1">
                  Stored token can&apos;t be decrypted
                </AlertTitle>
                <AlertDescription className="text-amber-100/80 text-sm">
                  {statusMessage}
                </AlertDescription>
                <Button
                  onClick={handleReset}
                  disabled={resetting}
                  size="sm"
                  className="mt-3 bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {resetting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="size-4" />
                      Reset Configuration
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Alert>
        )}

        {/* Connection Status */}
        <Alert className="bg-slate-900 border-slate-700">
          <div className="flex items-center gap-2">
            {connectionStatus === 'connected' ? (
              <CheckCircle2 className="size-4 text-primary" />
            ) : (
              <XCircle className="size-4 text-red-500" />
            )}
            <AlertTitle className="text-white mb-0">
              {connectionStatus === 'connected' ? 'Connected' : 'Not Connected'}
            </AlertTitle>
          </div>
          <AlertDescription className="text-slate-400">
            {connectionStatus === 'connected'
              ? 'Your WhatsApp Business API is connected and ready to send/receive messages.'
              : statusMessage ||
                'Configure your Meta API credentials below to connect your WhatsApp Business account.'}
          </AlertDescription>
        </Alert>

        {/* Connection type */}
        <Card className="bg-slate-900 border-slate-700 ring-0 ring-transparent">
          <CardHeader>
            <CardTitle className="text-white">Connection Type</CardTitle>
            <CardDescription className="text-slate-400">
              Legacy uses manual Cloud API credentials. Coexistence keeps the WhatsApp Business App active on the same number.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup
              value={connectionType}
              onValueChange={(v) => setConnectionType(v as WhatsAppConnectionType)}
              className="space-y-3"
            >
              <div className="flex items-start gap-3 rounded-lg border border-slate-700 p-3">
                <RadioGroupItem value="legacy" id="conn-legacy" className="mt-1" />
                <Label htmlFor="conn-legacy" className="cursor-pointer text-slate-200">
                  <span className="font-medium">Legacy Cloud API</span>
                  <p className="text-xs text-slate-500 mt-1 font-normal">
                    Paste Phone Number ID, WABA ID, and token from Meta Developer Console.
                  </p>
                </Label>
              </div>
              <div className="flex items-start gap-3 rounded-lg border border-slate-700 p-3">
                <RadioGroupItem value="coexistence" id="conn-coexistence" className="mt-1" />
                <Label htmlFor="conn-coexistence" className="cursor-pointer text-slate-200">
                  <span className="font-medium">Coexistence — WhatsApp Business App + API</span>
                  <p className="text-xs text-slate-500 mt-1 font-normal">
                    Connect an existing Business App number. Do not delete the app or migrate the number manually.
                  </p>
                </Label>
              </div>
            </RadioGroup>

            {connectionType === 'coexistence' && (
              <Alert className="bg-blue-950/30 border-blue-800/50">
                <AlertDescription className="text-blue-100/90 text-sm space-y-2">
                  <p>Keep WhatsApp Business App installed (v2.24.17+). Do not delete it.</p>
                  <p>Choose <strong>Connect WhatsApp Business App</strong> in Meta&apos;s flow, not standard migration.</p>
                  {canLaunch ? (
                    <Button
                      type="button"
                      onClick={handleConnectCoexistence}
                      disabled={connectingSignup}
                      className="mt-2 bg-primary hover:bg-primary/90"
                    >
                      {connectingSignup ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        'Connect WhatsApp Business App Number'
                      )}
                    </Button>
                  ) : (
                    <p className="text-amber-200/90 text-xs">
                      Embedded Signup requires NEXT_PUBLIC_META_APP_ID and NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID.
                      You can still import credentials below after onboarding via a BSP.
                    </p>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {config && (
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded bg-slate-800 px-2 py-1 text-slate-300">
                  Type: {connectionType === 'coexistence' ? 'Coexistence' : 'Legacy'}
                </span>
                <span className="rounded bg-slate-800 px-2 py-1 text-slate-300">
                  Webhook: {webhookStatus}
                </span>
                <span className="rounded bg-slate-800 px-2 py-1 text-slate-300">
                  App sync: {appSyncEnabled ? 'On' : 'Off'}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* API Credentials */}
        <Card className="bg-slate-900 border-slate-700 ring-0 ring-transparent">
          <CardHeader>
            <CardTitle className="text-white">
              {connectionType === 'coexistence' ? 'Credentials (after onboarding)' : 'API Credentials'}
            </CardTitle>
            <CardDescription className="text-slate-400">
              {connectionType === 'coexistence'
                ? 'Filled automatically after Embedded Signup, or paste BSP-provided values.'
                : 'Enter your Meta WhatsApp Business API credentials.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Display Phone Number</Label>
              <Input
                placeholder="e.g. +1 555 0100"
                value={displayPhoneNumber}
                onChange={(e) => setDisplayPhoneNumber(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Phone Number ID</Label>
              <Input
                placeholder="e.g. 100234567890123"
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">WhatsApp Business Account ID</Label>
              <Input
                placeholder="e.g. 100234567890456"
                value={wabaId}
                onChange={(e) => setWabaId(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Permanent Access Token</Label>
              <div className="relative">
                <Input
                  type={showToken ? 'text' : 'password'}
                  placeholder="Enter your access token"
                  value={accessToken}
                  onChange={(e) => {
                    setAccessToken(e.target.value);
                    setTokenEdited(true);
                  }}
                  onFocus={() => {
                    if (accessToken === MASKED_TOKEN) {
                      setAccessToken('');
                      setTokenEdited(true);
                    }
                  }}
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showToken ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {config && !tokenEdited && (
                <p className="text-xs text-slate-500">
                  Token is hidden for security. Re-enter it to update configuration.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Webhook Verify Token</Label>
              <Input
                placeholder="Create a custom verify token"
                value={verifyToken}
                onChange={(e) => setVerifyToken(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              />
              <p className="text-xs text-slate-500">
                A custom string you create. Must match the token you set in Meta webhook settings.
              </p>
            </div>
          </CardContent>
        </Card>

        {connectionType === 'coexistence' && (
          <Card className="bg-slate-900 border-slate-700 ring-0 ring-transparent">
            <CardHeader>
              <CardTitle className="text-white">Coexistence Settings</CardTitle>
              <CardDescription className="text-slate-400">
                Control how WACRM reacts when staff reply from the WhatsApp Business App.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={pauseBotOnAppReply}
                  onChange={(e) => setPauseBotOnAppReply(e.target.checked)}
                  className="rounded border-slate-600"
                />
                Pause bot when human replies from Business App
              </label>
              <div className="space-y-2">
                <Label className="text-slate-300">Pause duration (hours)</Label>
                <Input
                  type="number"
                  min={1}
                  max={168}
                  value={botPauseHours}
                  onChange={(e) => setBotPauseHours(Number(e.target.value) || 24)}
                  className="bg-slate-800 border-slate-700 text-white w-24"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={automationOutsideHours}
                  onChange={(e) => setAutomationOutsideHours(e.target.checked)}
                  className="rounded border-slate-600"
                />
                Allow automation outside business hours (Mon–Fri 9–18 server time when off)
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={appSyncEnabled}
                  onChange={(e) => setAppSyncEnabled(e.target.checked)}
                  className="rounded border-slate-600"
                />
                App sync enabled
              </label>
              <div className="space-y-2">
                <Label className="text-slate-300">Default fallback message</Label>
                <Input
                  placeholder="Optional message when bot cannot reply"
                  value={fallbackMessage}
                  onChange={(e) => setFallbackMessage(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Webhook URL */}
        <Card className="bg-slate-900 border-slate-700 ring-0 ring-transparent">
          <CardHeader>
            <CardTitle className="text-white">Webhook Configuration</CardTitle>
            <CardDescription className="text-slate-400">
              Use this URL as your webhook callback in the Meta App Dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label className="text-slate-300">Webhook Callback URL</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={webhookUrl}
                  className="bg-slate-800 border-slate-700 text-slate-300 font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyWebhookUrl}
                  className="shrink-0 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
                >
                  <Copy className="size-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Configuration'
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleTestConnection}
            disabled={testing || !config}
            className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
          >
            {testing ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <Zap className="size-4" />
                Test API Connection
              </>
            )}
          </Button>
          {config && (
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={resetting}
              className="border-red-900 text-red-400 hover:text-red-300 hover:bg-red-950/40"
            >
              {resetting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                <>
                  <RotateCcw className="size-4" />
                  Reset Configuration
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Setup Instructions Sidebar */}
      <div>
        <Card className="bg-slate-900 border-slate-700 ring-0 ring-transparent">
          <CardHeader>
            <CardTitle className="text-white text-base">Setup Instructions</CardTitle>
            <CardDescription className="text-slate-400">
              Follow these steps to connect your WhatsApp Business API.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion>
              <AccordionItem className="border-slate-700">
                <AccordionTrigger className="text-slate-300 hover:text-white hover:no-underline">
                  <span className="flex items-center gap-2">
                    <span className="flex size-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">1</span>
                    Create a Meta App
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-slate-400">
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Go to <span className="text-primary">developers.facebook.com</span></li>
                    <li>Click &quot;My Apps&quot; and then &quot;Create App&quot;</li>
                    <li>Select &quot;Business&quot; as the app type</li>
                    <li>Fill in app details and create</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem className="border-slate-700">
                <AccordionTrigger className="text-slate-300 hover:text-white hover:no-underline">
                  <span className="flex items-center gap-2">
                    <span className="flex size-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">2</span>
                    Add WhatsApp Product
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-slate-400">
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>In your app dashboard, click &quot;Add Product&quot;</li>
                    <li>Find &quot;WhatsApp&quot; and click &quot;Set Up&quot;</li>
                    <li>Follow the setup wizard to link your business</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem className="border-slate-700">
                <AccordionTrigger className="text-slate-300 hover:text-white hover:no-underline">
                  <span className="flex items-center gap-2">
                    <span className="flex size-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">3</span>
                    Get API Credentials
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-slate-400">
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Go to WhatsApp &gt; API Setup</li>
                    <li>Copy your <strong className="text-slate-200">Phone Number ID</strong></li>
                    <li>Copy your <strong className="text-slate-200">WhatsApp Business Account ID</strong></li>
                    <li>Generate a <strong className="text-slate-200">Permanent Access Token</strong> from Business Settings &gt; System Users</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem className="border-slate-700">
                <AccordionTrigger className="text-slate-300 hover:text-white hover:no-underline">
                  <span className="flex items-center gap-2">
                    <span className="flex size-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">4</span>
                    Configure Webhooks
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-slate-400">
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Go to WhatsApp &gt; Configuration</li>
                    <li>Click &quot;Edit&quot; on the Webhook section</li>
                    <li>Paste the <strong className="text-slate-200">Webhook Callback URL</strong> from above</li>
                    <li>Enter the same <strong className="text-slate-200">Verify Token</strong> you set here</li>
                    <li>Subscribe to &quot;messages&quot; webhook field</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <div className="mt-4 pt-4 border-t border-slate-700">
              <a
                href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
              >
                <ExternalLink className="size-3.5" />
                Meta WhatsApp API Documentation
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
