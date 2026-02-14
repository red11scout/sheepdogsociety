"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Users, Clock, MapPin, UserPlus, LogOut, Settings } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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

type GroupMember = {
  id: string;
  userId: string;
  role: string;
  joinedAt: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
};

type GroupData = {
  id: string;
  name: string;
  description: string | null;
  meetingSchedule: string | null;
  meetingLocation: string | null;
  maxMembers: number;
  isActive: boolean;
  createdBy: string;
};

export function GroupDetail({
  groupId,
  currentUser,
}: {
  groupId: string;
  currentUser: AppUser;
}) {
  const [group, setGroup] = useState<GroupData | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editSchedule, setEditSchedule] = useState("");
  const [editLocation, setEditLocation] = useState("");

  const isLeader = myRole === "leader" || myRole === "asst_leader" || currentUser.role === "admin";

  function fetchGroup() {
    fetch(`/api/groups/${groupId}`)
      .then((r) => r.json())
      .then((data) => {
        setGroup(data.group);
        setMembers(data.members ?? []);
        setMyRole(data.myRole);
        setIsMember(data.isMember);
        if (data.group) {
          setEditName(data.group.name);
          setEditDesc(data.group.description ?? "");
          setEditSchedule(data.group.meetingSchedule ?? "");
          setEditLocation(data.group.meetingLocation ?? "");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchGroup();
  }, [groupId]);

  async function handleJoin() {
    await fetch(`/api/groups/${groupId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUser.id }),
    });
    fetchGroup();
  }

  async function handleLeave() {
    await fetch(`/api/groups/${groupId}/members`, {
      method: "DELETE",
    });
    fetchGroup();
  }

  async function handleRemoveMember(userId: string) {
    await fetch(`/api/groups/${groupId}/members?userId=${userId}`, {
      method: "DELETE",
    });
    fetchGroup();
  }

  async function handleUpdate() {
    await fetch(`/api/groups/${groupId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName,
        description: editDesc,
        meetingSchedule: editSchedule,
        meetingLocation: editLocation,
      }),
    });
    setEditOpen(false);
    fetchGroup();
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <p className="text-muted-foreground">Group not found.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/groups"
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          All Groups
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{group.name}</h1>
            {group.description && (
              <p className="mt-1 text-muted-foreground">{group.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isLeader && (
              <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Group</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1 text-sm font-medium">Name</label>
                      <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                    </div>
                    <div>
                      <label className="mb-1 text-sm font-medium">Description</label>
                      <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={3} />
                    </div>
                    <div>
                      <label className="mb-1 text-sm font-medium">Meeting Schedule</label>
                      <Input value={editSchedule} onChange={(e) => setEditSchedule(e.target.value)} />
                    </div>
                    <div>
                      <label className="mb-1 text-sm font-medium">Meeting Location</label>
                      <Input value={editLocation} onChange={(e) => setEditLocation(e.target.value)} />
                    </div>
                    <Button onClick={handleUpdate} className="w-full">Save Changes</Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            {isMember ? (
              <Button variant="outline" size="sm" onClick={handleLeave}>
                <LogOut className="mr-1 h-4 w-4" />
                Leave
              </Button>
            ) : (
              <Button size="sm" onClick={handleJoin}>
                <UserPlus className="mr-1 h-4 w-4" />
                Join
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Info cards */}
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Users className="h-5 w-5 text-bronze" />
            <div>
              <p className="text-sm font-medium">
                {members.length}/{group.maxMembers}
              </p>
              <p className="text-xs text-muted-foreground">Members</p>
            </div>
          </CardContent>
        </Card>
        {group.meetingSchedule && (
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Clock className="h-5 w-5 text-bronze" />
              <div>
                <p className="text-sm font-medium">{group.meetingSchedule}</p>
                <p className="text-xs text-muted-foreground">Schedule</p>
              </div>
            </CardContent>
          </Card>
        )}
        {group.meetingLocation && (
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <MapPin className="h-5 w-5 text-bronze" />
              <div>
                <p className="text-sm font-medium">{group.meetingLocation}</p>
                <p className="text-xs text-muted-foreground">Location</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Members list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Members</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {members.map((m) => {
            const initials = (m.firstName?.[0] ?? "") + (m.lastName?.[0] ?? "");
            return (
              <div key={m.id} className="flex items-center gap-3 py-1">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={m.avatarUrl ?? undefined} />
                  <AvatarFallback className="text-xs">{initials || "?"}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {m.firstName} {m.lastName}
                  </p>
                </div>
                <Badge variant="secondary" className="text-xs capitalize">
                  {m.role.replace("_", " ")}
                </Badge>
                {isLeader && m.userId !== currentUser.id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground"
                    onClick={() => handleRemoveMember(m.userId)}
                  >
                    Remove
                  </Button>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
