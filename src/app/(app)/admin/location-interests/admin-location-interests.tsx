"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  Check,
  RotateCcw,
  MapPin,
  Mail,
  Phone,
  UserPlus,
  ArrowRight,
} from "lucide-react";

type LocationInterest = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  status: string;
  wantsNewsletter: boolean;
  createdMemberId: string | null;
  createdAt: Date;
  locationName: string | null;
  locationCity: string | null;
  locationState: string | null;
};

export function AdminLocationInterests({
  interests: initialInterests,
}: {
  interests: LocationInterest[];
}) {
  const [interests, setInterests] = useState(initialInterests);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleAction(
    id: string,
    status: "new" | "contacted" | "approved" | "resolved"
  ) {
    setBusyId(id);
    setErrors((e) => ({ ...e, [id]: "" }));
    try {
      const res = await fetch("/api/admin/location-interests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        setInterests((prev) =>
          prev.map((i) =>
            i.id === id
              ? {
                  ...i,
                  status,
                  createdMemberId: data?.memberId ?? i.createdMemberId,
                }
              : i
          )
        );
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

  const open = interests.filter(
    (i) => i.status === "new" || i.status === "contacted"
  );
  const handled = interests.filter(
    (i) => i.status === "approved" || i.status === "resolved"
  );

  return (
    <div className="space-y-6">
      {open.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Open ({open.length})</h2>
          <div className="space-y-3">
            {open.map((interest) => (
              <Card key={interest.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <InterestDetails interest={interest} />
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button
                        size="sm"
                        className="min-h-11"
                        disabled={busyId === interest.id}
                        onClick={() => handleAction(interest.id, "approved")}
                      >
                        <UserPlus className="mr-1 h-4 w-4" />
                        {busyId === interest.id
                          ? "Working..."
                          : "Approve → Members"}
                      </Button>
                      {interest.status === "new" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="min-h-11"
                          disabled={busyId === interest.id}
                          onClick={() => handleAction(interest.id, "contacted")}
                        >
                          Mark Contacted
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="min-h-11"
                        disabled={busyId === interest.id}
                        onClick={() => handleAction(interest.id, "resolved")}
                      >
                        <Check className="mr-1 h-4 w-4" />
                        Resolve
                      </Button>
                    </div>
                  </div>
                  {errors[interest.id] && (
                    <p className="mt-2 text-sm text-destructive">
                      {errors[interest.id]}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {handled.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">
            Handled ({handled.length})
          </h2>
          <div className="space-y-2">
            {handled.map((interest) => (
              <Card key={interest.id} className="opacity-90">
                <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 flex-wrap items-center gap-3">
                    <Badge
                      variant={
                        interest.status === "approved" ? "default" : "secondary"
                      }
                    >
                      {interest.status}
                    </Badge>
                    <span className="truncate text-sm">
                      {interest.locationName ?? "No group picked"} —{" "}
                      {interest.name}
                    </span>
                    {interest.status === "approved" &&
                      interest.createdMemberId && (
                        <Link
                          href="/admin/members"
                          className="inline-flex items-center gap-1 text-xs text-bronze underline-offset-4 hover:underline"
                        >
                          In Members
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      )}
                  </div>
                  {interest.status === "resolved" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="min-h-11 self-start sm:self-auto"
                      disabled={busyId === interest.id}
                      onClick={() => handleAction(interest.id, "new")}
                    >
                      <RotateCcw className="mr-1 h-4 w-4" />
                      Reopen
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {interests.length === 0 && (
        <p className="text-center text-muted-foreground">
          No join requests yet.
        </p>
      )}
    </div>
  );
}

function InterestDetails({ interest }: { interest: LocationInterest }) {
  return (
    <div className="min-w-0 space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <MapPin className="h-4 w-4 text-bronze" />
        <span className="font-bold">
          {interest.locationName ?? "No group picked yet"}
          {interest.locationCity &&
            ` (${interest.locationCity}, ${interest.locationState})`}
        </span>
        <Badge variant="secondary">{interest.status}</Badge>
      </div>
      <p className="text-sm font-medium">{interest.name}</p>
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <span className="flex min-w-0 items-center gap-1 break-words">
          <Mail className="h-3 w-3 shrink-0" />
          {interest.email}
        </span>
        {interest.phone && (
          <span className="flex items-center gap-1">
            <Phone className="h-3 w-3" />
            {interest.phone}
          </span>
        )}
      </div>
      {interest.message && (
        <p className="text-sm text-muted-foreground">
          His note: {interest.message}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Weekly letter: {interest.wantsNewsletter ? "yes" : "no"} · Submitted{" "}
        {format(new Date(interest.createdAt), "MMM d, yyyy")}
      </p>
    </div>
  );
}
