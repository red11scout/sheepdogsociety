"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Trash2, Pencil, Users } from "lucide-react";
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

type EventItem = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startTime: string;
  endTime: string | null;
  isRecurring: boolean;
  recurrenceRule: string | null;
  eventType: string | null;
  imageUrl: string | null;
  maxAttendees: number | null;
  registrationUrl: string | null;
  groupId: string | null;
  createdBy: string;
  createdAt: string;
  rsvpCount: number;
};

const EVENT_TYPES = ["weekly", "monthly", "quarterly", "annual", "conference"];

const typeColors: Record<string, string> = {
  weekly: "bg-blue-600 hover:bg-blue-700",
  monthly: "bg-purple-600 hover:bg-purple-700",
  quarterly: "bg-orange-600 hover:bg-orange-700",
  annual: "bg-green-600 hover:bg-green-700",
  conference: "bg-red-600 hover:bg-red-700",
};

export default function AdminEventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  // Create/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formStartTime, setFormStartTime] = useState("");
  const [formEndTime, setFormEndTime] = useState("");
  const [formEventType, setFormEventType] = useState("weekly");
  const [formMaxAttendees, setFormMaxAttendees] = useState("");
  const [formRegUrl, setFormRegUrl] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete dialog
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function fetchEvents() {
    setLoading(true);
    const res = await fetch("/api/admin/events");
    const data = await res.json();
    setEvents(data.events ?? []);
    setLoading(false);
  }

  useEffect(() => {
    fetchEvents();
  }, []);

  function openCreate() {
    setEditingId(null);
    setFormTitle("");
    setFormDesc("");
    setFormLocation("");
    setFormStartTime("");
    setFormEndTime("");
    setFormEventType("weekly");
    setFormMaxAttendees("");
    setFormRegUrl("");
    setDialogOpen(true);
  }

  function openEdit(ev: EventItem) {
    setEditingId(ev.id);
    setFormTitle(ev.title);
    setFormDesc(ev.description ?? "");
    setFormLocation(ev.location ?? "");
    setFormStartTime(
      ev.startTime ? format(new Date(ev.startTime), "yyyy-MM-dd'T'HH:mm") : ""
    );
    setFormEndTime(
      ev.endTime ? format(new Date(ev.endTime), "yyyy-MM-dd'T'HH:mm") : ""
    );
    setFormEventType(ev.eventType ?? "weekly");
    setFormMaxAttendees(ev.maxAttendees?.toString() ?? "");
    setFormRegUrl(ev.registrationUrl ?? "");
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!formTitle.trim() || !formStartTime) return;
    setSaving(true);

    const payload = {
      title: formTitle,
      description: formDesc,
      location: formLocation,
      startTime: formStartTime,
      endTime: formEndTime || undefined,
      eventType: formEventType,
      maxAttendees: formMaxAttendees ? parseInt(formMaxAttendees, 10) : null,
      registrationUrl: formRegUrl,
    };

    if (editingId) {
      await fetch(`/api/admin/events/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    setDialogOpen(false);
    setSaving(false);
    fetchEvents();
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    await fetch(`/api/admin/events/${deleteId}`, { method: "DELETE" });
    setDeleteId(null);
    setDeleting(false);
    fetchEvents();
  }

  const filtered = events.filter((ev) => {
    const matchesSearch = ev.title.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || ev.eventType === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Events Management"
        description="Create and manage events"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search events by title..."
        onCreateClick={openCreate}
        createLabel="New Event"
      >
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Event Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {EVENT_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </AdminPageHeader>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading events...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No events found.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((ev) => (
            <Card key={ev.id}>
              <CardContent className="flex items-center justify-between gap-4 py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium truncate">{ev.title}</h3>
                    <Badge
                      className={typeColors[ev.eventType ?? "weekly"] ?? "bg-gray-600"}
                    >
                      {ev.eventType ?? "weekly"}
                    </Badge>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>
                      {format(new Date(ev.startTime), "MMM d, yyyy h:mm a")}
                    </span>
                    {ev.location && <span>{ev.location}</span>}
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {ev.rsvpCount} RSVP{ev.rsvpCount !== 1 && "s"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(ev)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteId(ev.id)}
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
            <DialogTitle>{editingId ? "Edit Event" : "Create New Event"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Event title"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Event description..."
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Location</label>
              <Input
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
                placeholder="Event location"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Start Time</label>
                <Input
                  type="datetime-local"
                  value={formStartTime}
                  onChange={(e) => setFormStartTime(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">End Time</label>
                <Input
                  type="datetime-local"
                  value={formEndTime}
                  onChange={(e) => setFormEndTime(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Event Type</label>
              <Select value={formEventType} onValueChange={setFormEventType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Max Attendees</label>
              <Input
                type="number"
                value={formMaxAttendees}
                onChange={(e) => setFormMaxAttendees(e.target.value)}
                placeholder="Leave empty for unlimited"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Registration URL</label>
              <Input
                value={formRegUrl}
                onChange={(e) => setFormRegUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !formTitle.trim() || !formStartTime}>
              {saving ? "Saving..." : editingId ? "Save Changes" : "Create Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Event"
        description="Are you sure you want to delete this event? All RSVPs will also be removed."
        confirmLabel="Delete"
        confirmVariant="destructive"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
