import { Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function GroupsPage() {
  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-2xl font-bold">Groups</h1>
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <Users className="h-12 w-12 text-bronze" />
          <p className="text-muted-foreground">
            Small group management coming in Phase 2. Iron sharpens iron.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
