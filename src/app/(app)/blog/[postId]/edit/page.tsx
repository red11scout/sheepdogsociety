"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { BlogEditor } from "../../blog-editor";

export default function EditBlogPostPage() {
  const params = useParams();
  const [post, setPost] = useState<{
    id: string;
    title: string;
    content: object | null;
    excerpt: string | null;
    status: string;
  } | null>(null);
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

  return (
    <BlogEditor
      postId={post.id}
      initialTitle={post.title}
      initialContent={post.content ?? undefined}
      initialExcerpt={post.excerpt ?? ""}
      initialStatus={post.status}
    />
  );
}
