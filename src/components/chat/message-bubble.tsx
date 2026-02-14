"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { MessageCircle } from "lucide-react";
import type { Message } from "@/lib/types";

const QUICK_REACTIONS = ["🙏", "❤️", "💪", "🔥", "📖"];

type MessageBubbleProps = {
  message: Message;
  onReact: (messageId: string, emoji: string) => void;
  onReply: (messageId: string) => void;
  showAuthor?: boolean;
};

export function MessageBubble({
  message,
  onReact,
  onReply,
  showAuthor = true,
}: MessageBubbleProps) {
  const author = message.author;
  const initials = author
    ? (author.firstName?.[0] ?? "") + (author.lastName?.[0] ?? "")
    : "?";

  const roleBadge =
    author?.role === "admin"
      ? "Admin"
      : author?.role === "group_leader"
        ? "Leader"
        : null;

  return (
    <div className="group relative flex gap-3 px-4 py-1.5 hover:bg-secondary/30">
      {showAuthor ? (
        <Avatar className="mt-0.5 h-8 w-8 flex-shrink-0">
          <AvatarImage src={author?.avatarUrl ?? undefined} />
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
      ) : (
        <div className="w-8 flex-shrink-0" />
      )}

      <div className="min-w-0 flex-1">
        {showAuthor && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">
              {author?.firstName} {author?.lastName}
            </span>
            {roleBadge && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {roleBadge}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(message.createdAt), {
                addSuffix: true,
              })}
            </span>
          </div>
        )}

        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          {message.content}
        </p>

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {message.reactions.map((r) => (
              <button
                key={r.emoji}
                onClick={() => onReact(message.id, r.emoji)}
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors ${
                  r.userReacted
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-border hover:bg-secondary"
                }`}
              >
                <span>{r.emoji}</span>
                <span>{r.count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Reply count */}
        {message.replyCount != null && message.replyCount > 0 && (
          <button
            onClick={() => onReply(message.id)}
            className="mt-1 flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <MessageCircle className="h-3 w-3" />
            {message.replyCount} {message.replyCount === 1 ? "reply" : "replies"}
          </button>
        )}
      </div>

      {/* Hover actions */}
      <div className="absolute right-2 top-0 hidden items-center gap-0.5 rounded-md border bg-card px-1 py-0.5 shadow-sm group-hover:flex">
        {QUICK_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onReact(message.id, emoji)}
            className="rounded p-1 text-sm hover:bg-secondary"
            title={`React with ${emoji}`}
          >
            {emoji}
          </button>
        ))}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onReply(message.id)}
          title="Reply in thread"
        >
          <MessageCircle className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
