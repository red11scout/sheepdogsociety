"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Trash2, Pencil, Globe, Lock } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Resource = {
  id: string;
  title: string;
  description: string | null;
  type: "link" | "file" | "video";
  url: string | null;
  fileKey: string | null;
  uploadedBy: string;
  groupId: string | null;
  isPublic: boolean;
  category: string | null;
  level: string | null;
  seriesName: string | null;
  createdAt: string;
};

const RESOURCE_TYPES = ["link", "file", "video"] as const;
const CATEGORIES = ["general", "study_guide", "book", "reference"];
const LEVELS = ["all", "entry", "mid", "advanced"];

const typeColors: Record<string, string> = {
  link: "bg-blue-600 hover:bg-blue-700",
  file: "bg-green-600 hover:bg-green-700",
  video: "bg-purple-600 hover:bg-purple-700",
};

export default function AdminResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");

  // Create/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formType, setFormType] = useState<"link" | "file" | "video">("link");
  const [formUrl, setFormUrl] = useState("");
  const [formCategory, setFormCategory] = useState("general");
  const [formLevel, setFormLevel] = useState("all");
  const [formIsPublic, setFormIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);

  // Delete dialog
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function fetchResources() {
    setLoading(true);
    const res = await fetch("/api/admin/resources");
    const data = await res.json();
    setResources(data.resources ?? []);
    setLoading(false);
  }

  useEffect(() => {
    fetchResources();
  }, []);

  function openCreate() {
    setEditingId(null);
    setFormTitle("");
    setFormDesc("");
    setFormType("link");
    setFormUrl("");
    setFormCategory("general");
    setFormLevel("all");
    setFormIsPublic(false);
    setDialogOpen(true);
  }

  function openEdit(r: Resource) {
    setEditingId(r.id);
    setFormTitle(r.title);
    setFormDesc(r.description ?? "");
    setFormType(r.type);
    setFormUrl(r.url ?? "");
    setFormCategory(r.category ?? "general");
    setFormLevel(r.level ?? "all");
    setFormIsPublic(r.isPublic);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!formTitle.trim()) return;
    setSaving(true);

    const payload = {
      title: formTitle,
      description: formDesc,
      type: formType,
      url: formUrl,
      category: formCategory,
      level: formLevel,
      isPublic: formIsPublic,
    };

    if (editingId) {
      await fetch(`/api/admin/resources/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/admin/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    setDialogOpen(false);
    setSaving(false);
    fetchResources();
  }

  async function togglePublic(r: Resource) {
    await fetch(`/api/admin/resources/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublic: !r.isPublic }),
    });
    fetchResources();
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    await fetch(`/api/admin/resources/${deleteId}`, { method: "DELETE" });
    setDeleteId(null);
    setDeleting(false);
    fetchResources();
  }

  const filtered = resources.filter((r) => {
    const matchesSearch = r.title.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || r.type === typeFilter;
    const matchesCategory = categoryFilter === "all" || r.category === categoryFilter;
    const matchesLevel = levelFilter === "all" || r.level === levelFilter;
    return matchesSearch && matchesType && matchesCategory && matchesLevel;
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Resources Management"
        description="Manage learning resources and materials"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search resources by title..."
        onCreateClick={openCreate}
        createLabel="New Resource"
      >
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {RESOURCE_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={levelFilter} onValueChange={setLevelFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            {LEVELS.map((l) => (
              <SelectItem key={l} value={l}>
                {l.charAt(0).toUpperCase() + l.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </AdminPageHeader>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading resources...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No resources found.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex items-center justify-between gap-4 py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium truncate">{r.title}</h3>
                    <Badge className={typeColors[r.type]}>{r.type}</Badge>
                    {r.category && r.category !== "general" && (
                      <Badge variant="outline">{r.category.replace("_", " ")}</Badge>
                    )}
                    {r.level && r.level !== "all" && (
                      <Badge variant="outline">{r.level}</Badge>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {format(new Date(r.createdAt), "MMM d, yyyy")}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => togglePublic(r)}
                    title={r.isPublic ? "Make private" : "Make public"}
                  >
                    {r.isPublic ? (
                      <Globe className="h-4 w-4 text-green-500" />
                    ) : (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(r)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteId(r.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Resource" : "Create New Resource"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Resource title"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Resource description..."
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Type</label>
              <Select
                value={formType}
                onValueChange={(v) => setFormType(v as "link" | "file" | "video")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESOURCE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">URL</label>
              <Input
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Category</label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Level</label>
                <Select value={formLevel} onValueChange={setFormLevel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEVELS.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l.charAt(0).toUpperCase() + l.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPublic"
                checked={formIsPublic}
                onChange={(e) => setFormIsPublic(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="isPublic" className="text-sm font-medium">
                Make publicly accessible
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !formTitle.trim()}>
              {saving ? "Saving..." : editingId ? "Save Changes" : "Create Resource"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Resource"
        description="Are you sure you want to delete this resource? This action cannot be undone."
        confirmLabel="Delete"
        confirmVariant="destructive"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
