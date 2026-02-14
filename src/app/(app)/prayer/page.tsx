import { HandHeart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function PrayerPage() {
  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-2xl font-bold">Prayer Wall</h1>
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <HandHeart className="h-12 w-12 text-bronze" />
          <p className="text-muted-foreground">
            Prayer requests coming in Phase 2. Bear one another&apos;s burdens.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
