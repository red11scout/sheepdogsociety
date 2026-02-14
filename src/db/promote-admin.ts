/**
 * Promote a user to admin role and set them as active.
 *
 * Usage: npx tsx src/db/promote-admin.ts <email>
 * Example: npx tsx src/db/promote-admin.ts jeremy@example.com
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { users } from "./schema";
import { eq } from "drizzle-orm";

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString, { prepare: false });
const db = drizzle(client);

async function promoteAdmin() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npx tsx src/db/promote-admin.ts <email>");
    process.exit(1);
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email));

  if (!user) {
    console.error(`No user found with email: ${email}`);
    console.log("\nAvailable users:");
    const allUsers = await db
      .select({ id: users.id, email: users.email, role: users.role, status: users.status })
      .from(users);
    allUsers.forEach((u) =>
      console.log(`  ${u.email} (${u.role}, ${u.status})`)
    );
    process.exit(1);
  }

  const [updated] = await db
    .update(users)
    .set({
      role: "admin",
      status: "active",
      approvedBy: "system",
      approvedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id))
    .returning();

  console.log(`\n✓ Promoted ${updated.email} to admin (active)`);
  console.log(`  ID: ${updated.id}`);
  console.log(`  Name: ${updated.firstName} ${updated.lastName}`);
  console.log(`  Role: ${updated.role}`);
  console.log(`  Status: ${updated.status}`);
  process.exit(0);
}

promoteAdmin().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
