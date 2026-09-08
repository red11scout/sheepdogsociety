// Auth.js v5 middleware (Clerk replaced 2026-04-29).
//
// Strategy:
// - Public routes are explicitly enumerated (the brand site, Letter,
//   Devotionals, Groups, Events, Resources, Subscribe, Merch, plus
//   sitemap/robots/feed and the auth API).
// - The `(app)` member-area routes still need a session AND an approved
//   user record (users.status = 'active' or 'approved') — that gate is
//   enforced by `(app)/layout.tsx` server-side, not here, because the
//   approval check needs DB access which middleware can't do on edge.
// - The `/admin` admin-area routes need ADMIN_EMAILS allowlist; that gate
//   is enforced by Auth.js's signIn callback (in auth.config.ts) at
//   sign-in time, plus a server-side admin check on each /admin page.

import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

const PUBLIC_ROUTES = [
  /^\/$/,
  /^\/about(\/.*)?$/,
  /^\/contact(\/.*)?$/,
  /^\/get-started(\/.*)?$/,
  /^\/how-we-gather(\/.*)?$/,
  /^\/faq(\/.*)?$/,
  /^\/giving(\/.*)?$/,
  /^\/partnerships(\/.*)?$/,
  /^\/stories(\/.*)?$/,
  /^\/scripture-reader(\/.*)?$/,
  /^\/daily-scripture(\/.*)?$/,
  /^\/locations(\/.*)?$/,
  /^\/letter(\/.*)?$/,
  /^\/bible(\/.*)?$/,
  /^\/devotionals(\/.*)?$/,
  /^\/groups(\/.*)?$/,
  /^\/events(\/.*)?$/,
  /^\/resources(\/.*)?$/,
  /^\/subscribe(\/.*)?$/,
  /^\/merch(\/.*)?$/,
  /^\/statement-of-faith(\/.*)?$/,
  /^\/blog(\/.*)?$/,
  /^\/acts-20-28$/,
  /^\/encouragements(\/.*)?$/,
  // Phase D — new public surfaces (member signup + share + legal pages).
  /^\/what-to-expect(\/.*)?$/,
  /^\/privacy(\/.*)?$/,
  /^\/sms-terms(\/.*)?$/,
  /^\/join(\/.*)?$/,
  // Auth pages and API routes
  /^\/admin\/sign-in(\/.*)?$/,
  /^\/sign-in(\/.*)?$/, // legacy Clerk routes — redirect handled in page
  /^\/sign-up(\/.*)?$/,
  /^\/pending(\/.*)?$/,
  /^\/api\/auth(\/.*)?$/,
  /^\/api\/public(\/.*)?$/,
  /^\/api\/og(\/.*)?$/,           // Phase B/D — verse plate + covenant card
  /^\/api\/webhooks(\/.*)?$/,
  /^\/api\/cron(\/.*)?$/,
  // SEO files
  /^\/sitemap\.xml$/,
  /^\/robots\.txt$/,
  /^\/feed\.xml$/,
];

function isPublic(pathname: string): boolean {
  return PUBLIC_ROUTES.some((re) => re.test(pathname));
}

const { auth } = NextAuth(authConfig);

// Session-gated paths only. Public routes return before this wrapper so
// the JWT is never decrypted for an ordinary page view.
const withSession = auth((req) => {
  if (!req.auth) {
    const signInUrl = new URL("/admin/sign-in", req.nextUrl);
    signInUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }
  return NextResponse.next();
});

export default function middleware(req: NextRequest, event: NextFetchEvent) {
  const { pathname } = req.nextUrl;

  // Studio compare: the LIVE iframe carries ?studio=published — forward the
  // request without the draftMode cookie so it renders as a true public
  // request (published theme/config/text, normal cache). Inert without
  // draftMode: no cookie, nothing to strip. Gated on isPublic so this
  // early return can never skip the session gate on a protected path (the
  // compare iframe only ever loads public pages).
  if (isPublic(pathname) && req.nextUrl.searchParams.get("studio") === "published") {
    const headers = new Headers(req.headers);
    const cookie = headers.get("cookie");
    if (cookie?.includes("__prerender_bypass")) {
      headers.set(
        "cookie",
        cookie.split("; ").filter((c) => !c.startsWith("__prerender_bypass")).join("; ")
      );
      return NextResponse.next({ request: { headers } });
    }
  }

  // Public routes pass through.
  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  // Everything else requires a session.
  // Auth.js types the wrapper as a route handler; as middleware it takes
  // (NextRequest, NextFetchEvent), which is what Next hands us here.
  return (withSession as unknown as (r: NextRequest, e: NextFetchEvent) => ReturnType<typeof withSession>)(
    req,
    event
  );
}

export const config = {
  matcher: [
    // Run on every route except Next.js internals and static assets.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
