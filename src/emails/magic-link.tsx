import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
  Hr,
  Link,
} from "@react-email/components";

interface MagicLinkEmailProps {
  url: string;
  host: string;
}

// Brand-consistent magic-link email.
// CRITICAL: includes a plaintext URL below the button. Outlook Safe Links
// pre-fetches HTML buttons and that pre-fetch *consumes* the one-time token,
// so admins on Outlook would get "link expired" errors clicking afterward.
// The plaintext URL is their fallback — they can copy/paste it into a browser.
export function MagicLinkEmail({ url, host }: MagicLinkEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your sign-in link for {host}</Preview>
      <Body
        style={{
          backgroundColor: "#F2EBDD",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
          color: "#1F2A2E",
        }}
      >
        <Container style={{ maxWidth: "560px", margin: "40px auto", padding: "0 24px" }}>
          <Section>
            <Text style={{ fontSize: "12px", letterSpacing: "0.18em", textTransform: "uppercase", color: "#5C6646", marginBottom: 24 }}>
              Acts 2028 Sheepdog Society
            </Text>
            <Text style={{ fontSize: "28px", fontWeight: 700, lineHeight: 1.2, marginBottom: 16 }}>
              Sign in
            </Text>
            <Text style={{ fontSize: "16px", lineHeight: 1.55, marginBottom: 32 }}>
              Click the button below to sign in to the admin portal. The link works for 24 hours.
            </Text>
          </Section>

          <Section style={{ textAlign: "center", marginBottom: 32 }}>
            <Button
              href={url}
              style={{
                backgroundColor: "#1F2A2E",
                color: "#F2EBDD",
                padding: "14px 32px",
                fontSize: "16px",
                fontWeight: 600,
                borderRadius: 4,
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              Sign in →
            </Button>
          </Section>

          <Section>
            <Text style={{ fontSize: "14px", color: "#5C6646", marginBottom: 8 }}>
              Or copy and paste this URL into your browser:
            </Text>
            <Text style={{ fontSize: "13px", wordBreak: "break-all", color: "#1B3A4B", marginBottom: 32 }}>
              <Link href={url} style={{ color: "#1B3A4B" }}>{url}</Link>
            </Text>
          </Section>

          <Hr style={{ borderColor: "#C7B79A", margin: "32px 0" }} />

          <Section>
            <Text style={{ fontSize: "13px", color: "#5C6646", lineHeight: 1.55 }}>
              You are receiving this because someone — probably you — entered your email address at the admin sign-in page. If that wasn&apos;t you, ignore this message and the link will expire on its own.
            </Text>
            <Text style={{ fontSize: "12px", color: "#5C6646", marginTop: 16, fontStyle: "italic" }}>
              &ldquo;Be on guard for yourselves and for all the flock, among which the Holy Spirit has made you overseers, to shepherd the church of God.&rdquo; — Acts 20:28
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default MagicLinkEmail;
