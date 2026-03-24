import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/get-started(.*)",
  "/about(.*)",
  "/how-we-gather(.*)",
  "/faq(.*)",
  "/contact(.*)",
  "/giving(.*)",
  "/partnerships(.*)",
  "/locations(.*)",
  "/daily-scripture(.*)",
  "/scripture-reader(.*)",
  "/stories(.*)",
  "/blog(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/pending(.*)",
  "/api/webhooks(.*)",
  "/api/cron(.*)",
  "/api/public(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
