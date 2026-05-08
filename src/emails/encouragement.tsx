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

export interface EncouragementEmailProps {
  issueNumber: number;
  theme: string | null;
  title: string;
  intro: string | null;
  scriptures: { ref: string; note?: string; text?: string }[];
  guidance: string | null;
  notes: string | null;
  publicUrl: string;
  unsubscribeUrl?: string;
}

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

export function EncouragementEmail({
  issueNumber,
  theme,
  title,
  intro,
  scriptures,
  guidance,
  notes,
  publicUrl,
  unsubscribeUrl,
}: EncouragementEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{intro?.slice(0, 110) || title}</Preview>
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
              § The Letter · No. {issueNumber}
              {theme ? ` · ${theme}` : ""}
            </Text>
            <Text
              style={{
                ...SERIF,
                fontSize: "32px",
                lineHeight: 1.15,
                fontWeight: 600,
                margin: "12px 0 0",
              }}
            >
              {title}
            </Text>
          </Section>

          <Hr style={{ borderColor: "rgba(0,0,0,0.1)", margin: "32px 0" }} />

          {intro && (
            <Section>
              <Text style={{ ...SERIF, fontStyle: "italic", fontSize: "18px", color: "#3a3a3a", margin: 0 }}>
                {intro}
              </Text>
            </Section>
          )}

          {scriptures.length > 0 && (
            <Section style={{ marginTop: "28px" }}>
              {scriptures.map((s, i) => (
                <div
                  key={i}
                  style={{
                    borderLeft: "3px solid #C8932A",
                    padding: "4px 0 4px 14px",
                    margin: "12px 0",
                  }}
                >
                  <Text style={{ margin: 0, fontWeight: 600, fontSize: "14px" }}>
                    {s.ref}
                  </Text>
                  {s.text && (
                    <Text
                      style={{
                        ...SERIF,
                        margin: "6px 0 0",
                        fontSize: "15px",
                        fontStyle: "italic",
                      }}
                    >
                      {s.text}
                    </Text>
                  )}
                  {s.note && (
                    <Text
                      style={{
                        margin: "6px 0 0",
                        fontSize: "13px",
                        color: "#5a5a5a",
                      }}
                    >
                      {s.note}
                    </Text>
                  )}
                </div>
              ))}
            </Section>
          )}

          {guidance && (
            <Section style={{ marginTop: "28px" }}>
              {guidance.split(/\n\n+/).map((p, i) => (
                <Text key={i} style={{ ...SERIF, margin: "0 0 16px" }}>
                  {p}
                </Text>
              ))}
            </Section>
          )}

          {notes && (
            <Section style={{ marginTop: "28px" }}>
              <Text
                style={{
                  fontSize: "11px",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "#5a5a5a",
                  margin: "0 0 8px",
                }}
              >
                § Notes from the Watch
              </Text>
              {notes.split(/\n\n+/).map((p, i) => (
                <Text key={i} style={{ ...SERIF, margin: "0 0 12px", color: "#3a3a3a" }}>
                  {p}
                </Text>
              ))}
            </Section>
          )}

          <Hr style={{ borderColor: "rgba(0,0,0,0.1)", margin: "32px 0" }} />

          <Section>
            <Text style={{ margin: 0, fontSize: "14px" }}>
              <Link href={publicUrl} style={{ color: "#C8932A", textDecoration: "underline" }}>
                Read this on the site
              </Link>
            </Text>
          </Section>

          <Section style={{ marginTop: "32px" }}>
            <Text style={{ fontSize: "11px", color: "#7a7a7a", margin: 0 }}>
              Sheepdog Society · Acts 20:28 · Forth as sheepdogs.
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
