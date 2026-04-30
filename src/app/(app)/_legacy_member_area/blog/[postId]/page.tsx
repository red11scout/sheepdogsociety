"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, PenLine } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TipTapEditor } from "@/components/blog/tiptap-editor";

type Post = {
  id: string;
  title: string;
  content: object | null;
  excerpt: string | null;
  status: string;
  publishedAt: string | null;
  createdAt: string;
  authorId: string;
  authorFirstName: string;
  authorLastName: string;
  authorAvatarUrl: string | null;
};

export default function BlogPostPage() {
  const params = useParams();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/blog/${params.postId}`)
      .then((r) => r.json())
      .then((data) => setPost(data.post ?? null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params.postId]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <p className="text-muted-foreground">Post not found.</p>
      </div>
    );
  }

  const initials =
    (post.authorFirstName?.[0] ?? "") + (post.authorLastName?.[0] ?? "");

  return (
    <div className="mx-auto max-w-3xl p-6">
      <Link
        href="/blog"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        All Posts
      </Link>

      <article>
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <h1 className="text-3xl font-bold">{post.title}</h1>
            <Link href={`/blog/${post.id}/edit`}>
              <Button variant="ghost" size="icon">
                <PenLine className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          {post.status === "draft" && (
            <Badge variant="secondary" className="mt-2">
              Draft
            </Badge>
          )}
          <div className="mt-4 flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={post.authorAvatarUrl ?? undefined} />
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">
                {post.authorFirstName} {post.authorLastName}
              </p>
              <p className="text-xs text-muted-foreground">
                {format(
                  new Date(post.publishedAt ?? post.createdAt),
                  "MMMM d, yyyy"
                )}
              </p>
            </div>
          </div>
        </div>

        {post.content && (
          <div className="prose prose-invert max-w-none">
            <TipTapEditor content={post.content} editable={false} />
          </div>
        )}
      </article>
    </div>
  );
}
