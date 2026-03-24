"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { CheckCircle, Archive, Trash2 } from "lucide-react";

type Prayer = {
  id: string;
  userId: string;
  title: string;
  content: string;
  privacyLevel: string;
  groupId: string | null;
  status: string;
  answeredAt: string | null;
  createdAt: string;
  updatedAt: string;
  authorFirstName: string | null;
  authorEmail: string | null;
};

const privacyColors: Record<string, string> = {
  public: "bg-blue-600 text-white",
  group: "bg-yellow-600 text-white",
  private: "bg-red-600 text-white",
  anonymous: "bg-gray-600 text-white",
};

const statusColors: Record<string, string> = {
  active: "bg-green-600 text-white",
  answered: "bg-blue-600 text-white",
  archived: "bg-gray-500 text-white",
};

export default function AdminPrayerPage() {
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<Prayer | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchPrayers = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/prayer");
    if (res.ok) {
      const data = await res.json();
      setPrayers(data.prayers);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPrayers();
  }, [fetchPrayers]);

  async function updateStatus(prayer: Prayer, status: string) {
    const body: Record<string, unknown> = { status };
    if (status === "answered") {
      body.answeredAt = new Date().toISOString();
    }
    const res = await fetch(`/api/admin/prayer/${prayer.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const data = await res.json();
      setPrayers((prev) =>
        prev.map((p) =>
          p.id === prayer.id
            ? { ...p, status: data.prayer.status, answeredAt: data.prayer.answeredAt }
            : p
        )
      );
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await fetch(`/api/admin/prayer/${deleteTarget.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setPrayers((prev) => prev.filter((p) => p.id !== deleteTarget.id));
    }
    setDeleting(false);
    setDeleteTarget(null);
  }

  const filtered = prayers.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.content.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="mx-auto max-w-5xl p-6">
      <AdminPageHeader
        title="Prayer Moderation"
        description="Review and manage prayer requests"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search prayers..."
      >
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="answered">Answered</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </AdminPageHeader>

      {loading ? (
        <p className="mt-8 text-center text-muted-foreground">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="mt-8 text-center text-muted-foreground">
          No prayer requests found.
        </p>
      ) : (
        <div className="mt-6 space-y-3">
          {filtered.map((prayer) => (
            <Card key={prayer.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{prayer.title}</span>
                      <Badge className={privacyColors[prayer.privacyLevel] ?? ""}>
                        {prayer.privacyLevel}
                      </Badge>
                      <Badge className={statusColors[prayer.status] ?? ""}>
                        {prayer.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {prayer.content}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      By {prayer.authorFirstName || "Unknown"} ({prayer.authorEmail ?? "—"})
                      {" · "}
                      {format(new Date(prayer.createdAt), "MMM d, yyyy")}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {prayer.status !== "answered" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Mark Answered"
                        onClick={() => updateStatus(prayer, "answered")}
                      >
                        <CheckCircle className="h-4 w-4 text-blue-500" />
                      </Button>
                    )}
                    {prayer.status !== "archived" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Archive"
                        onClick={() => updateStatus(prayer, "archived")}
                      >
                        <Archive className="h-4 w-4 text-gray-500" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteTarget(prayer)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Prayer Request"
        description={`Are you sure you want to delete "${deleteTarget?.title ?? ""}"? This cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
