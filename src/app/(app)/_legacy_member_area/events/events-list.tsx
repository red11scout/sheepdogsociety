"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  Calendar,
  Plus,
  MapPin,
  Clock,
  Users,
  Check,
  HelpCircle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

type Event = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startTime: string;
  endTime: string | null;
  goingCount: number;
  maybeCount: number;
  userRsvp: string | null;
};

export function EventsList({ currentUser }: { currentUser: AppUser }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [creating, setCreating] = useState(false);

  const canCreate =
    currentUser.role === "admin" ||
    currentUser.role === "group_leader" ||
    currentUser.role === "asst_leader";

  function fetchEvents() {
    fetch("/api/events")
      .then((r) => r.json())
      .then((data) => setEvents(data.events ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchEvents();
  }, []);

  async function handleCreate() {
    setCreating(true);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          location,
          startTime: new Date(startTime).toISOString(),
          endTime: endTime ? new Date(endTime).toISOString() : undefined,
        }),
      });
      if (res.ok) {
        setDialogOpen(false);
        setTitle("");
        setDescription("");
        setLocation("");
        setStartTime("");
        setEndTime("");
        fetchEvents();
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleRsvp(eventId: string, status: "going" | "maybe" | "declined") {
    await fetch(`/api/events/${eventId}/rsvp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchEvents();
  }

  const now = new Date();
  const upcoming = events.filter((e) => new Date(e.startTime) >= now);
  const past = events.filter((e) => new Date(e.startTime) < now);

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Events</h1>
        {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" />
                New Event
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Event</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 text-sm font-medium">Title</label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Men's Breakfast"
                  />
                </div>
                <div>
                  <label className="mb-1 text-sm font-medium">Description</label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What's happening..."
                    rows={3}
                  />
                </div>
                <div>
                  <label className="mb-1 text-sm font-medium">Location</label>
                  <Input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Fellowship Hall"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 text-sm font-medium">Start</label>
                    <Input
                      type="datetime-local"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1 text-sm font-medium">End</label>
                    <Input
                      type="datetime-local"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                </div>
                <Button
                  onClick={handleCreate}
                  disabled={!title.trim() || !startTime || creating}
                  className="w-full"
                >
                  {creating ? "Creating..." : "Create Event"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading events...</p>
      ) : events.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <Calendar className="h-12 w-12 text-bronze" />
            <p className="text-muted-foreground">No events yet. Stay tuned.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Upcoming
              </h2>
              <div className="space-y-3">
                {upcoming.map((e) => (
                  <EventCard key={e.id} event={e} onRsvp={handleRsvp} />
                ))}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Past
              </h2>
              <div className="space-y-3">
                {past.map((e) => (
                  <EventCard key={e.id} event={e} onRsvp={handleRsvp} isPast />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EventCard({
  event,
  onRsvp,
  isPast,
}: {
  event: Event;
  onRsvp: (id: string, status: "going" | "maybe" | "declined") => void;
  isPast?: boolean;
}) {
  const start = new Date(event.startTime);

  return (
    <Card className={isPast ? "opacity-60" : ""}>
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Date badge */}
          <div className="flex h-14 w-14 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary">
            <span className="text-xs font-semibold uppercase">
              {format(start, "MMM")}
            </span>
            <span className="text-xl font-bold leading-none">
              {format(start, "d")}
            </span>
          </div>

          <div className="flex-1">
            <h3 className="font-semibold">{event.title}</h3>
            {event.description && (
              <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">
                {event.description}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(start, "h:mm a")}
                {event.endTime &&
                  ` – ${format(new Date(event.endTime), "h:mm a")}`}
              </span>
              {event.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {event.location}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {event.goingCount} going
                {event.maybeCount > 0 && `, ${event.maybeCount} maybe`}
              </span>
            </div>

            {!isPast && (
              <div className="mt-3 flex items-center gap-2">
                <Button
                  size="sm"
                  variant={event.userRsvp === "going" ? "default" : "outline"}
                  onClick={() => onRsvp(event.id, "going")}
                >
                  <Check className="mr-1 h-3 w-3" />
                  Going
                </Button>
                <Button
                  size="sm"
                  variant={event.userRsvp === "maybe" ? "default" : "outline"}
                  onClick={() => onRsvp(event.id, "maybe")}
                >
                  <HelpCircle className="mr-1 h-3 w-3" />
                  Maybe
                </Button>
                <Button
                  size="sm"
                  variant={event.userRsvp === "declined" ? "default" : "outline"}
                  onClick={() => onRsvp(event.id, "declined")}
                >
                  <X className="mr-1 h-3 w-3" />
                  Decline
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
