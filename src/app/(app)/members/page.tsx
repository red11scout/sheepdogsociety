export const dynamic = "force-dynamic";

import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default async function MembersPage() {
  const activeMembers = await db
    .select()
    .from(users)
    .where(eq(users.status, "active"));

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-2xl font-bold">Members ({activeMembers.length})</h1>
      <div className="space-y-2">
        {activeMembers.map((member) => {
          const initials =
            (member.firstName?.[0] ?? "") + (member.lastName?.[0] ?? "");
          return (
            <Card key={member.id}>
              <CardContent className="flex items-center gap-4 p-4">
                <Avatar>
                  <AvatarImage src={member.avatarUrl ?? undefined} />
                  <AvatarFallback>{initials || "?"}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">
                    {member.firstName} {member.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">{member.email}</p>
                </div>
                <Badge variant="secondary" className="capitalize">
                  {member.role.replace("_", " ")}
                </Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
