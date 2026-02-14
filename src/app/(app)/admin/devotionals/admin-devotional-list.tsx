"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Plus, Minus, Sparkles } from "lucide-react";

type Devotional = {
  id: string;
  date: string;
  title: string;
  content: string;
  scriptureReference: string;
  scriptureText: string | null;
  prayerPrompt: string | null;
  discussionQuestions: string[] | null;
  isApproved: boolean;
  createdAt: Date;
};

export function AdminDevotionalList({
  initialDevotionals,
}: {
  initialDevotionals: Devotional[];
}) {
  const [devotionals, setDevotionals] =
    useState<Devotional[]>(initialDevotionals);
  const [selected, setSelected] = useState<Devotional | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit form state
  const [editTitle, setEditTitle] = useState("");
  const [editScriptureRef, setEditScriptureRef] = useState("");
  const [editScriptureText, setEditScriptureText] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editPrayerPrompt, setEditPrayerPrompt] = useState("");
  const [editQuestions, setEditQuestions] = useState<string[]>([]);
  const [editApproved, setEditApproved] = useState(false);

  function openEdit(devotional: Devotional) {
    setSelected(devotional);
    setEditTitle(devotional.title);
    setEditScriptureRef(devotional.scriptureReference);
    setEditScriptureText(devotional.scriptureText ?? "");
    setEditContent(devotional.content);
    setEditPrayerPrompt(devotional.prayerPrompt ?? "");
    setEditQuestions(devotional.discussionQuestions ?? []);
    setEditApproved(devotional.isApproved);
    setError(null);
    setDialogOpen(true);
  }

  function addQuestion() {
    setEditQuestions((prev) => [...prev, ""]);
  }

  function removeQuestion(index: number) {
    setEditQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  function updateQuestion(index: number, value: string) {
    setEditQuestions((prev) => prev.map((q, i) => (i === index ? value : q)));
  }

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/devotionals/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          content: editContent,
          scriptureReference: editScriptureRef,
          scriptureText: editScriptureText,
          prayerPrompt: editPrayerPrompt,
          discussionQuestions: editQuestions.filter((q) => q.trim() !== ""),
          isApproved: editApproved,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save");
      }

      const { devotional: updated } = await res.json();

      setDevotionals((prev) =>
        prev.map((d) => (d.id === updated.id ? updated : d))
      );
      setDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/devotional", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to generate");
      }

      const { devotional, alreadyExists } = await res.json();

      if (alreadyExists) {
        setError("A devotional already exists for today.");
        return;
      }

      setDevotionals((prev) => [devotional, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Manage Devotionals</h1>
        <Button onClick={handleGenerate} disabled={generating}>
          {generating ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Sparkles />
          )}
          {generating ? "Generating..." : "Generate Today's"}
        </Button>
      </div>

      {/* Top-level error */}
      {error && !dialogOpen && (
        <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Empty state */}
      {devotionals.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">
              No devotionals yet. Generate the first one to get started.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Devotional list */}
      <div className="space-y-3">
        {devotionals.map((d) => (
          <Card
            key={d.id}
            className="cursor-pointer transition-colors hover:bg-accent/50"
            onClick={() => openEdit(d)}
          >
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono text-muted-foreground">
                    {d.date}
                  </span>
                  <Separator orientation="vertical" className="h-4" />
                  <span className="text-sm text-muted-foreground truncate">
                    {d.scriptureReference}
                  </span>
                </div>
                <p className="mt-1 font-medium truncate">{d.title}</p>
              </div>
              <Badge
                variant={d.isApproved ? "default" : "secondary"}
                className={
                  d.isApproved
                    ? "bg-green-600 hover:bg-green-600"
                    : "bg-yellow-600 hover:bg-yellow-600 text-white"
                }
              >
                {d.isApproved ? "Approved" : "Pending"}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Devotional - {selected?.date}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">Title</label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Devotional title"
              />
            </div>

            {/* Scripture Reference */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Scripture Reference
              </label>
              <Input
                value={editScriptureRef}
                onChange={(e) => setEditScriptureRef(e.target.value)}
                placeholder="e.g. Proverbs 27:17"
              />
            </div>

            {/* Scripture Text */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Scripture Text
              </label>
              <Textarea
                value={editScriptureText}
                onChange={(e) => setEditScriptureText(e.target.value)}
                placeholder="Full text of the scripture passage"
                rows={3}
              />
            </div>

            {/* Content */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Content
              </label>
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="Devotional content"
                rows={8}
              />
            </div>

            {/* Prayer Prompt */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Prayer Prompt
              </label>
              <Textarea
                value={editPrayerPrompt}
                onChange={(e) => setEditPrayerPrompt(e.target.value)}
                placeholder="Prayer prompt for the reader"
                rows={3}
              />
            </div>

            {/* Discussion Questions */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm font-medium">
                  Discussion Questions
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addQuestion}
                >
                  <Plus className="size-3" />
                  Add
                </Button>
              </div>
              <div className="space-y-2">
                {editQuestions.map((q, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={q}
                      onChange={(e) => updateQuestion(i, e.target.value)}
                      placeholder={`Question ${i + 1}`}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeQuestion(i)}
                    >
                      <Minus className="size-3" />
                    </Button>
                  </div>
                ))}
                {editQuestions.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No questions yet. Click Add to create one.
                  </p>
                )}
              </div>
            </div>

            <Separator />

            {/* Approved toggle */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={editApproved}
                onClick={() => setEditApproved(!editApproved)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  editApproved ? "bg-green-600" : "bg-muted"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-lg ring-0 transition-transform ${
                    editApproved ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
              <label className="text-sm font-medium">
                {editApproved ? "Approved" : "Pending approval"}
              </label>
            </div>

            {/* Dialog error */}
            {error && dialogOpen && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
