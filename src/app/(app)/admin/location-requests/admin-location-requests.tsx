"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  Check,
  X,
  MapPin,
  Mail,
  Phone,
  Crosshair,
  Clock,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";

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
  notes: string | null;
  status: string;
  createdAt: Date;
  reviewedAt: Date | null;
};

export function AdminLocationRequests({
  requests: initialRequests,
}: {
  requests: LocationRequest[];
}) {
  const [requests, setRequests] = useState(initialRequests);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notices, setNotices] = useState<Record<string, string>>({});
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
      const data = await res.json().catch(() => null);
      if (res.ok) {
        setRequests((prev) =>
          prev.map((r) =>
            r.id === id
              ? { ...r, status, createdGroupId: data?.groupId ?? r.createdGroupId }
              : r
          )
        );
        if (status === "approved" && data?.groupId) {
          setNotices((n) => ({
            ...n,
            [id]: data?.slug
              ? `Group created — live at /groups/${data.slug}`
              : "Group created.",
          }));
        }
      } else {
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
            {pending.map((req) => (
              <Card key={req.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <RequestDetails req={req} />
                    <div className="flex shrink-0 flex-wrap gap-2">
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
                  <StatusLine
                    error={errors[req.id]}
                    notice={notices[req.id]}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {reviewed.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">
            Reviewed ({reviewed.length})
          </h2>
          <div className="space-y-3">
            {reviewed.map((req) => {
              const approvedNoGroup =
                req.status === "approved" && !req.createdGroupId;
              return (
                <Card key={req.id} className={approvedNoGroup ? "" : "opacity-90"}>
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                      <RequestDetails req={req} />
                      <div className="flex shrink-0 flex-col items-start gap-2">
                        <Badge
                          variant={
                            req.status === "approved" ? "default" : "destructive"
                          }
                        >
                          {req.status}
                        </Badge>
                        {req.status === "approved" && req.createdGroupId && (
                          <Link
                            href="/admin/groups"
                            className="inline-flex items-center gap-1 text-xs text-bronze underline-offset-4 hover:underline"
                          >
                            Group created — open Groups
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        )}
                      </div>
                    </div>

                    {approvedNoGroup && (
                      <div className="mt-3 flex flex-col gap-2 border border-bronze/40 bg-bronze/5 p-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="flex items-center gap-2 text-sm">
                          <AlertTriangle className="h-4 w-4 shrink-0 text-bronze" />
                          Approved, but the group does not exist yet. Push it to
                          Groups — this geocodes the address, puts the pin on
                          the map, and makes {firstNameOf(req.requesterName)}{" "}
                          the group&apos;s leader in Members.
                        </p>
                        <Button
                          size="sm"
                          className="min-h-11 shrink-0"
                          disabled={busyId === req.id}
                          onClick={() => handleAction(req.id, "approved")}
                        >
                          {busyId === req.id ? "Creating..." : "Create the group"}
                          <ArrowRight className="ml-1 h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    <StatusLine error={errors[req.id]} notice={notices[req.id]} />
                  </CardContent>
                </Card>
              );
            })}
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

/** Everything the man submitted — shared by pending AND reviewed cards. */
function RequestDetails({ req }: { req: LocationRequest }) {
  const hasCoords =
    isFinite(parseFloat(req.latitude ?? "")) &&
    isFinite(parseFloat(req.longitude ?? ""));
  const meeting =
    [req.meetingDay, req.meetingTime, req.meetingPlace]
      .filter(Boolean)
      .join(" · ") || req.proposedMeetingDetails;

  return (
    <div className="min-w-0 space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <MapPin className="h-4 w-4 text-bronze" />
        <span className="font-bold">
          {req.proposedGroupName?.trim() || `${req.proposedCity} Watch`}
        </span>
        <span className="text-sm text-muted-foreground">
          {req.proposedCity}, {req.proposedState}
        </span>
      </div>
      <p className="text-sm font-medium">{req.requesterName}</p>
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
          {req.address}, {req.proposedCity}, {req.proposedState}{" "}
          {req.zipCode ?? ""}
        </p>
      )}
      {meeting && (
        <p className="flex items-start gap-1 text-sm text-muted-foreground">
          <Clock className="mt-0.5 h-3 w-3 shrink-0" />
          <span className="min-w-0 break-words">{meeting}</span>
        </p>
      )}
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <Crosshair className="h-3 w-3 shrink-0" />
        {hasCoords
          ? `Map-ready: ${req.latitude}, ${req.longitude}`
          : "No coordinates yet — approval geocodes the address (city/state as fallback)"}
      </p>
      {req.reason && (
        <p className="text-sm text-muted-foreground">
          <span className="font-medium">Why he wants to lead:</span> {req.reason}
        </p>
      )}
      {req.notes && (
        <p className="text-sm text-muted-foreground">
          <span className="font-medium">Decision note:</span> {req.notes}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Submitted {format(new Date(req.createdAt), "MMM d, yyyy")}
        {req.reviewedAt &&
          ` · Reviewed ${format(new Date(req.reviewedAt), "MMM d, yyyy")}`}
      </p>
    </div>
  );
}

function StatusLine({ error, notice }: { error?: string; notice?: string }) {
  if (!error && !notice) return null;
  return (
    <p className={`mt-2 text-sm ${error ? "text-destructive" : "text-bronze"}`}>
      {error || notice}
    </p>
  );
}

function firstNameOf(full: string): string {
  return full.trim().split(/\s+/)[0] ?? "the requester";
}
