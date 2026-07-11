"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Trash2, Pencil, Users, Plus, Search } from "lucide-react";
import { AdminPageIntro } from "@/components/admin/AdminPageIntro";
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
import { SeriesPanel } from "./series-panel";
import {
  NextDatesPreview,
  seriesPatternFromLocalStart,
} from "@/components/admin/next-dates-preview";

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
  seriesId: string | null;
  isCancelled: boolean;
};

const EVENT_TYPES = ["weekly", "monthly", "quarterly", "annual", "conference"];

const typeColors: Record<string, string> = {
  weekly: "bg-blue-600 hover:bg-blue-700",
  monthly: "bg-purple-600 hover:bg-purple-700",
  quarterly: "bg-orange-600 hover:bg-orange-700",
  annual: "bg-green-600 hover:bg-green-700",
  conference: "bg-red-600 hover:bg-red-700",
};

// Admin inputs are Eastern-time wall clock; the series stores the zone.
const REPEAT_OPTIONS = [
  { value: "none", label: "Does not repeat" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every other week" },
  { value: "monthly_nth_weekday", label: "Monthly (same weekday)" },
];

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
  // "none" | "weekly" | "biweekly" | "monthly_nth_weekday"
  const [formRepeats, setFormRepeats] = useState("none");
  const [seriesRefresh, setSeriesRefresh] = useState(0);
  // Snapshot of the form at openEdit time; handleSave diff-sends only
  // changed fields so unchanged local datetimes never get re-parsed
  // server-side (and series instances never falsely detach).
  const [editSnapshot, setEditSnapshot] = useState<Record<string, string> | null>(null);
  const [cancelTarget, setCancelTarget] = useState<EventItem | null>(null);

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
    setFormRepeats("none");
    setEditSnapshot(null);
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
    setFormRepeats("none");
    setEditSnapshot({
      title: ev.title,
      description: ev.description ?? "",
      location: ev.location ?? "",
      startTime: ev.startTime
        ? format(new Date(ev.startTime), "yyyy-MM-dd'T'HH:mm")
        : "",
      endTime: ev.endTime
        ? format(new Date(ev.endTime), "yyyy-MM-dd'T'HH:mm")
        : "",
      eventType: ev.eventType ?? "weekly",
      maxAttendees: ev.maxAttendees?.toString() ?? "",
      registrationUrl: ev.registrationUrl ?? "",
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!formTitle.trim() || !formStartTime) return;
    setSaving(true);

    let res: Response;
    if (!editingId && formRepeats !== "none") {
      // Recurring: derive the pattern from the first gathering's
      // datetime-local value (interpreted as Eastern wall clock).
      const startLocal = new Date(formStartTime);
      const durationMinutes =
        formEndTime && new Date(formEndTime) > startLocal
          ? Math.round(
              (new Date(formEndTime).getTime() - startLocal.getTime()) / 60000
            )
          : null;
      res = await fetch("/api/admin/event-series", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formTitle,
          description: formDesc,
          location: formLocation,
          cadence: formRepeats,
          dayOfWeek: startLocal.getDay(),
          nthWeek:
            formRepeats === "monthly_nth_weekday"
              ? Math.ceil(startLocal.getDate() / 7)
              : null,
          startTimeOfDay: formStartTime.slice(11, 16),
          durationMinutes,
          timezone: "America/New_York",
          startDate: formStartTime.slice(0, 10),
          eventType: formEventType,
          registrationUrl: formRegUrl,
        }),
      });
      setSeriesRefresh((n) => n + 1);
    } else if (editingId) {
      // Diff-send: only fields the admin actually changed.
      const current: Record<string, string> = {
        title: formTitle,
        description: formDesc,
        location: formLocation,
        startTime: formStartTime,
        endTime: formEndTime,
        eventType: formEventType,
        maxAttendees: formMaxAttendees,
        registrationUrl: formRegUrl,
      };
      const payload: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(current)) {
        if (!editSnapshot || editSnapshot[key] !== value) {
          if (key === "endTime") payload.endTime = value || undefined;
          else if (key === "maxAttendees")
            payload.maxAttendees = value ? parseInt(value, 10) : null;
          else payload[key] = value;
        }
      }
      if (Object.keys(payload).length === 0) {
        setDialogOpen(false);
        setSaving(false);
        return;
      }
      res = await fetch(`/api/admin/events/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formTitle,
          description: formDesc,
          location: formLocation,
          startTime: formStartTime,
          endTime: formEndTime || undefined,
          eventType: formEventType,
          maxAttendees: formMaxAttendees ? parseInt(formMaxAttendees, 10) : null,
          registrationUrl: formRegUrl,
        }),
      });
    }

    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: unknown };
      alert(typeof j.error === "string" ? j.error : "Couldn't save the event.");
      setSaving(false);
      return;
    }

    setDialogOpen(false);
    setSaving(false);
    fetchEvents();
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    const res = await fetch(`/api/admin/events/${deleteId}`, { method: "DELETE" });
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: unknown };
      alert(typeof j.error === "string" ? j.error : "Couldn't delete the event.");
      setDeleting(false);
      return;
    }
    setDeleteId(null);
    setDeleting(false);
    fetchEvents();
  }

  async function handleCancelDate() {
    if (!cancelTarget) return;
    await fetch(`/api/admin/events/${cancelTarget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isCancelled: !cancelTarget.isCancelled }),
    });
    setCancelTarget(null);
    fetchEvents();
  }

  const filtered = events.filter((ev) => {
    const matchesSearch = ev.title.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || ev.eventType === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      <AdminPageIntro
        kicker="Events"
        title="Every gathering, one calendar."
        description="Add a gathering, keep a recurring series going, and see who's coming."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search events by title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="min-h-11 w-full sm:w-[140px]">
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
        </div>
        <Button onClick={openCreate} size="sm" className="min-h-11">
          <Plus className="mr-1.5 h-4 w-4" />
          Add event
        </Button>
      </div>

      <SeriesPanel refreshSignal={seriesRefresh} />

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading events...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No events found.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((ev) => (
            <Card key={ev.id}>
              <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium truncate">{ev.title}</h3>
                    <Badge
                      className={typeColors[ev.eventType ?? "weekly"] ?? "bg-gray-600"}
                    >
                      {ev.eventType ?? "weekly"}
                    </Badge>
                    {ev.seriesId && <Badge variant="outline">Series</Badge>}
                    {ev.isCancelled && (
                      <Badge variant="destructive">Cancelled</Badge>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>
                      {format(new Date(ev.startTime), "MMM d, yyyy h:mm a")}
                    </span>
                    {ev.location && <span className="break-words">{ev.location}</span>}
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {ev.rsvpCount} RSVP{ev.rsvpCount !== 1 && "s"}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {ev.seriesId && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="min-h-11"
                      onClick={() => setCancelTarget(ev)}
                    >
                      {ev.isCancelled ? "Restore date" : "Cancel date"}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="min-h-11"
                    onClick={() => openEdit(ev)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="min-h-11"
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
            {!editingId && (
              <div>
                <label className="text-sm font-medium">Repeats</label>
                <Select value={formRepeats} onValueChange={setFormRepeats}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REPEAT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <NextDatesPreview
                  pattern={seriesPatternFromLocalStart(formRepeats, formStartTime)}
                  className="mt-1 text-xs text-muted-foreground"
                />
                {formRepeats !== "none" && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Dates are created 8 weeks ahead, Eastern time, and topped
                    up daily.
                  </p>
                )}
              </div>
            )}
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

      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        title={cancelTarget?.isCancelled ? "Restore This Date" : "Cancel This Date"}
        description={
          cancelTarget?.isCancelled
            ? "This date returns to the public calendar."
            : "This date comes off the public calendar. The series keeps going."
        }
        confirmLabel={cancelTarget?.isCancelled ? "Restore" : "Cancel date"}
        confirmVariant={cancelTarget?.isCancelled ? "default" : "destructive"}
        onConfirm={handleCancelDate}
        loading={false}
      />
    </div>
  );
}
