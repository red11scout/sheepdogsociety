import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth-compat";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getLetter } from "@/server/letters";
import { LetterEditor } from "@/components/admin/letter-editor";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LetterEditPage({ params }: PageProps) {
  const { userId } = await auth();
  if (!userId) redirect("/admin/sign-in");
  const [me] = await db.select().from(users).where(eq(users.id, userId));
  if (me?.role !== "admin") redirect("/");

  const { id } = await params;
  const letter = await getLetter(id);
  if (!letter) notFound();

  return (
    <LetterEditor
      letterId={letter.id}
      initial={{
        title: letter.title,
        subtitle: letter.subtitle ?? "",
        themeWord: letter.themeWord ?? "",
        body: (letter.body as object) ?? { type: "doc", content: [{ type: "paragraph" }] },
        bodyHtml: letter.bodyHtml ?? "",
        status: letter.status,
        slug: letter.slug,
        issueNumber: letter.issueNumber,
      }}
    />
  );
}
