"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Plus, MapPin, Clock, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

type Group = {
  id: string;
  name: string;
  description: string | null;
  meetingSchedule: string | null;
  meetingLocation: string | null;
  maxMembers: number;
  memberCount: number;
  myRole: string | null;
  isMember: boolean;
};

export function GroupList({ currentUser }: { currentUser: AppUser }) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [meetingSchedule, setMeetingSchedule] = useState("");
  const [meetingLocation, setMeetingLocation] = useState("");

  const canCreate =
    currentUser.role === "admin" || currentUser.role === "group_leader";

  function fetchGroups() {
    fetch("/api/groups")
      .then((r) => r.json())
      .then((data) => setGroups(data.groups ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchGroups();
  }, []);

  async function handleCreate() {
    setCreating(true);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          meetingSchedule,
          meetingLocation,
        }),
      });
      if (res.ok) {
        setDialogOpen(false);
        setName("");
        setDescription("");
        setMeetingSchedule("");
        setMeetingLocation("");
        fetchGroups();
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleJoin(groupId: string) {
    await fetch(`/api/groups/${groupId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUser.id }),
    });
    fetchGroups();
  }

  async function handleLeave(groupId: string) {
    await fetch(`/api/groups/${groupId}/members`, {
      method: "DELETE",
    });
    fetchGroups();
  }

  const myGroups = groups.filter((g) => g.isMember);
  const otherGroups = groups.filter((g) => !g.isMember);

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Groups</h1>
        {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" />
                New Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a Group</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 text-sm font-medium">Name</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Men of Valor"
                  />
                </div>
                <div>
                  <label className="mb-1 text-sm font-medium">Description</label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="A group for men pursuing..."
                    rows={3}
                  />
                </div>
                <div>
                  <label className="mb-1 text-sm font-medium">
                    Meeting Schedule
                  </label>
                  <Input
                    value={meetingSchedule}
                    onChange={(e) => setMeetingSchedule(e.target.value)}
                    placeholder="Tuesdays at 7 PM"
                  />
                </div>
                <div>
                  <label className="mb-1 text-sm font-medium">
                    Meeting Location
                  </label>
                  <Input
                    value={meetingLocation}
                    onChange={(e) => setMeetingLocation(e.target.value)}
                    placeholder="Fellowship Hall, Room 203"
                  />
                </div>
                <Button
                  onClick={handleCreate}
                  disabled={!name.trim() || creating}
                  className="w-full"
                >
                  {creating ? "Creating..." : "Create Group"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading groups...</p>
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <Users className="h-12 w-12 text-bronze" />
            <p className="text-muted-foreground">
              No groups yet. Iron sharpens iron.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {myGroups.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                My Groups
              </h2>
              <div className="space-y-2">
                {myGroups.map((g) => (
                  <GroupCard
                    key={g.id}
                    group={g}
                    onLeave={() => handleLeave(g.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {otherGroups.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Available Groups
              </h2>
              <div className="space-y-2">
                {otherGroups.map((g) => (
                  <GroupCard
                    key={g.id}
                    group={g}
                    onJoin={() => handleJoin(g.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GroupCard({
  group,
  onJoin,
  onLeave,
}: {
  group: Group;
  onJoin?: () => void;
  onLeave?: () => void;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-bronze/10">
          <Users className="h-5 w-5 text-bronze" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Link
              href={`/groups/${group.id}`}
              className="font-medium hover:text-primary"
            >
              {group.name}
            </Link>
            {group.myRole && (
              <Badge variant="secondary" className="text-xs capitalize">
                {group.myRole.replace("_", " ")}
              </Badge>
            )}
          </div>
          {group.description && (
            <p className="text-sm text-muted-foreground line-clamp-1">
              {group.description}
            </p>
          )}
          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {group.memberCount}/{group.maxMembers}
            </span>
            {group.meetingSchedule && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {group.meetingSchedule}
              </span>
            )}
            {group.meetingLocation && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {group.meetingLocation}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {group.isMember ? (
            <>
              <Link href={`/groups/${group.id}`}>
                <Button variant="ghost" size="icon">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={onJoin}
              disabled={group.memberCount >= group.maxMembers}
            >
              {group.memberCount >= group.maxMembers ? "Full" : "Join"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
