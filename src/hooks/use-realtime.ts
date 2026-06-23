"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { createClient, ensureRealtimeAuth } from "@/lib/supabase/client";
import type { Message, Conversation } from "@/types";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface RealtimeEvent<T> {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: T;
  old: Partial<T>;
}

interface UseRealtimeOptions {
  channelName: string;
  onMessageEvent?: (event: RealtimeEvent<Message>) => void;
  onConversationEvent?: (event: RealtimeEvent<Conversation>) => void;
  enabled?: boolean;
}

export function useRealtime({
  channelName,
  onMessageEvent,
  onConversationEvent,
  enabled = true,
}: UseRealtimeOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Store latest callbacks in refs to avoid re-subscribing when the
  // parent re-renders with fresh closures. Assigned inside an effect
  // so the mutation doesn't happen during render (React 19's refs
  // rule) — subscribers only read `.current` inside async Realtime
  // callbacks, which always run after the render that updates it.
  const onMessageRef = useRef(onMessageEvent);
  const onConversationRef = useRef(onConversationEvent);
  useEffect(() => {
    onMessageRef.current = onMessageEvent;
    onConversationRef.current = onConversationEvent;
  });

  useEffect(() => {
    if (!enabled) return;

    const supabase = createClient();
    let channel: RealtimeChannel | null = null;
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;

    const subscribe = async () => {
      if (cancelled) return;

      // Authenticate the socket BEFORE joining — postgres_changes enforces
      // RLS using the websocket's JWT, and a channel that joins before the
      // session is restored stays silently dead for the session (see
      // ensureRealtimeAuth). REST queries keep working, which is why a
      // manual refetch surfaces messages realtime appeared to "miss".
      //
      // Wrapped so an auth hiccup can't abort the async fn before the
      // channel is even created (which would leave the dot stuck on amber
      // with no retry, since the retry lives in the subscribe callback).
      try {
        await ensureRealtimeAuth();
      } catch (e) {
        console.warn(`[realtime] ${channelName} ensureRealtimeAuth failed:`, e);
      }
      if (cancelled) return;

      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "messages" },
          (payload) => {
            onMessageRef.current?.({
              eventType:
                payload.eventType as RealtimeEvent<Message>["eventType"],
              new: payload.new as Message,
              old: payload.old as Partial<Message>,
            });
          }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "conversations" },
          (payload) => {
            onConversationRef.current?.({
              eventType:
                payload.eventType as RealtimeEvent<Conversation>["eventType"],
              new: payload.new as Conversation,
              old: payload.old as Partial<Conversation>,
            });
          }
        )
        .subscribe((status, err) => {
          // Temporary diagnostic — logs every transition so a stuck
          // "Connecting…" dot can be traced to its exact cause.
          console.info(
            `[realtime] ${channelName} → ${status}`,
            err ? (err.message ?? err) : "",
          );
          if (status === "SUBSCRIBED") {
            attempt = 0;
            setIsConnected(true);
            return;
          }

          setIsConnected(false);

          // CHANNEL_ERROR / TIMED_OUT — usually an auth/RLS rejection or a
          // transient socket drop. Tear down and rebuild with a fresh token
          // (backoff capped at 15s) so a cold-start race or expired token
          // doesn't leave the inbox stuck on stale data until a reload.
          // CLOSED fires on normal teardown too, so it's excluded from retry.
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            if (err) {
              console.warn(
                `[realtime] ${channelName} ${status}:`,
                err.message ?? err
              );
            }
            if (channel) {
              supabase.removeChannel(channel);
              channel = null;
            }
            const delay = Math.min(1000 * 2 ** attempt, 15000);
            attempt += 1;
            retryTimer = setTimeout(subscribe, delay);
          }
        });

      channelRef.current = channel;
    };

    void subscribe();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (channel) supabase.removeChannel(channel);
      channelRef.current = null;
      setIsConnected(false);
    };
  }, [channelName, enabled]);

  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      const supabase = createClient();
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      setIsConnected(false);
    }
  }, []);

  return { isConnected, unsubscribe };
}
