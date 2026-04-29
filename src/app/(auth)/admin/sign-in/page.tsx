import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";

export const metadata: Metadata = {
  title: "Sign in — Sheepdog Society",
  robots: { index: false, follow: false },
};

// Step 1: dispatch a sign-in code via Resend.
async function sendCodeAction(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return;
  await signIn("resend", {
    email,
    redirect: false,
  });
  // After sending, reload the page with email pre-filled in step 2.
  redirect(`/admin/sign-in?email=${encodeURIComponent(email)}&sent=1`);
}

// Step 2: redirect into Auth.js's GET callback with the user-entered code.
// The token consumption happens via the user's own browser request — so
// session cookies land on the right session, unlike the email-prefetcher
// case where the token was burned by an automated scanner.
async function verifyCodeAction(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const token = String(formData.get("token") ?? "").trim().toUpperCase();
  if (!email || !token) {
    redirect("/admin/sign-in?error=missing");
  }
  redirect(
    `/api/auth/callback/resend?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`
  );
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams?: Promise<{ email?: string; error?: string; sent?: string }>;
}) {
  const params = (await searchParams) ?? {};

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md py-16">
        <div className="mb-8 flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Sheepdog Society" className="h-20 w-20 rounded-lg" />
          <h1 className="text-2xl font-bold">Sheepdog Society</h1>
          <p className="text-sm text-muted-foreground">Admin sign-in</p>
        </div>

        {/* Two forms shown side-by-side. The user can EITHER request a new
            code (left) OR enter a code they already have (right). The code
            form bypasses the email-prefetcher problem because it uses POST. */}

        <div className="space-y-8">
          {/* Step 1: Request a code */}
          <form action={sendCodeAction} className="space-y-3 border border-border rounded-lg p-6 bg-card">
            <h2 className="text-sm font-semibold text-foreground">1. Request a code</h2>
            <label className="block">
              <span className="sr-only">Email</span>
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                defaultValue={params.email ?? ""}
                className="w-full px-3 py-2.5 bg-background border border-border focus:border-primary focus:outline-none rounded text-sm"
              />
            </label>
            <button
              type="submit"
              className="w-full py-2.5 bg-primary text-primary-foreground font-semibold text-sm rounded hover:bg-primary/90 transition-colors"
            >
              Email me a sign-in code
            </button>
          </form>

          {/* Step 2: Enter the code (POSTs to server action which redirects
              into the Auth.js callback — keeps token consumption tied to
              the user's browser, not an email scanner). */}
          <form
            action={verifyCodeAction}
            className="space-y-3 border border-border rounded-lg p-6 bg-card"
          >
            <h2 className="text-sm font-semibold text-foreground">2. Enter the code from your email</h2>
            <div className="grid grid-cols-1 gap-3">
              <label className="block">
                <span className="sr-only">Email</span>
                <input
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  placeholder="Email used in step 1"
                  defaultValue={params.email ?? ""}
                  className="w-full px-3 py-2.5 bg-background border border-border focus:border-primary focus:outline-none rounded text-sm"
                />
              </label>
              <label className="block">
                <span className="sr-only">Code</span>
                <input
                  type="text"
                  name="token"
                  required
                  autoComplete="one-time-code"
                  inputMode="text"
                  spellCheck={false}
                  placeholder="ABCD2345"
                  maxLength={12}
                  className="w-full px-3 py-2.5 bg-background border border-border focus:border-primary focus:outline-none rounded text-base font-mono uppercase tracking-[0.25em] text-center"
                  style={{ textTransform: "uppercase" }}
                />
              </label>
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-foreground text-background font-semibold text-sm rounded hover:bg-foreground/90 transition-colors"
            >
              Sign in
            </button>
          </form>
        </div>

        {params.error ? (
          <p className="mt-6 text-sm text-destructive text-center">
            That code didn&apos;t work. Request a new one above, or{" "}
            <Link
              href="mailto:beargodwin@gmail.com?subject=Sheepdog%20Society%20sign-in%20help"
              className="underline underline-offset-4"
            >
              email Drew
            </Link>
            .
          </p>
        ) : null}

        <p className="mt-8 text-xs text-muted-foreground text-center">
          Admin access only.{" "}
          <Link
            href="mailto:beargodwin@gmail.com?subject=Sheepdog%20Society%20sign-in%20help"
            className="underline underline-offset-4 hover:text-foreground"
          >
            Email Drew
          </Link>{" "}
          if you need help.
        </p>
      </div>
    </div>
  );
}
