"use client";

/**
 * Recurring-series manager for /admin/events. Lists every live series
 * with its next dates; pause/resume, edit, or retire. Pattern edits
 * regenerate future instances server-side (the API decides; this
 * component only sends changed fields).
 */
import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { CalendarClock, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { NextDatesPreview } from "@/components/admin/next-dates-preview";
import type { SeriesPattern } from "@/lib/events/series";
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

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const EVENT_TYPES = ["weekly", "monthly", "quarterly", "annual", "conference"];
const NTH_LABELS = ["1st", "2nd", "3rd", "4th", "5th"];

type Cadence = "weekly" | "biweekly" | "monthly_nth_weekday";

export type AdminSeries = {
  id: string;
  title: string;
  description: string;
  location: string;
  cadence: Cadence;
  dayOfWeek: number;
  nthWeek: number | null;
  startTimeOfDay: string;
  durationMinutes: number | null;
  timezone: string;
  startDate: string;
  eventType: string;
  active: boolean;
  label: string;
  nextDates: string[];
  instanceCount: number;
};

export function SeriesPanel({ refreshSignal }: { refreshSignal: number }) {
  const [series, setSeries] = useState<AdminSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AdminSeries | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/event-series");
    const data = await res.json();
    setSeries(data.series ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, refreshSignal]);

  async function toggleActive(s: AdminSeries) {
    setBusy(true);
    await fetch(`/api/admin/event-series/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !s.active }),
    });
    setBusy(false);
    refresh();
  }

  async function handleDelete() {
    if (!deleteId) return;
    setBusy(true);
    await fetch(`/api/admin/event-series/${deleteId}`, { method: "DELETE" });
    setDeleteId(null);
    setBusy(false);
    refresh();
  }

  if (loading)
    return <p className="text-sm text-muted-foreground">Loading series...</p>;
  if (series.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-muted-foreground">
        Recurring series
      </h2>
      {series.map((s) => (
        <Card key={s.id}>
          <CardContent className="flex items-center justify-between gap-4 py-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 shrink-0 text-muted-foreground" />
                <h3 className="font-medium truncate">{s.title}</h3>
                <Badge variant={s.active ? "default" : "secondary"}>
                  {s.active ? s.label : "Paused"}
                </Badge>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span>
                  Next:{" "}
                  {s.nextDates.length > 0
                    ? s.nextDates
                        .map((d) => format(new Date(d), "MMM d"))
                        .join(", ")
                    : "none scheduled"}
                </span>
                <span>{s.instanceCount} on the calendar</span>
                {s.location && <span>{s.location}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => toggleActive(s)}
              >
                {s.active ? "Pause" : "Resume"}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setEditing(s)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDeleteId(s.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {editing && (
        <SeriesEditDialog
          series={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Retire Series"
        description="Future dates without photos or recaps are removed. Past gatherings and their photos stay."
        confirmLabel="Retire"
        confirmVariant="destructive"
        onConfirm={handleDelete}
        loading={busy}
      />
    </div>
  );
}

function SeriesEditDialog({
  series,
  onClose,
  onSaved,
}: {
  series: AdminSeries;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(series.title);
  const [description, setDescription] = useState(series.description);
  const [location, setLocation] = useState(series.location);
  const [cadence, setCadence] = useState<Cadence>(series.cadence);
  const [dayOfWeek, setDayOfWeek] = useState(String(series.dayOfWeek));
  const [nthWeek, setNthWeek] = useState(String(series.nthWeek ?? 1));
  const [startTimeOfDay, setStartTimeOfDay] = useState(series.startTimeOfDay);
  const [durationMinutes, setDurationMinutes] = useState(
    series.durationMinutes?.toString() ?? ""
  );
  const [startDate, setStartDate] = useState(series.startDate);
  const [eventType, setEventType] = useState(series.eventType);
  const [saving, setSaving] = useState(false);

  const previewPattern: SeriesPattern = {
    cadence,
    dayOfWeek: Number(dayOfWeek),
    nthWeek: cadence === "monthly_nth_weekday" ? Number(nthWeek) : null,
    startTimeOfDay,
    durationMinutes: durationMinutes ? Number(durationMinutes) : null,
    timezone: series.timezone,
    startDate,
  };

  async function save() {
    setSaving(true);
    // Send only what changed; the server regenerates future instances
    // only when a pattern field is present.
    const payload: Record<string, unknown> = {};
    if (title !== series.title) payload.title = title;
    if (description !== series.description) payload.description = description;
    if (location !== series.location) payload.location = location;
    if (cadence !== series.cadence) payload.cadence = cadence;
    if (Number(dayOfWeek) !== series.dayOfWeek)
      payload.dayOfWeek = Number(dayOfWeek);
    const nth = cadence === "monthly_nth_weekday" ? Number(nthWeek) : null;
    if (nth !== series.nthWeek) payload.nthWeek = nth;
    if (startTimeOfDay !== series.startTimeOfDay)
      payload.startTimeOfDay = startTimeOfDay;
    const dur = durationMinutes ? Number(durationMinutes) : null;
    if (dur !== series.durationMinutes) payload.durationMinutes = dur;
    if (startDate !== series.startDate) payload.startDate = startDate;
    if (eventType !== series.eventType) payload.eventType = eventType;

    if (Object.keys(payload).length > 0) {
      const res = await fetch(`/api/admin/event-series/${series.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setSaving(false);
        alert("Couldn't save the series. Check the fields and try again.");
        return;
      }
    }
    setSaving(false);
    onSaved();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Series</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Location</label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Repeats</label>
              <Select
                value={cadence}
                onValueChange={(v) => setCadence(v as Cadence)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Every other week</SelectItem>
                  <SelectItem value="monthly_nth_weekday">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Day</label>
              <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAY_NAMES.map((d, i) => (
                    <SelectItem key={d} value={String(i)}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {cadence === "monthly_nth_weekday" && (
            <div>
              <label className="text-sm font-medium">Which week</label>
              <Select value={nthWeek} onValueChange={setNthWeek}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NTH_LABELS.map((label, i) => (
                    <SelectItem key={label} value={String(i + 1)}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Start time</label>
              <Input
                type="time"
                value={startTimeOfDay}
                onChange={(e) => setStartTimeOfDay(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Duration (minutes)</label>
              <Input
                type="number"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                placeholder="Leave empty for open-ended"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Starts on/after</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Event type</label>
              <Select value={eventType} onValueChange={setEventType}>
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
          </div>
          <NextDatesPreview
            pattern={previewPattern}
            className="text-xs text-muted-foreground"
          />
          <p className="text-xs text-muted-foreground">
            Changing the schedule resets future dates that have no photos or
            recaps, including cancelled ones.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving || !title.trim()}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
