"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AdminPageIntro } from "@/components/admin/AdminPageIntro";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Mail, MailOpen, Trash2, CheckCircle2, Circle, Search } from "lucide-react";

type Contact = {
  id: string;
  name: string;
  email: string;
  topic: string | null;
  message: string;
  isRead: boolean;
  resolvedAt: string | null;
  createdAt: string;
};

export default function AdminContactsPage() {
  const [submissions, setSubmissions] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showResolved, setShowResolved] = useState(false);

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

  async function toggleResolved(contact: Contact) {
    const res = await fetch(`/api/admin/contacts/${contact.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolved: !contact.resolvedAt }),
    });
    if (res.ok) {
      const data = await res.json();
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === contact.id
            ? { ...s, resolvedAt: data.submission.resolvedAt }
            : s
        )
      );
      if (selectedContact?.id === contact.id) {
        setSelectedContact({
          ...selectedContact,
          resolvedAt: data.submission.resolvedAt,
        });
      }
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

  const resolvedCount = submissions.filter((s) => s.resolvedAt).length;

  const filtered = submissions
    .filter((s) => showResolved || !s.resolvedAt)
    .filter(
      (s) =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.email.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div className="mx-auto max-w-5xl p-6">
      <AdminPageIntro
        kicker="Inbox"
        title="What comes in through the site."
        description="Messages from the website. Read them, answer them, mark them done."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {unreadCount > 0
            ? `${unreadCount} unread message${unreadCount !== 1 ? "s" : ""}`
            : "All messages read"}
        </p>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {resolvedCount} resolved
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowResolved((v) => !v)}
        >
          {showResolved ? "Hide resolved" : "Show resolved"}
        </Button>
      </div>

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
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
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
                    {contact.resolvedAt && (
                      <Badge variant="secondary">resolved</Badge>
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
                <div className="flex flex-wrap shrink-0 items-center gap-2 sm:gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="min-h-11"
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
                    className="min-h-11"
                    title={contact.resolvedAt ? "Reopen" : "Mark resolved"}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleResolved(contact);
                    }}
                  >
                    {contact.resolvedAt ? (
                      <CheckCircle2 className="h-4 w-4 text-olive" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="min-h-11"
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
              <Button
                size="sm"
                variant={selectedContact.resolvedAt ? "ghost" : "default"}
                onClick={() => toggleResolved(selectedContact)}
              >
                {selectedContact.resolvedAt ? (
                  <>
                    <Circle className="mr-1 h-4 w-4" />
                    Reopen
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-1 h-4 w-4" />
                    Mark Resolved
                  </>
                )}
              </Button>
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
