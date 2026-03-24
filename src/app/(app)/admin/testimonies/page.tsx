"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Check, X } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

type Testimony = {
  id: string;
  title: string;
  content: string;
  isApproved: boolean;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  userId: string;
  authorFirstName: string | null;
  authorEmail: string | null;
};

export default function AdminTestimoniesPage() {
  const [testimonies, setTestimonies] = useState<Testimony[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pending");

  // Delete dialog
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function fetchTestimonies() {
    setLoading(true);
    const res = await fetch("/api/admin/testimonies");
    const data = await res.json();
    setTestimonies(data.testimonies ?? []);
    setLoading(false);
  }

  useEffect(() => {
    fetchTestimonies();
  }, []);

  async function handleApprove(id: string) {
    await fetch(`/api/admin/testimonies/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        isApproved: true,
        approvedBy: "current-admin",
        approvedAt: new Date().toISOString(),
      }),
    });
    fetchTestimonies();
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    await fetch(`/api/admin/testimonies/${deleteId}`, { method: "DELETE" });
    setDeleteId(null);
    setDeleting(false);
    fetchTestimonies();
  }

  const pending = testimonies.filter((t) => !t.isApproved);
  const approved = testimonies.filter((t) => t.isApproved);

  const getFiltered = () => {
    if (tab === "pending") return pending;
    if (tab === "approved") return approved;
    return testimonies;
  };

  const filtered = getFiltered();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Testimonies Moderation"
        description="Review and approve member testimonies"
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pending">
            Pending {pending.length > 0 && `(${pending.length})`}
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved {approved.length > 0 && `(${approved.length})`}
          </TabsTrigger>
          <TabsTrigger value="all">All ({testimonies.length})</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading testimonies...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No {tab === "all" ? "" : tab} testimonies found.
            </p>
          ) : (
            <div className="space-y-3">
              {filtered.map((t) => (
                <Card key={t.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{t.title}</CardTitle>
                      <Badge
                        variant={t.isApproved ? "default" : "secondary"}
                        className={
                          t.isApproved
                            ? "bg-green-600 hover:bg-green-700"
                            : "bg-yellow-600 hover:bg-yellow-700"
                        }
                      >
                        {t.isApproved ? "Approved" : "Pending"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">
                      {t.content.length > 150
                        ? t.content.slice(0, 150) + "..."
                        : t.content}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        <span>{t.authorFirstName ?? "Unknown"}</span>
                        <span className="mx-2">|</span>
                        <span>{format(new Date(t.createdAt), "MMM d, yyyy")}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {!t.isApproved && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-green-600 border-green-600 hover:bg-green-600 hover:text-white"
                            onClick={() => handleApprove(t.id)}
                          >
                            <Check className="mr-1 h-4 w-4" />
                            Approve
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive border-destructive hover:bg-destructive hover:text-white"
                          onClick={() => setDeleteId(t.id)}
                        >
                          <X className="mr-1 h-4 w-4" />
                          {t.isApproved ? "Delete" : "Reject"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete/Reject Confirmation */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Testimony"
        description="Are you sure you want to delete this testimony? This action cannot be undone."
        confirmLabel="Delete"
        confirmVariant="destructive"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
