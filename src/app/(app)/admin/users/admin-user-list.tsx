"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: "admin" | "group_leader" | "asst_leader" | "member";
  status: "pending" | "active" | "suspended";
  createdAt: Date;
};

export function AdminUserList({ users }: { users: User[] }) {
  const [userList, setUserList] = useState(users);
  const [loading, setLoading] = useState<string | null>(null);

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

  function UserCard({ user }: { user: User }) {
    const initials =
      (user.firstName?.[0] ?? "") + (user.lastName?.[0] ?? "");

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
            </p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
          <Badge variant={user.role === "admin" ? "default" : "secondary"}>
            {user.role.replace("_", " ")}
          </Badge>
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
        {active.map((u) => (
          <UserCard key={u.id} user={u} />
        ))}
      </TabsContent>

      <TabsContent value="suspended" className="mt-4">
        {suspended.map((u) => (
          <UserCard key={u.id} user={u} />
        ))}
      </TabsContent>
    </Tabs>
  );
}
