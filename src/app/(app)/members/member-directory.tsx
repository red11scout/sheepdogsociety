"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { Search, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Member = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
  bio: string | null;
  role: string;
  createdAt: Date;
};

export function MemberDirectory({
  members,
  currentUserId,
}: {
  members: Member[];
  currentUserId: string;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return members;
    const q = search.toLowerCase();
    return members.filter(
      (m) =>
        m.firstName.toLowerCase().includes(q) ||
        m.lastName.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q)
    );
  }, [members, search]);

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Members ({members.length})</h1>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search members..."
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <User className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">No members found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((m) => {
            const initials =
              (m.firstName?.[0] ?? "") + (m.lastName?.[0] ?? "");
            const isMe = m.id === currentUserId;

            return (
              <Card key={m.id}>
                <CardContent className="flex items-center gap-4 p-4">
                  <Avatar>
                    <AvatarImage src={m.avatarUrl ?? undefined} />
                    <AvatarFallback>{initials || "?"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {m.firstName} {m.lastName}
                        {isMe && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            (you)
                          </span>
                        )}
                      </p>
                      <Badge variant="secondary" className="text-xs capitalize">
                        {m.role.replace("_", " ")}
                      </Badge>
                    </div>
                    {m.bio && (
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {m.bio}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Member since {format(new Date(m.createdAt), "MMM yyyy")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
