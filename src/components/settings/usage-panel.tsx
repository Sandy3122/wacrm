'use client';

import { useEffect, useState } from 'react';
import { Gauge, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface UsageMetric {
  used: number;
  limit: number;
}

interface BillingData {
  plan: string;
  canManageBilling: boolean;
  usage: {
    messages_sent: UsageMetric;
    automation_runs: UsageMetric;
    broadcasts_sent: UsageMetric;
    whatsapp_accounts: UsageMetric;
    team_members: UsageMetric;
  };
}

const METRIC_LABELS: Record<string, string> = {
  messages_sent: 'Messages this month',
  automation_runs: 'Automation runs this month',
  broadcasts_sent: 'Broadcasts this month',
  whatsapp_accounts: 'WhatsApp accounts',
  team_members: 'Team members',
};

/**
 * Usage + plan panel (Sprint 7). Shows the active plan and per-metric
 * usage vs. limits for the workspace. Unlimited limits (-1) render as ∞.
 */
export function UsagePanel() {
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/billing')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading usage…
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">
          Usage data unavailable.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Gauge className="size-4" />
          Plan &amp; Usage
        </CardTitle>
        <Badge variant="outline" className="uppercase">
          {data.plan}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(data.usage).map(([key, metric]) => (
          <UsageBar
            key={key}
            label={METRIC_LABELS[key] ?? key}
            used={metric.used}
            limit={metric.limit}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function UsageBar({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number;
}) {
  const unlimited = limit < 0;
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / Math.max(1, limit)) * 100));
  const danger = !unlimited && pct >= 90;
  const warn = !unlimited && pct >= 70 && pct < 90;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {used.toLocaleString()} / {unlimited ? '∞' : limit.toLocaleString()}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${
            danger ? 'bg-destructive' : warn ? 'bg-amber-500' : 'bg-primary'
          }`}
          style={{ width: `${unlimited ? 4 : pct}%` }}
        />
      </div>
    </div>
  );
}
