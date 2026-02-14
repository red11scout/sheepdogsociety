import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { channels } from "./schema";

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString, { prepare: false });
const db = drizzle(client);

const SYSTEM_USER_ID = "system"; // placeholder for system-created channels

async function seed() {
  console.log("Seeding default channels...");

  const defaultChannels = [
    {
      name: "general",
      type: "org" as const,
      description: "Main community channel. All members welcome.",
      createdBy: SYSTEM_USER_ID,
    },
    {
      name: "announcements",
      type: "org" as const,
      description: "Organization-wide announcements from leadership.",
      createdBy: SYSTEM_USER_ID,
    },
    {
      name: "prayer-wall",
      type: "org" as const,
      description: "Share prayer requests with the community.",
      createdBy: SYSTEM_USER_ID,
    },
    {
      name: "leaders-lounge",
      type: "leaders" as const,
      description:
        "Private channel for group leaders and assistant leaders.",
      createdBy: SYSTEM_USER_ID,
    },
  ];

  for (const channel of defaultChannels) {
    await db
      .insert(channels)
      .values(channel)
      .onConflictDoNothing();
  }

  console.log("Seed complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
