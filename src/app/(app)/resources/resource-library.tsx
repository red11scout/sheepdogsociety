"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  FolderOpen,
  Plus,
  Link2,
  FileText,
  Video,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { AppUser } from "@/lib/types";

type Resource = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  url: string | null;
  createdAt: string;
  uploaderFirstName: string;
  uploaderLastName: string;
};

export function ResourceLibrary({ currentUser }: { currentUser: AppUser }) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"link" | "file" | "video">("link");
  const [url, setUrl] = useState("");
  const [creating, setCreating] = useState(false);

  const canCreate =
    currentUser.role === "admin" ||
    currentUser.role === "group_leader" ||
    currentUser.role === "asst_leader";

  function fetchResources() {
    fetch("/api/resources")
      .then((r) => r.json())
      .then((data) => setResources(data.resources ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchResources();
  }, []);

  async function handleCreate() {
    setCreating(true);
    try {
      const res = await fetch("/api/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, type, url }),
      });
      if (res.ok) {
        setDialogOpen(false);
        setTitle("");
        setDescription("");
        setUrl("");
        fetchResources();
      }
    } finally {
      setCreating(false);
    }
  }

  const typeIcon = (t: string) => {
    switch (t) {
      case "link":
        return <Link2 className="h-4 w-4" />;
      case "video":
        return <Video className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Resources</h1>
        {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" />
                Add Resource
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Resource</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 text-sm font-medium">Title</label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Resource name"
                  />
                </div>
                <div>
                  <label className="mb-1 text-sm font-medium">Description</label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description..."
                    rows={2}
                  />
                </div>
                <div>
                  <label className="mb-1 text-sm font-medium">Type</label>
                  <div className="mt-1 flex gap-2">
                    {(["link", "video", "file"] as const).map((t) => (
                      <Button
                        key={t}
                        variant={type === t ? "default" : "outline"}
                        size="sm"
                        onClick={() => setType(t)}
                        className="capitalize"
                      >
                        {typeIcon(t)}
                        <span className="ml-1">{t}</span>
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-1 text-sm font-medium">URL</label>
                  <Input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
                <Button
                  onClick={handleCreate}
                  disabled={!title.trim() || creating}
                  className="w-full"
                >
                  {creating ? "Adding..." : "Add Resource"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading resources...</p>
      ) : resources.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <FolderOpen className="h-12 w-12 text-bronze" />
            <p className="text-muted-foreground">
              No resources shared yet. Leaders can add materials here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {resources.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-bronze/10 text-bronze">
                  {typeIcon(r.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{r.title}</p>
                    <Badge variant="secondary" className="text-xs capitalize">
                      {r.type}
                    </Badge>
                  </div>
                  {r.description && (
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {r.description}
                    </p>
                  )}
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {r.uploaderFirstName} {r.uploaderLastName} ·{" "}
                    {format(new Date(r.createdAt), "MMM d, yyyy")}
                  </p>
                </div>
                {r.url && (
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="ghost" size="icon">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
