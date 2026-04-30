import { ImageResponse } from "next/og";
import { db } from "@/db";
import { members } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";

export const runtime = "nodejs";

// Vertical 1080×1920 — iMessage preview ratio + Instagram Story.
const SIZE = { width: 1080, height: 1920 };

const IRON = "#0E1624";
const BONE = "#F2EBDD";
const BRASS = "#C8932A";
const STONE = "#8A8275";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Lookup member. If not found (e.g. honeypot id "honeypot"), render a generic card.
  let firstName = "Brother";
  let city: string | null = null;
  try {
    const [row] = await db
      .select({
        name: members.name,
        city: members.city,
        state: members.state,
      })
      .from(members)
      .where(and(eq(members.id, id), isNull(members.deletedAt)))
      .limit(1);
    if (row) {
      firstName = row.name.trim().split(/\s+/)[0] ?? "Brother";
      city = row.city && row.state ? `${row.city}, ${row.state}` : row.city;
    }
  } catch {
    // Fall through with defaults.
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: IRON,
          color: BONE,
          padding: "120px 90px",
          position: "relative",
          fontFamily: "serif",
        }}
      >
        {/* Eyebrow */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            fontSize: 28,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: BRASS,
            fontFamily: "monospace",
          }}
        >
          <span>§ The Watch</span>
          <div
            style={{
              flex: 1,
              height: 1,
              background: STONE,
              opacity: 0.3,
            }}
          />
        </div>

        {/* Welcome line */}
        <div
          style={{
            display: "flex",
            marginTop: 80,
            fontSize: 56,
            color: BONE,
            opacity: 0.7,
            fontStyle: "italic",
            lineHeight: 1.2,
          }}
        >
          A brother saved a seat for
        </div>

        {/* First name — the show-stopper */}
        <div
          style={{
            display: "flex",
            marginTop: 30,
            fontSize: 230,
            lineHeight: 0.95,
            letterSpacing: -6,
            color: BRASS,
            fontWeight: 700,
            fontFamily: "serif",
          }}
        >
          {`${firstName}.`}
        </div>

        {city && (
          <div
            style={{
              display: "flex",
              marginTop: 30,
              fontSize: 36,
              color: STONE,
              fontFamily: "monospace",
              letterSpacing: 4,
              textTransform: "uppercase",
            }}
          >
            {city}
          </div>
        )}

        {/* Hairline above scripture */}
        <div
          style={{
            marginTop: 110,
            height: 1,
            width: 220,
            background: BRASS,
            opacity: 0.85,
          }}
        />

        {/* Acts 20:28 — the heart of the card */}
        <div
          style={{
            display: "flex",
            marginTop: 50,
            fontSize: 56,
            lineHeight: 1.35,
            color: BONE,
            fontStyle: "italic",
            fontFamily: "serif",
            maxWidth: 800,
          }}
        >
          Pay careful attention to yourselves and to all the flock.
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 36,
            fontSize: 30,
            letterSpacing: 6,
            color: BRASS,
            fontFamily: "monospace",
            textTransform: "uppercase",
          }}
        >
          Acts 20:28 · ESV
        </div>

        {/* Footer mark */}
        <div
          style={{
            marginTop: "auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: STONE,
            fontSize: 28,
            letterSpacing: 6,
            textTransform: "uppercase",
            fontFamily: "monospace",
          }}
        >
          <span>Sheepdog Society</span>
          <span style={{ color: BRASS }}>Stand watch</span>
        </div>
      </div>
    ),
    {
      ...SIZE,
      headers: {
        "Cache-Control": "public, immutable, max-age=31536000",
      },
    }
  );
}
