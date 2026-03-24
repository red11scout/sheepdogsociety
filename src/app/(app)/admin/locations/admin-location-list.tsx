"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin, Plus, Users } from "lucide-react";

type Location = {
  id: string;
  name: string;
  city: string;
  state: string;
  latitude: string;
  longitude: string;
  meetingDay: string | null;
  meetingTime: string | null;
  meetingPlace: string | null;
  groupSize: number | null;
  maxSize: number;
  contactName: string | null;
  contactEmail: string | null;
  status: "active" | "pending" | "inactive";
  createdAt: Date;
};

export function AdminLocationList({
  locations: initialLocations,
}: {
  locations: Location[];
}) {
  const [locationsList, setLocationsList] = useState(initialLocations);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newLoc, setNewLoc] = useState<{
    name: string;
    city: string;
    state: string;
    latitude: string;
    longitude: string;
    meetingDay: string;
    meetingTime: string;
    meetingPlace: string;
    contactName: string;
    contactEmail: string;
    status: "active" | "pending" | "inactive";
  }>({
    name: "",
    city: "",
    state: "",
    latitude: "",
    longitude: "",
    meetingDay: "",
    meetingTime: "",
    meetingPlace: "",
    contactName: "",
    contactEmail: "",
    status: "active",
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/admin/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newLoc),
      });
      if (res.ok) {
        const data = await res.json();
        setLocationsList((prev) => [...prev, data.location]);
        setShowCreate(false);
        setNewLoc({
          name: "",
          city: "",
          state: "",
          latitude: "",
          longitude: "",
          meetingDay: "",
          meetingTime: "",
          meetingPlace: "",
          contactName: "",
          contactEmail: "",
          status: "active",
        });
      }
    } catch {
      // handle error
    }
    setCreating(false);
  }

  const statusColor = {
    active: "default" as const,
    pending: "secondary" as const,
    inactive: "destructive" as const,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {locationsList.length} location
          {locationsList.length !== 1 ? "s" : ""}
        </p>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1.5 h-4 w-4" />
              Add Location
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Location</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-3">
              <Input
                placeholder="Group name *"
                value={newLoc.name}
                onChange={(e) =>
                  setNewLoc((f) => ({ ...f, name: e.target.value }))
                }
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="City *"
                  value={newLoc.city}
                  onChange={(e) =>
                    setNewLoc((f) => ({ ...f, city: e.target.value }))
                  }
                  required
                />
                <Input
                  placeholder="State *"
                  value={newLoc.state}
                  onChange={(e) =>
                    setNewLoc((f) => ({ ...f, state: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="Latitude *"
                  value={newLoc.latitude}
                  onChange={(e) =>
                    setNewLoc((f) => ({ ...f, latitude: e.target.value }))
                  }
                  required
                />
                <Input
                  placeholder="Longitude *"
                  value={newLoc.longitude}
                  onChange={(e) =>
                    setNewLoc((f) => ({ ...f, longitude: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="Meeting day"
                  value={newLoc.meetingDay}
                  onChange={(e) =>
                    setNewLoc((f) => ({ ...f, meetingDay: e.target.value }))
                  }
                />
                <Input
                  placeholder="Meeting time"
                  value={newLoc.meetingTime}
                  onChange={(e) =>
                    setNewLoc((f) => ({ ...f, meetingTime: e.target.value }))
                  }
                />
              </div>
              <Input
                placeholder="Meeting place"
                value={newLoc.meetingPlace}
                onChange={(e) =>
                  setNewLoc((f) => ({ ...f, meetingPlace: e.target.value }))
                }
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="Contact name"
                  value={newLoc.contactName}
                  onChange={(e) =>
                    setNewLoc((f) => ({ ...f, contactName: e.target.value }))
                  }
                />
                <Input
                  placeholder="Contact email"
                  value={newLoc.contactEmail}
                  onChange={(e) =>
                    setNewLoc((f) => ({ ...f, contactEmail: e.target.value }))
                  }
                />
              </div>
              <Select
                value={newLoc.status}
                onValueChange={(v) =>
                  setNewLoc((f) => ({
                    ...f,
                    status: v as "active" | "pending" | "inactive",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" className="w-full" disabled={creating}>
                {creating ? "Creating..." : "Create Location"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {locationsList.map((loc) => (
        <Card key={loc.id}>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-bronze/10 p-2">
              <MapPin className="h-5 w-5 text-bronze" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold">{loc.name}</h3>
                <Badge variant={statusColor[loc.status]}>{loc.status}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {loc.city}, {loc.state}
                {loc.meetingDay ? ` · ${loc.meetingDay}` : ""}
                {loc.meetingTime ? ` at ${loc.meetingTime}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              {loc.groupSize ?? 0}/{loc.maxSize}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
