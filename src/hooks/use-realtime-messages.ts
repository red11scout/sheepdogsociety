"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { Message } from "@/lib/types";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function useRealtimeMessages(channelId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Fetch initial messages
  useEffect(() => {
    setLoading(true);
    setMessages([]);

    fetch(`/api/channels/${channelId}`)
      .then((r) => r.json())
      .then((data) => {
        setMessages(data.messages ?? []);
        setHasMore(data.hasMore ?? false);
        setNextCursor(data.nextCursor ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [channelId]);

  // Subscribe to real-time messages
  useEffect(() => {
    const channel = supabase.channel(`chat:${channelId}`);

    channel
      .on("broadcast", { event: "new_message" }, ({ payload }) => {
        setMessages((prev) => [...prev, payload as Message]);
      })
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const username = payload.username as string;
        setTypingUsers((prev) => {
          if (prev.includes(username)) return prev;
          return [...prev, username];
        });
        // Remove typing indicator after 3 seconds
        setTimeout(() => {
          setTypingUsers((prev) => prev.filter((u) => u !== username));
        }, 3000);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [channelId]);

  // Also listen for postgres changes on messages table
  useEffect(() => {
    const channel = supabase
      .channel(`db:messages:${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        () => {
          // Refresh messages on DB insert (backup for broadcast)
          // Only if the message isn't already in our local state
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [channelId]);

  const sendMessage = useCallback(
    async (content: string, parentMessageId?: string) => {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId, content, parentMessageId }),
      });

      if (!res.ok) return null;

      const data = await res.json();
      const newMessage = data.message as Message;

      // Add to local state optimistically
      setMessages((prev) => [...prev, newMessage]);

      // Broadcast to other clients
      channelRef.current?.send({
        type: "broadcast",
        event: "new_message",
        payload: newMessage,
      });

      return newMessage;
    },
    [channelId]
  );

  const sendTyping = useCallback(
    (username: string) => {
      channelRef.current?.send({
        type: "broadcast",
        event: "typing",
        payload: { username },
      });
    },
    []
  );

  const loadMore = useCallback(async () => {
    if (!hasMore || !nextCursor) return;

    const res = await fetch(
      `/api/channels/${channelId}?cursor=${encodeURIComponent(nextCursor)}`
    );
    const data = await res.json();

    setMessages((prev) => [...(data.messages ?? []), ...prev]);
    setHasMore(data.hasMore ?? false);
    setNextCursor(data.nextCursor ?? null);
  }, [channelId, hasMore, nextCursor]);

  return {
    messages,
    loading,
    hasMore,
    typingUsers,
    sendMessage,
    sendTyping,
    loadMore,
  };
}
