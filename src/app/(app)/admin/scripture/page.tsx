"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Pencil, Trash2, Check, X } from "lucide-react";

type ScriptureEntry = {
  id: string;
  date: string;
  reference: string;
  text: string | null;
  translation: string;
  theme: string | null;
  reflection: string | null;
  seriesId: string | null;
  seriesName: string | null;
  dayInSeries: number | null;
  isApproved: boolean;
  createdAt: string;
};

export default function AdminScripturePage() {
  const [entries, setEntries] = useState<ScriptureEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ScriptureEntry | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ScriptureEntry | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [formDate, setFormDate] = useState("");
  const [formReference, setFormReference] = useState("");
  const [formText, setFormText] = useState("");
  const [formTranslation, setFormTranslation] = useState("ESV");
  const [formTheme, setFormTheme] = useState("");
  const [formReflection, setFormReflection] = useState("");

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/scripture");
    if (res.ok) {
      const data = await res.json();
      setEntries(data.entries);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  function resetForm() {
    setFormDate("");
    setFormReference("");
    setFormText("");
    setFormTranslation("ESV");
    setFormTheme("");
    setFormReflection("");
  }

  function openCreate() {
    setEditing(null);
    resetForm();
    setDialogOpen(true);
  }

  function openEdit(entry: ScriptureEntry) {
    setEditing(entry);
    setFormDate(entry.date);
    setFormReference(entry.reference);
    setFormText(entry.text ?? "");
    setFormTranslation(entry.translation);
    setFormTheme(entry.theme ?? "");
    setFormReflection(entry.reflection ?? "");
    setDialogOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (editing) {
        const res = await fetch(`/api/admin/scripture/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: formDate,
            reference: formReference,
            text: formText,
            translation: formTranslation,
            theme: formTheme,
            reflection: formReflection,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setEntries((prev) =>
            prev.map((e) => (e.id === editing.id ? data.entry : e))
          );
        }
      } else {
        const res = await fetch("/api/admin/scripture", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: formDate,
            reference: formReference,
            text: formText,
            translation: formTranslation,
            theme: formTheme,
            reflection: formReflection,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setEntries((prev) => [data.entry, ...prev]);
        }
      }
      setDialogOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function toggleApproved(entry: ScriptureEntry) {
    const res = await fetch(`/api/admin/scripture/${entry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isApproved: !entry.isApproved }),
    });
    if (res.ok) {
      const data = await res.json();
      setEntries((prev) =>
        prev.map((e) => (e.id === entry.id ? data.entry : e))
      );
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await fetch(`/api/admin/scripture/${deleteTarget.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setEntries((prev) => prev.filter((e) => e.id !== deleteTarget.id));
    }
    setDeleting(false);
    setDeleteTarget(null);
  }

  const filtered = entries.filter(
    (e) =>
      e.reference.toLowerCase().includes(search.toLowerCase()) ||
      (e.theme ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-5xl p-6">
      <AdminPageHeader
        title="Scripture Management"
        description="Manage daily scripture entries"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by reference or theme..."
        onCreateClick={openCreate}
        createLabel="Add Scripture"
      />

      {loading ? (
        <p className="mt-8 text-center text-muted-foreground">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="mt-8 text-center text-muted-foreground">
          No scripture entries found.
        </p>
      ) : (
        <div className="mt-6 space-y-3">
          {filtered.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      {entry.date}
                    </span>
                    <span className="font-semibold">{entry.reference}</span>
                    {entry.theme && (
                      <Badge variant="outline">{entry.theme}</Badge>
                    )}
                    <Badge variant="secondary">{entry.translation}</Badge>
                    {entry.isApproved ? (
                      <Badge className="bg-green-600 text-white">
                        Approved
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-yellow-500">
                        Pending
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleApproved(entry)}
                    title={entry.isApproved ? "Unapprove" : "Approve"}
                  >
                    {entry.isApproved ? (
                      <X className="h-4 w-4" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(entry)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteTarget(entry)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Scripture" : "Add Scripture"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Date</label>
              <Input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Reference
              </label>
              <Input
                placeholder="e.g. Psalm 23:1-6"
                value={formReference}
                onChange={(e) => setFormReference(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Text</label>
              <Textarea
                placeholder="Scripture text..."
                value={formText}
                onChange={(e) => setFormText(e.target.value)}
                rows={4}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Translation
              </label>
              <Input
                placeholder="ESV"
                value={formTranslation}
                onChange={(e) => setFormTranslation(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Theme</label>
              <Input
                placeholder="e.g. Faith, Courage"
                value={formTheme}
                onChange={(e) => setFormTheme(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Reflection
              </label>
              <Textarea
                placeholder="Reflection on the passage..."
                value={formReflection}
                onChange={(e) => setFormReflection(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !formDate || !formReference}>
              {saving ? "Saving..." : editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Scripture Entry"
        description={`Are you sure you want to delete the scripture entry for "${deleteTarget?.reference ?? ""}"? This cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
