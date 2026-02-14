"use client";

import { useCallback } from "react";
import { useRealtimeMessages } from "@/hooks/use-realtime-messages";
import { MessageList } from "@/components/chat/message-list";
import { MessageInput } from "@/components/chat/message-input";
import { Hash, Lock } from "lucide-react";

type ChannelViewProps = {
  channelId: string;
  channelName: string;
  channelType: string;
  currentUserId: string;
  currentUserName: string;
};

export function ChannelView({
  channelId,
  channelName,
  channelType,
  currentUserId,
  currentUserName,
}: ChannelViewProps) {
  const {
    messages,
    loading,
    hasMore,
    typingUsers,
    sendMessage,
    sendTyping,
    loadMore,
  } = useRealtimeMessages(channelId);

  const handleSend = useCallback(
    (content: string) => {
      sendMessage(content);
    },
    [sendMessage]
  );

  const handleTyping = useCallback(() => {
    sendTyping(currentUserName);
  }, [sendTyping, currentUserName]);

  const handleReact = useCallback(
    async (messageId: string, emoji: string) => {
      await fetch(`/api/messages/${messageId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
    },
    []
  );

  const handleReply = useCallback(
    (messageId: string) => {
      // TODO: Open thread panel
      console.log("Reply to", messageId);
    },
    []
  );

  const filteredTyping = typingUsers.filter((u) => u !== currentUserName);

  return (
    <div className="flex h-full flex-col">
      {/* Channel Header */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        {channelType === "leaders" ? (
          <Lock className="h-5 w-5 text-muted-foreground" />
        ) : (
          <Hash className="h-5 w-5 text-muted-foreground" />
        )}
        <h2 className="text-lg font-semibold">{channelName}</h2>
      </div>

      {/* Messages */}
      <MessageList
        messages={messages}
        loading={loading}
        hasMore={hasMore}
        typingUsers={filteredTyping}
        onReact={handleReact}
        onReply={handleReply}
        onLoadMore={loadMore}
      />

      {/* Input */}
      <MessageInput
        onSend={handleSend}
        onTyping={handleTyping}
        placeholder={`Message #${channelName}`}
      />
    </div>
  );
}
