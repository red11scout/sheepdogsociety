"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Send, Trash2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TipTapEditor } from "@/components/blog/tiptap-editor";

type BlogEditorProps = {
  postId?: string;
  initialTitle?: string;
  initialContent?: object;
  initialExcerpt?: string;
  initialStatus?: string;
};

export function BlogEditor({
  postId,
  initialTitle = "",
  initialContent,
  initialExcerpt = "",
  initialStatus = "draft",
}: BlogEditorProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState<object | undefined>(initialContent);
  const [excerpt, setExcerpt] = useState(initialExcerpt);
  const [saving, setSaving] = useState(false);
  const isEdit = !!postId;

  async function handleSave(status: "draft" | "published") {
    setSaving(true);
    try {
      const url = isEdit ? `/api/blog/${postId}` : "/api/blog";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, excerpt, status }),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/blog/${data.post.id}`);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!postId || !confirm("Delete this post?")) return;
    await fetch(`/api/blog/${postId}`, { method: "DELETE" });
    router.push("/blog");
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Blog
        </Link>
        <div className="flex items-center gap-2">
          {isEdit && (
            <Button variant="ghost" size="sm" onClick={handleDelete}>
              <Trash2 className="mr-1 h-4 w-4" />
              Delete
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            disabled={!title.trim() || saving}
            onClick={() => handleSave("draft")}
          >
            <Save className="mr-1 h-4 w-4" />
            {saving ? "Saving..." : "Save Draft"}
          </Button>
          <Button
            size="sm"
            disabled={!title.trim() || saving}
            onClick={() => handleSave("published")}
          >
            <Send className="mr-1 h-4 w-4" />
            Publish
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Post title"
          className="text-2xl font-bold border-none bg-transparent px-0 focus-visible:ring-0"
        />
        <Input
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          placeholder="Brief excerpt (optional)"
          className="border-none bg-transparent px-0 text-muted-foreground focus-visible:ring-0"
        />
        <TipTapEditor content={initialContent} onChange={setContent} />
      </div>
    </div>
  );
}
