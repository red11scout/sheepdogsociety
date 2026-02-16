import { Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function PendingApprovalPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="max-w-md">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <Shield className="h-12 w-12 text-bronze" />
          <h1 className="text-2xl font-bold">Awaiting Approval</h1>
          <p className="text-muted-foreground">
            Your registration is being reviewed. You will receive an email once
            approved. Stand fast.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
