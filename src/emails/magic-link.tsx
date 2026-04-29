import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
  Hr,
} from "@react-email/components";

interface MagicLinkEmailProps {
  url: string;
  host: string;
  code: string;
}

// Sign-in code email. The CODE is the canonical path: the user types it
// into a form on /admin/sign-in (POST), which is immune to the email
// scanner / Outlook Safe Links / Gmail prefetcher problem that consumes
// one-time tokens before the user can click them. The link is kept as a
// fallback for clients that don't prefetch.
export function MagicLinkEmail({ url, host, code }: MagicLinkEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your sign-in code: {code}</Preview>
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
              Sheepdog Society
            </Text>
            <Text style={{ fontSize: "28px", fontWeight: 700, lineHeight: 1.2, marginBottom: 16 }}>
              Your sign-in code
            </Text>
            <Text style={{ fontSize: "16px", lineHeight: 1.55, marginBottom: 32 }}>
              Enter this code on the sign-in page:
            </Text>
          </Section>

          <Section style={{ textAlign: "center", marginBottom: 32 }}>
            <Text
              style={{
                fontSize: "44px",
                fontWeight: 700,
                letterSpacing: "0.25em",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                backgroundColor: "#1F2A2E",
                color: "#F2EBDD",
                padding: "20px 24px",
                borderRadius: 4,
                margin: "0 auto",
                display: "inline-block",
              }}
            >
              {code}
            </Text>
          </Section>

          <Section>
            <Text style={{ fontSize: "14px", color: "#5C6646", marginBottom: 8, textAlign: "center" }}>
              Go to <strong>{host}/admin/sign-in</strong> and enter the code above.
            </Text>
          </Section>

          <Hr style={{ borderColor: "#C7B79A", margin: "32px 0" }} />

          <Section>
            <Text style={{ fontSize: "13px", color: "#5C6646", lineHeight: 1.55 }}>
              The code works for 24 hours. If you didn&apos;t request this, ignore this email and the code will expire on its own.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default MagicLinkEmail;
