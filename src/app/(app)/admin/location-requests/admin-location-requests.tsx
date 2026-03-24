"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Check, X, MapPin, Mail, Phone } from "lucide-react";

type LocationRequest = {
  id: string;
  requesterName: string;
  requesterEmail: string;
  requesterPhone: string | null;
  proposedCity: string;
  proposedState: string;
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

  async function handleAction(id: string, status: "approved" | "declined") {
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
      }
    } catch {
      // handle error
    }
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
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-bronze" />
                        <span className="font-bold">
                          {req.proposedCity}, {req.proposedState}
                        </span>
                        <Badge variant="secondary">pending</Badge>
                      </div>
                      <p className="text-sm font-medium">
                        {req.requesterName}
                      </p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {req.requesterEmail}
                        </span>
                        {req.requesterPhone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {req.requesterPhone}
                          </span>
                        )}
                      </div>
                      {req.proposedMeetingDetails && (
                        <p className="text-sm text-muted-foreground">
                          Meeting: {req.proposedMeetingDetails}
                        </p>
                      )}
                      {req.reason && (
                        <p className="text-sm text-muted-foreground">
                          Reason: {req.reason}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Submitted{" "}
                        {format(new Date(req.createdAt), "MMM d, yyyy")}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleAction(req.id, "approved")}
                      >
                        <Check className="mr-1 h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleAction(req.id, "declined")}
                      >
                        <X className="mr-1 h-4 w-4" />
                        Decline
                      </Button>
                    </div>
                  </div>
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
          <div className="space-y-2">
            {reviewed.map((req) => (
              <Card key={req.id} className="opacity-75">
                <CardContent className="flex items-center gap-3 p-3">
                  <Badge
                    variant={
                      req.status === "approved" ? "default" : "destructive"
                    }
                  >
                    {req.status}
                  </Badge>
                  <span className="text-sm">
                    {req.proposedCity}, {req.proposedState} —{" "}
                    {req.requesterName}
                  </span>
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
