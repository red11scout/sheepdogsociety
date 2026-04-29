import { db } from "@/db";
import { newsletterSubscribers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { resend } from "@/lib/email";
import { IssueKicker } from "@/components/public/issue-kicker";
import { ScriptureBand } from "@/components/public/scripture-band";

export const metadata = {
  title: "Subscribe — The Letter — Acts 2028 Sheepdog Society",
  description:
    "Each Friday, one short letter. One passage, one big idea, one practical step. Free. Unsubscribe anytime.",
};

// Pour-Over-style subscribe-first landing per brief §3 + §7.
async function subscribeAction(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const firstName = String(formData.get("firstName") ?? "").trim();
  if (!email || !email.includes("@")) {
    return;
  }

  // Local mirror first — survives Resend outages.
  try {
    const existing = await db
      .select()
      .from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.email, email))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(newsletterSubscribers).values({
        email,
        firstName: firstName || "",
        isActive: true,
      });
    }
  } catch (err) {
    // Log only — don't bubble; the user can still get the email-side acknowledgement
    console.error("subscribe local mirror failed", err);
  }

  // Resend audience mirror — Resend is the source of truth for unsubscribe state.
  if (process.env.RESEND_AUDIENCE_ID && process.env.RESEND_API_KEY) {
    try {
      await resend().contacts.create({
        email,
        firstName: firstName || undefined,
        unsubscribed: false,
        audienceId: process.env.RESEND_AUDIENCE_ID,
      });
    } catch (err) {
      console.error("Resend contact create failed", err);
    }
  }
}

export default function SubscribePage({
  searchParams,
}: {
  searchParams?: Promise<{ ok?: string }>;
}) {
  return (
    <>
      <section className="px-6 pt-20 pb-16 md:pt-28 md:pb-24">
        <div className="mx-auto max-w-3xl">
          <IssueKicker parts={["The Letter", "Free · Friday weekly"]} />
          <h1 className="mt-4 font-display text-5xl md:text-7xl font-semibold tracking-tight leading-[1.05]">
            One passage. One idea. One step.
          </h1>
          <p className="mt-6 font-pullquote italic text-xl md:text-2xl text-olive leading-relaxed">
            Each Friday morning, a short letter for Christian men. Steady,
            plainspoken, brotherly. Free. Unsubscribe anytime.
          </p>

          <SubscribeForm />

          <ul className="mt-12 space-y-3 font-body text-base">
            <li className="flex gap-3">
              <span className="text-brass">✓</span>
              <span>One short letter every Friday morning. Never more than one.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-brass">✓</span>
              <span>Five-minute read. One passage. One idea. One step you can take this week.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-brass">✓</span>
              <span>No tracking pixels, no upsells, no &ldquo;just one more thing.&rdquo; Unsubscribe in one click.</span>
            </li>
          </ul>
        </div>
      </section>

      <ScriptureBand reference="Acts 20:28">
        Be on guard for yourselves and for all the flock, among which the Holy
        Spirit has made you overseers.
      </ScriptureBand>

      <SubscribeFormFooter searchParams={searchParams} />
    </>
  );
}

function SubscribeForm() {
  return (
    <form
      action={subscribeAction}
      className="mt-10 grid sm:grid-cols-[1fr_1fr_auto] gap-3 max-w-xl"
    >
      <label className="block">
        <span className="sr-only">First name</span>
        <input
          type="text"
          name="firstName"
          placeholder="First name (optional)"
          autoComplete="given-name"
          className="w-full px-4 py-3 bg-bone border-2 border-stone focus:border-iron focus:outline-none rounded font-body text-base"
        />
      </label>
      <label className="block">
        <span className="sr-only">Email</span>
        <input
          type="email"
          name="email"
          required
          placeholder="you@example.com"
          autoComplete="email"
          className="w-full px-4 py-3 bg-bone border-2 border-stone focus:border-iron focus:outline-none rounded font-body text-base"
        />
      </label>
      <button
        type="submit"
        className="px-6 py-3 bg-iron text-bone font-body font-semibold rounded hover:bg-navy transition-colors"
      >
        Subscribe
      </button>
    </form>
  );
}

async function SubscribeFormFooter({
  searchParams,
}: {
  searchParams?: Promise<{ ok?: string }>;
}) {
  const params = (await searchParams) ?? {};
  if (!params.ok) return null;
  return (
    <section className="bg-bone py-12 px-6 text-center">
      <p className="font-display text-2xl text-iron">
        You&apos;re in. Watch your inbox Friday.
      </p>
    </section>
  );
}
