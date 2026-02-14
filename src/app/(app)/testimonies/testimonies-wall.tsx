"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Sparkles, Plus, Check, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

type Testimony = {
  id: string;
  title: string;
  content: string;
  isApproved: boolean;
  createdAt: string;
  userId: string;
  authorFirstName: string;
  authorLastName: string;
  authorAvatarUrl: string | null;
};

export function TestimoniesWall({ currentUser }: { currentUser: AppUser }) {
  const [testimonies, setTestimonies] = useState<Testimony[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [creating, setCreating] = useState(false);
  const [showPending, setShowPending] = useState(false);

  const isAdmin = currentUser.role === "admin";

  function fetchTestimonies() {
    const params = isAdmin && showPending ? "?all=true" : "";
    fetch(`/api/testimonies${params}`)
      .then((r) => r.json())
      .then((data) => setTestimonies(data.testimonies ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    setLoading(true);
    fetchTestimonies();
  }, [showPending]);

  async function handleCreate() {
    setCreating(true);
    try {
      const res = await fetch("/api/testimonies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });
      if (res.ok) {
        setDialogOpen(false);
        setTitle("");
        setContent("");
        fetchTestimonies();
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleApprove(id: string, approve: boolean) {
    await fetch(`/api/testimonies/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isApproved: approve }),
    });
    fetchTestimonies();
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Testimonies</h1>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button
              variant={showPending ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowPending(!showPending)}
            >
              {showPending ? "All (Admin)" : "Approved"}
            </Button>
          )}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" />
                Share Testimony
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Share Your Testimony</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 text-sm font-medium">Title</label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="God's faithfulness in..."
                  />
                </div>
                <div>
                  <label className="mb-1 text-sm font-medium">
                    Your Testimony
                  </label>
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Share what God has done in your life..."
                    rows={6}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Your testimony will be reviewed by an admin before appearing
                  on the wall.
                </p>
                <Button
                  onClick={handleCreate}
                  disabled={!title.trim() || !content.trim() || creating}
                  className="w-full"
                >
                  {creating ? "Submitting..." : "Submit Testimony"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : testimonies.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <Sparkles className="h-12 w-12 text-bronze" />
            <p className="text-muted-foreground">
              No testimonies yet. Share what God has done.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {testimonies.map((t) => {
            const initials =
              (t.authorFirstName?.[0] ?? "") + (t.authorLastName?.[0] ?? "");

            return (
              <Card key={t.id}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <Avatar className="mt-0.5">
                      <AvatarImage src={t.authorAvatarUrl ?? undefined} />
                      <AvatarFallback>{initials || "?"}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{t.title}</h3>
                        {!t.isApproved && (
                          <Badge variant="secondary" className="text-xs">
                            Pending
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {t.authorFirstName} {t.authorLastName} ·{" "}
                        {format(new Date(t.createdAt), "MMM d, yyyy")}
                      </p>
                      <p className="mt-3 text-sm whitespace-pre-wrap leading-relaxed">
                        {t.content}
                      </p>
                      {isAdmin && !t.isApproved && (
                        <div className="mt-3 flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(t.id, true)}
                          >
                            <Check className="mr-1 h-4 w-4" />
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleApprove(t.id, false)}
                          >
                            <X className="mr-1 h-4 w-4" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
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
