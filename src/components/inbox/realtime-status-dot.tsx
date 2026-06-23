"use client";

import { cn } from "@/lib/utils";

interface RealtimeStatusDotProps {
  /** Live websocket state from `useRealtime().isConnected`. */
  connected: boolean;
  /** Hide the text label and show only the dot (tight headers / mobile). */
  compact?: boolean;
  className?: string;
}

/**
 * At-a-glance realtime health for the inbox. Green + "Live" when the
 * Supabase Realtime socket is subscribed (new messages arrive on their
 * own); amber + pulsing + "Connecting…" while it's down or retrying
 * (the hook auto-reconnects with backoff, and the parent refetches on
 * reconnect, so this is informational rather than an error).
 */
export function RealtimeStatusDot({
  connected,
  compact = false,
  className,
}: RealtimeStatusDotProps) {
  const label = connected ? "Live" : "Connecting…";
  return (
    <span
      className={cn("inline-flex items-center gap-1.5", className)}
      title={connected ? "Realtime connected" : "Realtime reconnecting…"}
      aria-live="polite"
    >
      <span className="relative flex h-2 w-2">
        {!connected && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
        )}
        <span
          className={cn(
            "relative inline-flex h-2 w-2 rounded-full",
            connected ? "bg-emerald-500" : "bg-amber-500",
          )}
        />
      </span>
      {!compact && (
        <span
          className={cn(
            "text-[10px] font-medium",
            connected ? "text-emerald-400" : "text-amber-400",
          )}
        >
          {label}
        </span>
      )}
    </span>
  );
}
