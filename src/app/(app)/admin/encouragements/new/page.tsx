import { redirect } from "next/navigation";
import { createEncouragement } from "@/server/encouragements";

export const dynamic = "force-dynamic";

export default async function NewEncouragementPage() {
  const row = await createEncouragement({ title: "Untitled encouragement" });
  redirect(`/admin/encouragements/${row.id}`);
}
