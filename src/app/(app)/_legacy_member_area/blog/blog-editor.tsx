"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Send, Trash2, Sparkles, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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

  // AI Assist state
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [externalContent, setExternalContent] = useState<string | undefined>();

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

  async function handleAiGenerate() {
    setAiGenerating(true);
    setAiError(null);
    try {
      const res = await fetch("/api/ai/blog-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: aiTopic }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to generate");
      }
      const { draft } = await res.json();
      setTitle(draft.title);
      setExcerpt(draft.excerpt);
      setExternalContent(draft.content);
      setAiDialogOpen(false);
      setAiTopic("");
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Failed to generate");
    } finally {
      setAiGenerating(false);
    }
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setAiDialogOpen(true);
              setAiError(null);
              setAiTopic("");
            }}
          >
            <Sparkles className="mr-1 h-4 w-4" />
            AI Assist
          </Button>
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
        <TipTapEditor
          content={initialContent}
          onChange={setContent}
          externalContent={externalContent}
        />
      </div>

      {/* AI Assist Dialog */}
      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Generate Blog Draft with AI</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Describe your topic and AI will generate a full draft including
              title, excerpt, and content. You can edit everything before
              publishing.
            </p>
            {(title.trim() || content) && (
              <div className="rounded-md border border-yellow-500/50 bg-yellow-500/10 p-3 text-sm text-yellow-600 dark:text-yellow-400">
                This will replace your current title, excerpt, and content.
              </div>
            )}
            <Textarea
              value={aiTopic}
              onChange={(e) => setAiTopic(e.target.value)}
              placeholder="e.g. The importance of accountability in a man's walk with God"
              rows={3}
            />
            {aiError && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {aiError}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAiDialogOpen(false)}
              disabled={aiGenerating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAiGenerate}
              disabled={aiGenerating || !aiTopic.trim()}
            >
              {aiGenerating ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-1 h-4 w-4" />
                  Generate Draft
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
