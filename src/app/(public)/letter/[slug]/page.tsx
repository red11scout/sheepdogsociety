import { redirect } from "next/navigation";

// Legacy /letter/[slug] → /encouragements. Old slugs don't map 1:1 to
// new encouragement slugs; landing on the encouragements list is the
// closest non-404 outcome. If you need to preserve a specific old letter,
// republish it as an encouragement with a matching slug.
export default async function LegacyLetterSlugRedirect() {
  redirect("/encouragements");
}
