"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Mail, MailOpen, Trash2 } from "lucide-react";

type Contact = {
  id: string;
  name: string;
  email: string;
  topic: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
};

export default function AdminContactsPage() {
  const [submissions, setSubmissions] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/contacts");
    if (res.ok) {
      const data = await res.json();
      setSubmissions(data.submissions);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  const unreadCount = submissions.filter((s) => !s.isRead).length;

  async function toggleRead(contact: Contact) {
    const res = await fetch(`/api/admin/contacts/${contact.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isRead: !contact.isRead }),
    });
    if (res.ok) {
      const data = await res.json();
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === contact.id ? { ...s, isRead: data.submission.isRead } : s
        )
      );
      if (selectedContact?.id === contact.id) {
        setSelectedContact({ ...selectedContact, isRead: data.submission.isRead });
      }
    }
  }

  function openMessage(contact: Contact) {
    setSelectedContact(contact);
    if (!contact.isRead) {
      toggleRead(contact);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await fetch(`/api/admin/contacts/${deleteTarget.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setSubmissions((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      if (selectedContact?.id === deleteTarget.id) {
        setSelectedContact(null);
      }
    }
    setDeleting(false);
    setDeleteTarget(null);
  }

  const filtered = submissions.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-5xl p-6">
      <AdminPageHeader
        title="Contact Inbox"
        description={unreadCount > 0 ? `${unreadCount} unread message${unreadCount !== 1 ? "s" : ""}` : "All messages read"}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name or email..."
      />

      {loading ? (
        <p className="mt-8 text-center text-muted-foreground">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="mt-8 text-center text-muted-foreground">
          No contact submissions found.
        </p>
      ) : (
        <div className="mt-6 space-y-3">
          {filtered.map((contact) => (
            <Card
              key={contact.id}
              className="cursor-pointer transition-colors hover:bg-accent/50"
              onClick={() => openMessage(contact)}
            >
              <CardContent className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`${!contact.isRead ? "font-bold" : "font-medium"}`}
                    >
                      {contact.name}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {contact.email}
                    </span>
                    {contact.topic && (
                      <Badge variant="outline">{contact.topic}</Badge>
                    )}
                    {!contact.isRead && (
                      <span className="h-2 w-2 rounded-full bg-blue-500" />
                    )}
                  </div>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {contact.message.length > 100
                      ? contact.message.slice(0, 100) + "..."
                      : contact.message}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {format(new Date(contact.createdAt), "MMM d, yyyy h:mm a")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    title={contact.isRead ? "Mark unread" : "Mark read"}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleRead(contact);
                    }}
                  >
                    {contact.isRead ? (
                      <MailOpen className="h-4 w-4" />
                    ) : (
                      <Mail className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(contact);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Full Message Dialog */}
      <Dialog
        open={!!selectedContact}
        onOpenChange={(open) => !open && setSelectedContact(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Message from {selectedContact?.name}</DialogTitle>
          </DialogHeader>
          {selectedContact && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                <span>{selectedContact.email}</span>
                {selectedContact.topic && (
                  <Badge variant="outline">{selectedContact.topic}</Badge>
                )}
                <span>
                  {format(
                    new Date(selectedContact.createdAt),
                    "MMM d, yyyy h:mm a"
                  )}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-sm">
                {selectedContact.message}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Submission"
        description={`Are you sure you want to delete the message from "${deleteTarget?.name ?? ""}"? This cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
