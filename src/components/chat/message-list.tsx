"use client";

import { useEffect, useRef } from "react";
import { MessageBubble } from "./message-bubble";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { Message } from "@/lib/types";

type MessageListProps = {
  messages: Message[];
  loading: boolean;
  hasMore: boolean;
  typingUsers: string[];
  onReact: (messageId: string, emoji: string) => void;
  onReply: (messageId: string) => void;
  onLoadMore: () => void;
};

export function MessageList({
  messages,
  loading,
  hasMore,
  typingUsers,
  onReact,
  onReply,
  onLoadMore,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Determine which messages need author shown (first in group)
  function shouldShowAuthor(msg: Message, idx: number): boolean {
    if (idx === 0) return true;
    const prev = messages[idx - 1];
    if (prev.userId !== msg.userId) return true;
    // Show author if more than 5 minutes apart
    const diff =
      new Date(msg.createdAt).getTime() -
      new Date(prev.createdAt).getTime();
    return diff > 5 * 60 * 1000;
  }

  return (
    <div ref={containerRef} className="flex flex-1 flex-col overflow-y-auto">
      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center py-2">
          <Button variant="ghost" size="sm" onClick={onLoadMore}>
            <Loader2 className="mr-2 h-3 w-3" />
            Load earlier messages
          </Button>
        </div>
      )}

      {/* Messages */}
      {messages.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          No messages yet. Start the conversation.
        </div>
      ) : (
        <div className="py-2">
          {messages.map((msg, idx) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              showAuthor={shouldShowAuthor(msg, idx)}
              onReact={onReact}
              onReply={onReply}
            />
          ))}
        </div>
      )}

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="px-4 py-1 text-xs text-muted-foreground">
          {typingUsers.join(", ")}{" "}
          {typingUsers.length === 1 ? "is" : "are"} typing...
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
