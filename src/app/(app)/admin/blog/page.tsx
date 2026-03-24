"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Star, Pencil, Trash2 } from "lucide-react";
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

type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  status: "draft" | "published";
  category: string | null;
  isFeatured: boolean;
  publishedAt: string | null;
  createdAt: string;
  authorId: string;
  authorFirstName: string | null;
  authorLastName: string | null;
};

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createExcerpt, setCreateExcerpt] = useState("");
  const [createCategory, setCreateCategory] = useState("");
  const [creating, setCreating] = useState(false);

  // Delete dialog
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function fetchPosts() {
    setLoading(true);
    const res = await fetch("/api/admin/blog");
    const data = await res.json();
    setPosts(data.posts ?? []);
    setLoading(false);
  }

  useEffect(() => {
    fetchPosts();
  }, []);

  async function handleCreate() {
    if (!createTitle.trim()) return;
    setCreating(true);
    await fetch("/api/admin/blog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: createTitle,
        excerpt: createExcerpt,
        category: createCategory,
      }),
    });
    setCreateOpen(false);
    setCreateTitle("");
    setCreateExcerpt("");
    setCreateCategory("");
    setCreating(false);
    fetchPosts();
  }

  async function toggleStatus(post: BlogPost) {
    const newStatus = post.status === "draft" ? "published" : "draft";
    await fetch(`/api/admin/blog/${post.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchPosts();
  }

  async function toggleFeatured(post: BlogPost) {
    await fetch(`/api/admin/blog/${post.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFeatured: !post.isFeatured }),
    });
    fetchPosts();
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    await fetch(`/api/admin/blog/${deleteId}`, { method: "DELETE" });
    setDeleteId(null);
    setDeleting(false);
    fetchPosts();
  }

  const filtered = posts.filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Blog Management"
        description="Create, edit, and manage blog posts"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search posts by title..."
        onCreateClick={() => setCreateOpen(true)}
        createLabel="New Post"
      >
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
          </SelectContent>
        </Select>
      </AdminPageHeader>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading posts...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No posts found.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((post) => (
            <Card key={post.id}>
              <CardContent className="flex items-center justify-between gap-4 py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleFeatured(post)}
                      className="shrink-0"
                      title={post.isFeatured ? "Remove featured" : "Mark featured"}
                    >
                      <Star
                        className={`h-4 w-4 ${
                          post.isFeatured
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-muted-foreground"
                        }`}
                      />
                    </button>
                    <h3 className="font-medium truncate">{post.title}</h3>
                    <Badge
                      variant={post.status === "published" ? "default" : "secondary"}
                      className={
                        post.status === "published"
                          ? "bg-green-600 hover:bg-green-700"
                          : "bg-yellow-600 hover:bg-yellow-700"
                      }
                    >
                      {post.status}
                    </Badge>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>
                      {post.authorFirstName} {post.authorLastName}
                    </span>
                    {post.category && <span>{post.category}</span>}
                    <span>{format(new Date(post.createdAt), "MMM d, yyyy")}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleStatus(post)}
                  >
                    {post.status === "draft" ? "Publish" : "Unpublish"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteId(post.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Post</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                placeholder="Post title"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Excerpt</label>
              <Textarea
                value={createExcerpt}
                onChange={(e) => setCreateExcerpt(e.target.value)}
                placeholder="Short description..."
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Category</label>
              <Input
                value={createCategory}
                onChange={(e) => setCreateCategory(e.target.value)}
                placeholder="e.g. Devotional, Leadership"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating || !createTitle.trim()}>
              {creating ? "Creating..." : "Create Post"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Post"
        description="Are you sure you want to delete this blog post? This action cannot be undone."
        confirmLabel="Delete"
        confirmVariant="destructive"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
