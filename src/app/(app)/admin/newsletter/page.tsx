"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Download, Trash2, ToggleLeft, ToggleRight } from "lucide-react";

type Subscriber = {
  id: string;
  email: string;
  firstName: string | null;
  subscribedAt: string;
  isActive: boolean;
};

export default function AdminNewsletterPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Subscriber | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchSubscribers = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/newsletter");
    if (res.ok) {
      const data = await res.json();
      setSubscribers(data.subscribers);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSubscribers();
  }, [fetchSubscribers]);

  const totalCount = subscribers.length;
  const activeCount = subscribers.filter((s) => s.isActive).length;

  async function toggleActive(subscriber: Subscriber) {
    const res = await fetch(`/api/admin/newsletter/${subscriber.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !subscriber.isActive }),
    });
    if (res.ok) {
      const data = await res.json();
      setSubscribers((prev) =>
        prev.map((s) =>
          s.id === subscriber.id
            ? { ...s, isActive: data.subscriber.isActive }
            : s
        )
      );
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await fetch(`/api/admin/newsletter/${deleteTarget.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setSubscribers((prev) => prev.filter((s) => s.id !== deleteTarget.id));
    }
    setDeleting(false);
    setDeleteTarget(null);
  }

  function exportCsv() {
    window.open("/api/admin/newsletter/export", "_blank");
  }

  const filtered = subscribers.filter((s) =>
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-5xl p-6">
      <AdminPageHeader
        title="Newsletter Management"
        description="Manage newsletter subscribers"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by email..."
      >
        <Button variant="outline" size="sm" onClick={exportCsv}>
          <Download className="mr-1.5 h-4 w-4" />
          Export CSV
        </Button>
      </AdminPageHeader>

      {/* Stats Bar */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Subscribers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Subscribers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-500">{activeCount}</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <p className="mt-8 text-center text-muted-foreground">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="mt-8 text-center text-muted-foreground">
          No subscribers found.
        </p>
      ) : (
        <div className="mt-6 space-y-3">
          {filtered.map((subscriber) => (
            <Card key={subscriber.id}>
              <CardContent className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{subscriber.email}</span>
                    {subscriber.firstName && (
                      <span className="text-sm text-muted-foreground">
                        {subscriber.firstName}
                      </span>
                    )}
                    {subscriber.isActive ? (
                      <Badge className="bg-green-600 text-white">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Subscribed{" "}
                    {format(new Date(subscriber.subscribedAt), "MMM d, yyyy")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    title={subscriber.isActive ? "Deactivate" : "Activate"}
                    onClick={() => toggleActive(subscriber)}
                  >
                    {subscriber.isActive ? (
                      <ToggleRight className="h-4 w-4 text-green-500" />
                    ) : (
                      <ToggleLeft className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteTarget(subscriber)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Subscriber"
        description={`Are you sure you want to delete "${deleteTarget?.email ?? ""}"? This cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
