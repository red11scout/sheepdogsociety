import type { Metadata } from "next";
import Link from "next/link";
import { signIn } from "@/auth";

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
      ? "Email or password is incorrect, or that email isn't on the admin list."
      : params.error
      ? "Something went wrong. Try again or email Drew."
      : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm py-16">
        <div className="mb-8 flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Sheepdog Society" className="h-20 w-20 rounded-lg" />
          <h1 className="text-2xl font-bold">Sheepdog Society</h1>
          <p className="text-sm text-muted-foreground">Admin sign-in</p>
        </div>

        <form
          action={signInAction}
          className="space-y-4 border border-border rounded-lg p-6 bg-card"
        >
          <label className="block">
            <span className="text-sm font-medium block mb-1.5">Email</span>
            <input
              type="email"
              name="email"
              required
              autoFocus
              autoComplete="email"
              placeholder="you@example.com"
              className="w-full px-3 py-2.5 bg-background border border-border focus:border-primary focus:outline-none rounded text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium block mb-1.5">Password</span>
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full px-3 py-2.5 bg-background border border-border focus:border-primary focus:outline-none rounded text-sm"
            />
          </label>

          {errorLabel ? (
            <p className="text-sm text-destructive">{errorLabel}</p>
          ) : null}

          <button
            type="submit"
            className="w-full py-2.5 bg-primary text-primary-foreground font-semibold text-sm rounded hover:bg-primary/90 transition-colors"
          >
            Sign in
          </button>
        </form>

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
