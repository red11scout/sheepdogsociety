import { auth } from "@/lib/auth-compat";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BRAND_VOICE } from "@/lib/ai/prompts";
import { Icon } from "@/components/icons/Icon";
import { HintTooltip } from "@/components/admin/HintTooltip";

export const dynamic = "force-dynamic";

type IntegrationStatus = "configured" | "missing" | "needs-attention";

type Integration = {
  name: string;
  what: string;
  envKey: string;
  docsHref?: string;
};

const INTEGRATIONS: Integration[] = [
  {
    name: "Anthropic Claude",
    what: "Powers the Tiptap BubbleMenu, Letter drafting, devotional + scripture generation. Pinned to claude-sonnet-4-5.",
    envKey: "ANTHROPIC_API_KEY",
    docsHref: "https://console.anthropic.com",
  },
  {
    name: "OpenAI gpt-image-1",
    what: "Cover-image generation for Letters. Optional — Letters work without it.",
    envKey: "OPENAI_API_KEY",
    docsHref: "https://platform.openai.com/account/api-keys",
  },
  {
    name: "Resend (transactional)",
    what: "Magic-link admin sign-in, welcome emails after a man joins a group.",
    envKey: "AUTH_RESEND_KEY",
    docsHref: "https://resend.com/api-keys",
  },
  {
    name: "Resend (newsletter)",
    what: "The Letter — broadcasts when an admin clicks Publish.",
    envKey: "RESEND_API_KEY",
    docsHref: "https://resend.com/api-keys",
  },
  {
    name: "Mapbox",
    what: "Group locator map on /locations and /groups.",
    envKey: "NEXT_PUBLIC_MAPBOX_TOKEN",
    docsHref: "https://account.mapbox.com/access-tokens",
  },
  {
    name: "Vercel Blob",
    what: "Letter cover images, resource PDFs, scripture-of-the-day art.",
    envKey: "BLOB_READ_WRITE_TOKEN",
    docsHref: "https://vercel.com/dashboard/stores",
  },
  {
    name: "ESV Bible API",
    what: "Renders verse text behind {{VERSE: ref}} placeholders. Required by the no-AI-verse-text rule.",
    envKey: "ESV_API_KEY",
    docsHref: "https://api.esv.org",
  },
  {
    name: "Twilio (SMS)",
    what: "Optional. Phase E unlocks event reminders + the weekly text. Behind SMS_ENABLED feature flag.",
    envKey: "TWILIO_ACCOUNT_SID",
    docsHref: "https://console.twilio.com",
  },
];

function statusFor(envKey: string, allEnv: Record<string, string | undefined>): IntegrationStatus {
  const v = allEnv[envKey];
  if (!v) return "missing";
  if (v.length < 8) return "needs-attention";
  return "configured";
}

