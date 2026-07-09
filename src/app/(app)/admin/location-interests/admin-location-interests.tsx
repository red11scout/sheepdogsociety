"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Check, RotateCcw, MapPin, Mail, Phone } from "lucide-react";

type LocationInterest = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  status: string;
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

  async function handleAction(id: string, status: "new" | "contacted" | "resolved") {
    try {
      const res = await fetch("/api/admin/location-interests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        setInterests((prev) =>
          prev.map((i) => (i.id === id ? { ...i, status } : i))
        );
      }
    } catch {
      // handle error
    }
  }

  const open = interests.filter((i) => i.status !== "resolved");
  const resolved = interests.filter((i) => i.status === "resolved");

  return (
    <div className="space-y-6">
      {open.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Open ({open.length})</h2>
          <div className="space-y-3">
            {open.map((interest) => (
              <Card key={interest.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-bronze" />
                        <span className="font-bold">
                          {interest.locationName ?? "Unknown group"}
                          {interest.locationCity &&
                            ` (${interest.locationCity}, ${interest.locationState})`}
                        </span>
                        <Badge variant="secondary">{interest.status}</Badge>
                      </div>
                      <p className="text-sm font-medium">{interest.name}</p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
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
                          Message: {interest.message}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Submitted{" "}
                        {format(new Date(interest.createdAt), "MMM d, yyyy")}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {interest.status === "new" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleAction(interest.id, "contacted")}
                        >
                          Mark Contacted
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={() => handleAction(interest.id, "resolved")}
                      >
                        <Check className="mr-1 h-4 w-4" />
                        Mark Resolved
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {resolved.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">
            Resolved ({resolved.length})
          </h2>
          <div className="space-y-2">
            {resolved.map((interest) => (
              <Card key={interest.id} className="opacity-75">
                <CardContent className="flex items-center justify-between gap-3 p-3">
                  <div className="flex items-center gap-3">
                    <Badge>resolved</Badge>
                    <span className="text-sm">
                      {interest.locationName ?? "Unknown group"} —{" "}
                      {interest.name}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleAction(interest.id, "new")}
                  >
                    <RotateCcw className="mr-1 h-4 w-4" />
                    Reopen
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {interests.length === 0 && (
        <p className="text-center text-muted-foreground">
          No group interest submissions yet.
        </p>
      )}
    </div>
  );
}
