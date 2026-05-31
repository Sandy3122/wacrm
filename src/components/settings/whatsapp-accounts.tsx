'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Plus,
  Smartphone,
  Trash2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface Account {
  id: string;
  name: string;
  provider_type: string;
  connection_type: string;
  phone_number_id: string | null;
  display_phone_number: string | null;
  status: string;
  webhook_status: string;
  has_credentials: boolean;
}

interface ProviderField {
  key: string;
  label: string;
  required: boolean;
  secret: boolean;
}

interface ProviderPreset {
  providerType: string;
  connectionType: string;
  label: string;
  fields: ProviderField[];
}

/**
 * WhatsApp Accounts manager (Sprint 2 + 6). Lists the workspace's
 * connected accounts and provides a provider-aware connect form. The
 * legacy single-config UI still lives in whatsapp-config.tsx for the
 * direct Meta onboarding flow; this is the multi-account surface.
 */
export function WhatsAppAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [presets, setPresets] = useState<ProviderPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('meta');
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const loadAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/whatsapp/accounts');
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
    fetch('/api/whatsapp/providers')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setPresets(data.presets ?? []))
      .catch(() => {});
  }, [loadAccounts]);

  const activePreset = presets.find((p) => p.providerType === selectedProvider);

  const onConnect = async () => {
    if (!activePreset) return;
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        provider_type: activePreset.providerType,
        connection_type: activePreset.connectionType,
        name: formValues.name,
      };
      for (const field of activePreset.fields) {
        if (formValues[field.key]) payload[field.key] = formValues[field.key];
      }
      const res = await fetch('/api/whatsapp/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to connect account');
        return;
      }
      toast.success('Account connected');
      setShowForm(false);
      setFormValues({});
      await loadAccounts();
    } catch {
      toast.error('Failed to connect account');
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm('Disconnect this WhatsApp account?')) return;
    const res = await fetch(`/api/whatsapp/accounts/${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Account disconnected');
      await loadAccounts();
    } else {
      toast.error('Failed to disconnect');
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="size-4" />
          WhatsApp Accounts
        </CardTitle>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus className="size-4" />
          Connect Account
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading accounts…
          </div>
        ) : accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No accounts connected yet. Connect a Meta Cloud API number or a BSP
            provider to start messaging.
          </p>
        ) : (
          <div className="space-y-2">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{acc.name}</span>
                    <Badge variant="outline">{acc.provider_type}</Badge>
                    <Badge variant="secondary">{acc.connection_type}</Badge>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {acc.display_phone_number ?? acc.phone_number_id ?? '—'}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <StatusBadge ok={acc.status === 'connected'} label="Connected" />
                    <StatusBadge
                      ok={acc.webhook_status === 'verified'}
                      label="Webhook"
                    />
                    <StatusBadge ok={acc.has_credentials} label="Credentials" />
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={loadAccounts}
                    aria-label="Refresh"
                  >
                    <RefreshCw className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onDelete(acc.id)}
                    aria-label="Disconnect"
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showForm ? (
          <div className="space-y-3 rounded-lg border border-border p-4">
            <div className="space-y-1.5">
              <Label>Provider</Label>
              <select
                value={selectedProvider}
                onChange={(e) => {
                  setSelectedProvider(e.target.value);
                  setFormValues({});
                }}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                {presets.map((p) => (
                  <option key={p.providerType} value={p.providerType}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>Account name</Label>
              <Input
                placeholder="e.g. Support line"
                value={formValues.name ?? ''}
                onChange={(e) =>
                  setFormValues((v) => ({ ...v, name: e.target.value }))
                }
              />
            </div>

            {activePreset?.fields.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label>
                  {field.label}
                  {field.required ? <span className="text-destructive"> *</span> : null}
                </Label>
                <Input
                  type={field.secret ? 'password' : 'text'}
                  value={formValues[field.key] ?? ''}
                  onChange={(e) =>
                    setFormValues((v) => ({ ...v, [field.key]: e.target.value }))
                  }
                />
              </div>
            ))}

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button onClick={onConnect} disabled={submitting}>
                {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
                Connect
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ${
        ok
          ? 'bg-emerald-500/10 text-emerald-500'
          : 'bg-slate-500/10 text-slate-400'
      }`}
    >
      {ok ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
      {label}
    </span>
  );
}
