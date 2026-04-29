// Clerk webhook handler — disabled after Auth.js v5 migration.
// Kept as a 410 GONE so any straggling Clerk delivery attempts get a clear
// signal rather than a 404 that auto-retries forever.

export async function POST() {
  return new Response("Clerk webhooks are no longer accepted; auth migrated to Auth.js v5", {
    status: 410,
  });
}
