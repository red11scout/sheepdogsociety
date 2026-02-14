"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  HandHeart,
  Plus,
  Heart,
  Check,
  Archive,
  Filter,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AppUser } from "@/lib/types";

type PrayerRequest = {
  id: string;
  title: string;
  content: string;
  privacyLevel: string;
  groupId: string | null;
  status: string;
  answeredAt: string | null;
  createdAt: string;
  userId: string | null;
  authorFirstName: string;
  authorLastName: string;
  authorAvatarUrl: string | null;
  prayerCount: number;
  userPrayed: boolean;
};

type SimpleGroup = { id: string; name: string };

export function PrayerWall({
  currentUser,
  myGroups,
}: {
  currentUser: AppUser;
  myGroups: SimpleGroup[];
}) {
  const [requests, setRequests] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [privacy, setPrivacy] = useState<string>("public");
  const [groupId, setGroupId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [statusFilter, setStatusFilter] = useState("active");
  const [viewFilter, setViewFilter] = useState("all"); // "all" | "mine"

  function fetchRequests() {
    const params = new URLSearchParams({
      status: statusFilter,
      filter: viewFilter,
    });
    fetch(`/api/prayer?${params}`)
      .then((r) => r.json())
      .then((data) => setRequests(data.requests ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    setLoading(true);
    fetchRequests();
  }, [statusFilter, viewFilter]);

  async function handleCreate() {
    setCreating(true);
    try {
      const res = await fetch("/api/prayer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, privacyLevel: privacy, groupId }),
      });
      if (res.ok) {
        setDialogOpen(false);
        setTitle("");
        setContent("");
        setPrivacy("public");
        setGroupId(null);
        fetchRequests();
      }
    } finally {
      setCreating(false);
    }
  }

  async function handlePray(requestId: string) {
    await fetch(`/api/prayer/${requestId}`, { method: "POST" });
    fetchRequests();
  }

  async function handleMarkAnswered(requestId: string) {
    await fetch(`/api/prayer/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "answered" }),
    });
    fetchRequests();
  }

  async function handleArchive(requestId: string) {
    await fetch(`/api/prayer/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "archived" }),
    });
    fetchRequests();
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Prayer Wall</h1>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="mr-1 h-4 w-4" />
                {statusFilter === "active"
                  ? "Active"
                  : statusFilter === "answered"
                    ? "Answered"
                    : "Archived"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setStatusFilter("active")}>
                Active
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("answered")}>
                Answered
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("archived")}>
                Archived
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant={viewFilter === "mine" ? "secondary" : "outline"}
            size="sm"
            onClick={() =>
              setViewFilter(viewFilter === "mine" ? "all" : "mine")
            }
          >
            {viewFilter === "mine" ? "My Requests" : "All"}
          </Button>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" />
                Request Prayer
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Prayer Request</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 text-sm font-medium">Title</label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="What do you need prayer for?"
                  />
                </div>
                <div>
                  <label className="mb-1 text-sm font-medium">Details</label>
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Share as much or as little as you like..."
                    rows={4}
                  />
                </div>
                <div>
                  <label className="mb-1 text-sm font-medium">Privacy</label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {(
                      [
                        { value: "public", label: "Public" },
                        { value: "anonymous", label: "Anonymous" },
                        { value: "private", label: "Only Me" },
                        ...(myGroups.length > 0
                          ? [{ value: "group", label: "My Group" }]
                          : []),
                      ] as const
                    ).map((opt) => (
                      <Button
                        key={opt.value}
                        variant={privacy === opt.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPrivacy(opt.value)}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                </div>
                {privacy === "group" && myGroups.length > 0 && (
                  <div>
                    <label className="mb-1 text-sm font-medium">Group</label>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {myGroups.map((g) => (
                        <Button
                          key={g.id}
                          variant={groupId === g.id ? "default" : "outline"}
                          size="sm"
                          onClick={() => setGroupId(g.id)}
                        >
                          {g.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                <Button
                  onClick={handleCreate}
                  disabled={!title.trim() || !content.trim() || creating}
                  className="w-full"
                >
                  {creating ? "Submitting..." : "Submit Prayer Request"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <HandHeart className="h-12 w-12 text-bronze" />
            <p className="text-muted-foreground">
              {statusFilter === "active"
                ? "No active prayer requests. Bear one another's burdens."
                : `No ${statusFilter} prayer requests.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => {
            const initials =
              (r.authorFirstName?.[0] ?? "") + (r.authorLastName?.[0] ?? "");
            const isOwner = r.userId === currentUser.id;

            return (
              <Card key={r.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="mt-0.5 h-8 w-8">
                      <AvatarImage src={r.authorAvatarUrl ?? undefined} />
                      <AvatarFallback className="text-xs">
                        {initials || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{r.title}</p>
                        {r.privacyLevel !== "public" && (
                          <Badge variant="secondary" className="text-xs capitalize">
                            {r.privacyLevel}
                          </Badge>
                        )}
                        {r.status === "answered" && (
                          <Badge className="bg-green-600 text-xs">
                            Answered
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {r.authorFirstName} {r.authorLastName}
                        {" · "}
                        {format(new Date(r.createdAt), "MMM d, yyyy")}
                      </p>
                      <p className="mt-2 text-sm whitespace-pre-wrap">
                        {r.content}
                      </p>
                      <div className="mt-3 flex items-center gap-3">
                        <Button
                          variant={r.userPrayed ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePray(r.id)}
                        >
                          <Heart
                            className={`mr-1 h-4 w-4 ${r.userPrayed ? "fill-current" : ""}`}
                          />
                          Praying ({r.prayerCount})
                        </Button>
                        {isOwner && r.status === "active" && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkAnswered(r.id)}
                            >
                              <Check className="mr-1 h-4 w-4" />
                              Answered
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleArchive(r.id)}
                            >
                              <Archive className="mr-1 h-4 w-4" />
                              Archive
                            </Button>
                          </>
                        )}
                      </div>
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
