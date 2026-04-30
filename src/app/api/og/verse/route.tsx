import { ImageResponse } from "next/og";

export const runtime = "edge";

const IRON = "#1F2A2E";
const BONE = "#F2EBDD";
const BRASS = "#A6803A";
const STONE = "#C7B79A";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: IRON,
          color: BONE,
          padding: "72px 80px",
          fontFamily: "Georgia, serif",
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "24px",
            fontSize: "16px",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: BRASS,
          }}
        >
          <span>§ I &middot; The Watch</span>
          <div
            style={{
              flex: 1,
              height: "1px",
              backgroundColor: "rgba(199, 183, 154, 0.25)",
            }}
          />
        </div>

        <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: "104px",
              lineHeight: 1.02,
              letterSpacing: "-0.03em",
              fontWeight: 600,
            }}
          >
            <span style={{ color: BRASS }}>Keep watch</span>
            <span>over yourselves</span>
            <span>and all the flock.</span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "24px",
            fontSize: "16px",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: BRASS,
          }}
        >
          <div
            style={{
              flex: 1,
              height: "1px",
              backgroundColor: "rgba(199, 183, 154, 0.25)",
            }}
          />
          <span>Acts 20:28 &middot; ESV</span>
        </div>

        <div
          style={{
            position: "absolute",
            bottom: "32px",
            right: "80px",
            fontSize: "14px",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: STONE,
            opacity: 0.6,
          }}
        >
          Sheepdog Society
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
