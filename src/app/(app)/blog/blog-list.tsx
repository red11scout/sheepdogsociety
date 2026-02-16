"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Plus, FileText, PenLine } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { AppUser } from "@/lib/types";

type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  status: string;
  publishedAt: string | null;
  createdAt: string;
  authorId: string;
  authorFirstName: string;
  authorLastName: string;
  authorAvatarUrl: string | null;
};

export function BlogList({ currentUser }: { currentUser: AppUser }) {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  const canWrite = currentUser.role === "admin";

  useEffect(() => {
    fetch("/api/blog")
      .then((r) => r.json())
      .then((data) => setPosts(data.posts ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Blog</h1>
        {canWrite && (
          <Link href="/blog/new">
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" />
              New Post
            </Button>
          </Link>
        )}
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading posts...</p>
      ) : posts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <FileText className="h-12 w-12 text-bronze" />
            <p className="text-muted-foreground">
              No posts yet. Be the first to share.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => {
            const initials =
              (post.authorFirstName?.[0] ?? "") +
              (post.authorLastName?.[0] ?? "");
            return (
              <Card key={post.id} className="overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <Link
                        href={`/blog/${post.id}`}
                        className="text-lg font-semibold hover:text-primary"
                      >
                        {post.title}
                      </Link>
                      {post.status === "draft" && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          Draft
                        </Badge>
                      )}
                      {post.excerpt && (
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                          {post.excerpt}
                        </p>
                      )}
                      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Avatar className="h-5 w-5">
                            <AvatarImage
                              src={post.authorAvatarUrl ?? undefined}
                            />
                            <AvatarFallback className="text-[10px]">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <span>
                            {post.authorFirstName} {post.authorLastName}
                          </span>
                        </div>
                        <span>
                          {format(
                            new Date(post.publishedAt ?? post.createdAt),
                            "MMM d, yyyy"
                          )}
                        </span>
                      </div>
                    </div>
                    {post.authorId === currentUser.id && (
                      <Link href={`/blog/${post.id}/edit`}>
                        <Button variant="ghost" size="icon">
                          <PenLine className="h-4 w-4" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
