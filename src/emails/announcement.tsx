import {
  Body,
  Container,
  Head,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Hr,
} from "@react-email/components";

export interface AnnouncementEmailProps {
  subject: string;
  /** Plain text; blank lines split paragraphs, same as the weekly letter. */
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  unsubscribeUrl?: string;
}

/**
 * Branded shepherd@ announcement — same broadsheet look as the weekly
 * letter email (cream field, ink serif, brass accents) so everything a
 * man receives from the Society reads as one voice.
 */

const BASE: React.CSSProperties = {
  backgroundColor: "#F2EBDD",
  fontFamily:
    "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  color: "#1F2A2E",
  margin: 0,
  padding: 0,
};

const SERIF: React.CSSProperties = {
  fontFamily: "Georgia, 'Times New Roman', serif",
  color: "#1F2A2E",
  lineHeight: 1.7,
  fontSize: "16px",
};

export function AnnouncementEmail({
  subject,
  body,
  ctaLabel,
  ctaUrl,
  unsubscribeUrl,
}: AnnouncementEmailProps) {
  const paragraphs = body.split(/\n\n+/).filter((p) => p.trim());
  return (
    <Html>
      <Head />
      <Preview>{paragraphs[0]?.slice(0, 110) || subject}</Preview>
      <Body style={BASE}>
        <Container style={{ maxWidth: "640px", margin: "0 auto", padding: "32px 24px" }}>
          <Section>
            <Text
              style={{
                fontSize: "11px",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#C8932A",
                margin: "0 0 4px",
              }}
            >
              § From the Shepherd
            </Text>
            <Text
              style={{
                ...SERIF,
                fontSize: "30px",
                lineHeight: 1.15,
                fontWeight: 600,
                margin: "12px 0 0",
              }}
            >
              {subject}
            </Text>
          </Section>

          <Hr style={{ borderColor: "rgba(0,0,0,0.1)", margin: "32px 0" }} />

          <Section>
            {paragraphs.map((p, i) => (
              <Text key={i} style={{ ...SERIF, margin: "0 0 16px" }}>
                {p}
              </Text>
            ))}
          </Section>

          {ctaLabel && ctaUrl && (
            <Section style={{ marginTop: "24px" }}>
              <Link
                href={ctaUrl}
                style={{
                  display: "inline-block",
                  backgroundColor: "#1F2A2E",
                  color: "#F2EBDD",
                  fontSize: "13px",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  textDecoration: "none",
                  padding: "12px 28px",
                }}
              >
                {ctaLabel}
              </Link>
            </Section>
          )}

          <Hr style={{ borderColor: "rgba(0,0,0,0.1)", margin: "32px 0" }} />

          <Section>
            <Text style={{ ...SERIF, fontStyle: "italic", fontSize: "14px", color: "#3a3a3a", margin: 0 }}>
              Acts 20:28 — Pay careful attention to yourselves and to all the
              flock.
            </Text>
          </Section>

          <Section style={{ marginTop: "24px" }}>
            <Text style={{ fontSize: "11px", color: "#7a7a7a", margin: 0 }}>
              Sheepdog Society · Acts 20:28 · Forth as sheepdogs.
            </Text>
            <Text style={{ fontSize: "11px", color: "#7a7a7a", margin: "6px 0 0" }}>
              Reply to this email and it lands with Jeremy.
            </Text>
            {unsubscribeUrl && (
              <Text style={{ fontSize: "11px", color: "#7a7a7a", margin: "6px 0 0" }}>
                <Link href={unsubscribeUrl} style={{ color: "#7a7a7a" }}>
                  Unsubscribe
                </Link>
              </Text>
            )}
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