export default async function SettingsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/admin/sign-in");
  const [me] = await db.select().from(users).where(eq(users.id, userId));
  if (!me || me.role !== "admin") redirect("/admin/sign-in");

  // Read env presence server-side. Never render values, only configured/missing.
  const env = {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    AUTH_RESEND_KEY: process.env.AUTH_RESEND_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    NEXT_PUBLIC_MAPBOX_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
    ESV_API_KEY: process.env.ESV_API_KEY,
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 md:px-12 md:py-14">
      <header>
        <div className="flex items-center gap-4">
          <span className="section-mark text-brass">§ Settings</span>
          <div className="hairline flex-1" />
        </div>
        <h1 className="display-xl mt-6 text-3xl text-bone md:text-5xl">
          The control panel.
        </h1>
        <p className="mt-4 max-w-2xl font-pullquote text-base italic leading-relaxed text-stone">
          Brand voice, integrations, danger zone. Edit in code via PR for now.
          A full settings UI lands in a future phase.
        </p>
      </header>

      {/* Brand voice */}
      <section className="mt-12 border border-stone/15 bg-iron/40">
        <div className="flex items-center justify-between border-b border-stone/15 px-6 py-4">
          <div className="flex items-center gap-3">
            <Icon name="pen" size={18} className="text-brass" />
            <span className="section-mark text-bone">§ Brand voice</span>
          </div>
          <HintTooltip hint="Every Claude call in the app prepends this. Editing this changes how AI drafts read everywhere — Letters, devotionals, scripture-of-the-day. Edit src/lib/ai/prompts.ts via PR to update." />
        </div>
        <div className="px-6 py-5">
          <p className="text-sm leading-relaxed text-stone">
            The full system prompt is below. Treat it as the rulebook for every
            AI generation. The banned-word list is binding.
          </p>
          <pre className="mt-4 max-h-[360px] overflow-y-auto whitespace-pre-wrap break-words border border-stone/10 bg-iron/60 p-4 font-mono text-xs leading-relaxed text-stone">
{BRAND_VOICE}
          </pre>
          <p className="mt-3 text-xs text-stone/60">
            Source:{" "}
            <code className="text-brass">src/lib/ai/prompts.ts</code> ·{" "}
            <code className="text-brass">src/lib/ai/system-prompt.ts</code>
          </p>
        </div>
      </section>

      {/* Integrations */}
      <section className="mt-8 border border-stone/15 bg-iron/40">
        <div className="flex items-center justify-between border-b border-stone/15 px-6 py-4">
          <div className="flex items-center gap-3">
            <Icon name="anchor" size={18} className="text-brass" />
            <span className="section-mark text-bone">§ Integrations</span>
          </div>
          <HintTooltip hint="Every external service the app talks to. Status is read from server env at request time. Values are never exposed in the browser bundle." />
        </div>
        <ul className="divide-y divide-stone/10">
          {INTEGRATIONS.map((i) => {
            const status = statusFor(i.envKey, env);
            return (
              <li key={i.envKey} className="grid gap-3 px-6 py-4 md:grid-cols-[180px_1fr_auto] md:items-center md:gap-6">
                <div>
                  <p className="font-display text-base text-bone">{i.name}</p>
                  <p className="mt-1 text-xs text-stone/50">
                    <code>{i.envKey}</code>
                  </p>
                </div>
                <p className="text-sm leading-relaxed text-stone">{i.what}</p>
                <div className="flex items-center justify-end gap-3">
                  <StatusPill status={status} />
                  {i.docsHref && (
                    <a
                      href={i.docsHref}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 section-mark text-stone/60 hover:text-brass"
                    >
                      Rotate
                      <Icon name="arrow-up-right" size={11} />
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Account */}
      <section className="mt-8 border border-stone/15 bg-iron/40">
        <div className="flex items-center justify-between border-b border-stone/15 px-6 py-4">
          <div className="flex items-center gap-3">
            <Icon name="brothers" size={18} className="text-brass" />
            <span className="section-mark text-bone">§ Account</span>
          </div>
        </div>
        <div className="px-6 py-5">
          <dl className="grid gap-3 text-sm">
            <div className="grid grid-cols-[120px_1fr]">
              <dt className="text-stone/60">Signed in as</dt>
              <dd className="text-bone">
                {me.email ?? "—"}
                {me.firstName ? ` (${me.firstName})` : ""}
              </dd>
            </div>
            <div className="grid grid-cols-[120px_1fr]">
              <dt className="text-stone/60">Role</dt>
              <dd className="text-bone capitalize">{me.role}</dd>
            </div>
          </dl>
          <p className="mt-6 text-xs leading-relaxed text-stone/60">
            Admin invites and team management land in a later phase. For now,
            add an admin by inserting a row into the <code>users</code> table
            with <code>role = &apos;admin&apos;</code> and seeding a password
            hash via{" "}
            <code className="text-brass">scripts/seed-admin.ts</code>.
          </p>
        </div>
      </section>

      {/* Danger zone (placeholder) */}
      <section className="mt-8 border border-oxblood/40 bg-iron/40">
        <div className="flex items-center justify-between border-b border-oxblood/30 px-6 py-4">
          <div className="flex items-center gap-3">
            <Icon name="flame" size={18} className="text-oxblood" />
            <span className="section-mark text-bone">§ Danger zone</span>
          </div>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm leading-relaxed text-stone">
            Export every member, every letter, every resource. Delete the lot.
            Both gated by a typed confirmation. Lands in Phase E.
          </p>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              disabled
              className="inline-flex h-9 cursor-not-allowed items-center gap-2 border border-stone/30 px-4 text-xs uppercase tracking-[0.18em] text-stone/40"
            >
              Export all data
              <Icon name="download" size={12} />
            </button>
            <button
              type="button"
              disabled
              className="inline-flex h-9 cursor-not-allowed items-center gap-2 border border-oxblood/30 px-4 text-xs uppercase tracking-[0.18em] text-oxblood/50"
            >
              Delete all data
              <Icon name="trash" size={12} />
            </button>
          </div>
        </div>
      </section>

      <div className="mt-12 flex justify-start">
        <Link
          href="/admin/dashboard"
          className="section-mark text-brass hover:opacity-70"
        >
          ← Back to dashboard
        </Link>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: IntegrationStatus }) {
  const map: Record<IntegrationStatus, { label: string; cls: string }> = {
    configured: {
      label: "Configured",
      cls: "border-olive/40 bg-olive/10 text-olive",
    },
    missing: {
      label: "Missing",
      cls: "border-oxblood/40 bg-oxblood/10 text-oxblood",
    },
    "needs-attention": {
      label: "Check this",
      cls: "border-brass/40 bg-brass/10 text-brass",
    },
  };
  const { label, cls } = map[status];
  return (
    <span
      className={`inline-flex h-7 items-center border px-3 text-[0.6875rem] font-medium uppercase tracking-[0.18em] ${cls}`}
    >
      {label}
    </span>
  );
}
