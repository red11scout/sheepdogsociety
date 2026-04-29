import type { Metadata } from "next";
import Link from "next/link";
import { signIn } from "@/auth";

export const metadata: Metadata = {
  title: "Sign in — Acts 2028 Sheepdog Society",
  robots: { index: false, follow: false },
};

// Server action: dispatches the magic link via Resend.
// Auth.js will redirect to /admin/check-email on success (verifyRequest page).
async function signInAction(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return;
  await signIn("resend", {
    email,
    redirectTo: "/admin",
  });
}

export default function SignInPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  return (
    <div className="w-full max-w-md py-16">
      <p className="font-body text-xs uppercase tracking-[0.18em] text-olive mb-6">
        Acts 2028 Sheepdog Society
      </p>
      <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight mb-3">
        Sign in
      </h1>
      <p className="font-body text-base text-olive leading-relaxed mb-10">
        Enter your email and we&apos;ll send you a sign-in link. Admin access only.
      </p>

      <form action={signInAction} className="space-y-4">
        <label className="block">
          <span className="font-body text-sm font-medium text-iron block mb-2">
            Email
          </span>
          <input
            type="email"
            name="email"
            required
            autoFocus
            autoComplete="email"
            placeholder="you@example.com"
            className="w-full px-4 py-3 bg-bone border-2 border-stone focus:border-iron focus:outline-none rounded font-body text-base"
          />
        </label>
        <button
          type="submit"
          className="w-full py-3 bg-iron text-bone font-body font-semibold rounded hover:bg-navy transition-colors"
        >
          Send me a sign-in link
        </button>
      </form>

      <SignInFooter searchParams={searchParams} />
    </div>
  );
}

async function SignInFooter({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const params = (await searchParams) ?? {};
  return (
    <div className="mt-10 space-y-3 text-sm font-body text-olive">
      {params.error ? (
        <p className="text-oxblood">
          We couldn&apos;t send a link to that address. Check your spelling or email Drew below.
        </p>
      ) : null}
      <p>
        Need help?{" "}
        <Link
          href="mailto:beargodwin@gmail.com?subject=Sheepdog%20Society%20sign-in%20help"
          className="text-brass underline underline-offset-4 hover:text-iron"
        >
          Email Drew
        </Link>
      </p>
    </div>
  );
}
