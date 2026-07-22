"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Check, X, MapPin, Mail, Phone, Crosshair, Clock } from "lucide-react";

type LocationRequest = {
  id: string;
  requesterName: string;
  requesterEmail: string;
  requesterPhone: string | null;
  proposedGroupName: string | null;
  proposedCity: string;
  proposedState: string;
  address: string | null;
  zipCode: string | null;
  meetingPlace: string | null;
  meetingDay: string | null;
  meetingTime: string | null;
  latitude: string | null;
  longitude: string | null;
  createdGroupId: string | null;
  proposedMeetingDetails: string | null;
  reason: string | null;
  status: string;
  createdAt: Date;
};

export function AdminLocationRequests({
  requests: initialRequests,
}: {
  requests: LocationRequest[];
}) {
  const [requests, setRequests] = useState(initialRequests);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleAction(id: string, status: "approved" | "declined") {
    setBusyId(id);
    setErrors((e) => ({ ...e, [id]: "" }));
    try {
      const res = await fetch("/api/admin/location-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        setRequests((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status } : r))
        );
      } else {
        const data = await res.json().catch(() => null);
        setErrors((e) => ({
          ...e,
          [id]: data?.error ?? "That did not go through. Try again.",
        }));
      }
    } catch {
      setErrors((e) => ({
        ...e,
        [id]: "That did not go through. Try again.",
      }));
    }
    setBusyId(null);
  }

  const pending = requests.filter((r) => r.status === "pending");
  const reviewed = requests.filter((r) => r.status !== "pending");

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">
            Pending ({pending.length})
          </h2>
          <div className="space-y-3">
            {pending.map((req) => {
              const hasCoords =
                isFinite(parseFloat(req.latitude ?? "")) &&
                isFinite(parseFloat(req.longitude ?? ""));
              const meeting =
                [req.meetingDay, req.meetingTime, req.meetingPlace]
                  .filter(Boolean)
                  .join(" · ") || req.proposedMeetingDetails;
              return (
                <Card key={req.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-0">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <MapPin className="h-4 w-4 text-bronze" />
                          <span className="font-bold">
                            {req.proposedGroupName?.trim() ||
                              `${req.proposedCity} Watch`}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {req.proposedCity}, {req.proposedState}
                          </span>
                          <Badge variant="secondary">pending</Badge>
                        </div>
                        <p className="text-sm font-medium">
                          {req.requesterName}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex min-w-0 items-center gap-1 break-words">
                            <Mail className="h-3 w-3 shrink-0" />
                            {req.requesterEmail}
                          </span>
                          {req.requesterPhone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {req.requesterPhone}
                            </span>
                          )}
                        </div>
                        {req.address && (
                          <p className="text-sm text-muted-foreground">
                            {req.address}, {req.proposedCity},{" "}
                            {req.proposedState} {req.zipCode ?? ""}
                          </p>
                        )}
                        {meeting && (
                          <p className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3 shrink-0" />
                            {meeting}
                          </p>
                        )}
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Crosshair className="h-3 w-3 shrink-0" />
                          {hasCoords
                            ? `Map-ready: ${req.latitude}, ${req.longitude}`
                            : "No coordinates yet — approval will geocode the address"}
                        </p>
                        {req.reason && (
                          <p className="text-sm text-muted-foreground">
                            Reason: {req.reason}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Submitted{" "}
                          {format(new Date(req.createdAt), "MMM d, yyyy")}
                        </p>
                        {errors[req.id] && (
                          <p className="text-sm text-destructive">
                            {errors[req.id]}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          className="min-h-11"
                          disabled={busyId === req.id}
                          onClick={() => handleAction(req.id, "approved")}
                        >
                          <Check className="mr-1 h-4 w-4" />
                          {busyId === req.id ? "Working..." : "Approve"}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="min-h-11"
                          disabled={busyId === req.id}
                          onClick={() => handleAction(req.id, "declined")}
                        >
                          <X className="mr-1 h-4 w-4" />
                          Decline
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {reviewed.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">
            Reviewed ({reviewed.length})
          </h2>
          <div className="space-y-2">
            {reviewed.map((req) => (
              <Card key={req.id} className="opacity-75">
                <CardContent className="flex flex-wrap items-center gap-3 p-3">
                  <Badge
                    variant={
                      req.status === "approved" ? "default" : "destructive"
                    }
                  >
                    {req.status}
                  </Badge>
                  <span className="text-sm">
                    {req.proposedGroupName?.trim() || `${req.proposedCity} Watch`}{" "}
                    — {req.proposedCity}, {req.proposedState} —{" "}
                    {req.requesterName}
                  </span>
                  {req.status === "approved" && req.createdGroupId && (
                    <Badge variant="secondary">group created</Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {requests.length === 0 && (
        <p className="text-center text-muted-foreground">
          No location requests yet.
        </p>
      )}
    </div>
  );
}
