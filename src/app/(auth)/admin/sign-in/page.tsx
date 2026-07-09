import type { Metadata } from "next";
import Link from "next/link";
import { signIn } from "@/auth";
import { Icon } from "@/components/icons/Icon";

export const metadata: Metadata = {
  title: "Sign in — Sheepdog Society",
  robots: { index: false, follow: false },
};

async function signInAction(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  await signIn("credentials", {
    email,
    password,
    redirectTo: "/admin/dashboard",
  });
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const errorLabel =
    params.error === "CredentialsSignin"
      ? "Email or password is incorrect, or that email is not on the admin list."
      : params.error
      ? "Something went wrong. Try again or email Drew."
      : null;

  return (
    <div className="admin-shell relative isolate min-h-screen overflow-hidden bg-iron text-bone">
      <div className="aurora aurora--soft" aria-hidden />
      <div className="dotted-grid absolute inset-0 opacity-[0.04]" aria-hidden />

      <div className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
        {/* Brand */}
        <div className="flex flex-col items-center gap-4 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Sheepdog Society" className="h-20 w-20" />
          <div>
            <h1 className="display-xl text-3xl text-bone">Sheepdog Society</h1>
            <p className="mt-2 section-mark text-brass">§ Admin sign-in</p>
          </div>
        </div>

        {/* Form */}
        <form
          action={signInAction}
          className="mt-12 space-y-5 border border-stone/20 bg-iron/40 p-8 text-bone backdrop-blur"
        >
          <label className="block">
            <span className="block section-mark text-stone">Email</span>
            <input
              type="email"
              name="email"
              required
              autoFocus
              autoComplete="email"
              placeholder="you@example.com"
              className="mt-2 block h-11 w-full border border-stone/25 bg-transparent px-3 text-base text-bone placeholder:text-stone/50 focus:border-brass focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="block section-mark text-stone">Password</span>
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="mt-2 block h-11 w-full border border-stone/25 bg-transparent px-3 text-base text-bone placeholder:text-stone/50 focus:border-brass focus:outline-none"
            />
          </label>

          {errorLabel ? (
            <p className="border border-oxblood/50 bg-oxblood/15 px-3 py-2 text-sm text-bone">
              {errorLabel}
            </p>
          ) : null}

          <button
            type="submit"
            className="lift inline-flex h-12 w-full items-center justify-center gap-2 bg-brass text-sm font-semibold uppercase tracking-[0.18em] text-ink transition-colors hover:bg-gold"
          >
            Sign in
            <Icon name="arrow-right" size={14} />
          </button>
        </form>

        <p className="mt-10 text-center text-xs text-stone/65">
          Admin access only.{" "}
          <Link
            href="mailto:shepherd@acts2028sheepdogsociety.com?subject=Sheepdog%20Society%20sign-in%20help"
            className="text-brass underline underline-offset-4 transition-colors hover:text-gold"
          >
            Email Drew
          </Link>{" "}
          if you need help.
        </p>

        <Link
          href="/"
          className="mt-8 inline-flex items-center justify-center gap-2 text-xs text-stone/55 transition-colors hover:text-brass"
        >
          <Icon name="arrow-right" size={10} className="rotate-180" />
          Back to the public site
        </Link>
      </div>
    </div>
  );
}
