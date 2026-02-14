"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type UserRole = "admin" | "group_leader" | "asst_leader" | "member";

type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: UserRole;
  status: "pending" | "active" | "suspended";
  createdAt: Date;
};

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  group_leader: "Group Leader",
  asst_leader: "Asst Leader",
  member: "Member",
};

export function AdminUserList({
  users,
  currentUserId,
}: {
  users: User[];
  currentUserId: string;
}) {
  const [userList, setUserList] = useState(users);
  const [loading, setLoading] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState<string | null>(null);

  const pending = userList.filter((u) => u.status === "pending");
  const active = userList.filter((u) => u.status === "active");
  const suspended = userList.filter((u) => u.status === "suspended");

  async function handleAction(userId: string, action: "approve" | "reject") {
    setLoading(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/approve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (res.ok) {
        const data = await res.json();
        setUserList((prev) =>
          prev.map((u) =>
            u.id === userId ? { ...u, status: data.status } : u
          )
        );
      }
    } finally {
      setLoading(null);
    }
  }

  async function handleRoleChange(userId: string, newRole: UserRole) {
    const previousList = [...userList];

    // Optimistic update
    setUserList((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );
    setRoleLoading(userId);

    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (!res.ok) {
        // Revert on failure
        setUserList(previousList);
      }
    } catch {
      // Revert on error
      setUserList(previousList);
    } finally {
      setRoleLoading(null);
    }
  }

  function UserCard({
    user,
    showRoleSelect,
  }: {
    user: User;
    showRoleSelect?: boolean;
  }) {
    const initials =
      (user.firstName?.[0] ?? "") + (user.lastName?.[0] ?? "");
    const isCurrentUser = user.id === currentUserId;

    return (
      <Card className="mb-3">
        <CardContent className="flex items-center gap-4 p-4">
          <Avatar>
            <AvatarImage src={user.avatarUrl ?? undefined} />
            <AvatarFallback>{initials || "?"}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-medium">
              {user.firstName} {user.lastName}
              {isCurrentUser && (
                <span className="ml-2 text-xs text-muted-foreground">(you)</span>
              )}
            </p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
          {showRoleSelect ? (
            <Select
              value={user.role}
              onValueChange={(value) =>
                handleRoleChange(user.id, value as UserRole)
              }
              disabled={isCurrentUser || roleLoading === user.id}
            >
              <SelectTrigger className="w-[150px]" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(ROLE_LABELS) as [UserRole, string][]).map(
                  ([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          ) : (
            <Badge variant={user.role === "admin" ? "default" : "secondary"}>
              {user.role.replace("_", " ")}
            </Badge>
          )}
          {user.status === "pending" && (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleAction(user.id, "approve")}
                disabled={loading === user.id}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleAction(user.id, "reject")}
                disabled={loading === user.id}
              >
                Deny
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs defaultValue="pending">
      <TabsList>
        <TabsTrigger value="pending">
          Pending ({pending.length})
        </TabsTrigger>
        <TabsTrigger value="active">
          Active ({active.length})
        </TabsTrigger>
        <TabsTrigger value="suspended">
          Suspended ({suspended.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="pending" className="mt-4">
        {pending.length === 0 ? (
          <p className="text-muted-foreground">No pending registrations.</p>
        ) : (
          pending.map((u) => <UserCard key={u.id} user={u} />)
        )}
      </TabsContent>

      <TabsContent value="active" className="mt-4">
        {active.length === 0 ? (
          <p className="text-muted-foreground">No active members.</p>
        ) : (
          active.map((u) => (
            <UserCard key={u.id} user={u} showRoleSelect />
          ))
        )}
      </TabsContent>

      <TabsContent value="suspended" className="mt-4">
        {suspended.length === 0 ? (
          <p className="text-muted-foreground">No suspended members.</p>
        ) : (
          suspended.map((u) => <UserCard key={u.id} user={u} />)
        )}
      </TabsContent>
    </Tabs>
  );
}
