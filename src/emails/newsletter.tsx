import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
  Hr,
  Link,
} from "@react-email/components";

interface NewsletterEmailProps {
  issueNumber: number;
  themeWord: string | null;
  title: string;
  subtitle: string | null;
  bodyHtml: string;
  publicUrl: string;
  unsubscribeUrl?: string;
}

export function NewsletterEmail({
  issueNumber,
  themeWord,
  title,
  subtitle,
  bodyHtml,
  publicUrl,
  unsubscribeUrl,
}: NewsletterEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{subtitle || title}</Preview>
      <Body
        style={{
          backgroundColor: "#F2EBDD",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
          color: "#1F2A2E",
          margin: 0,
          padding: 0,
        }}
      >
        <Container style={{ maxWidth: "640px", margin: "0 auto", padding: "32px 24px" }}>
          <Section>
            <Text
              style={{
                fontSize: "11px",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#5C6646",
                margin: "0 0 4px",
              }}
            >
              Acts 2028 Sheepdog Society
            </Text>
            <Text
              style={{
                fontSize: "11px",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#A6803A",
                margin: "0 0 32px",
              }}
            >
              Issue No. {issueNumber}
              {themeWord ? ` · ${themeWord}` : ""}
            </Text>

            <Text
              style={{
                fontSize: "32px",
                fontWeight: 700,
                lineHeight: 1.1,
                fontFamily: "Georgia, 'Times New Roman', serif",
                margin: "0 0 12px",
              }}
            >
              {title}
            </Text>

            {subtitle ? (
              <Text
                style={{
                  fontSize: "18px",
                  fontStyle: "italic",
                  color: "#5C6646",
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  lineHeight: 1.5,
                  margin: "0 0 32px",
                }}
              >
                {subtitle}
              </Text>
            ) : null}
          </Section>

          <Hr style={{ borderColor: "#C7B79A", margin: "24px 0" }} />

          <Section>
            {/* The DB-rendered bodyHtml is trusted here because Tiptap output is
                already sanitized at write time and admins are allowlisted. */}
            <div
              style={{
                fontSize: "16px",
                lineHeight: 1.65,
                color: "#1F2A2E",
              }}
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
          </Section>

          <Hr style={{ borderColor: "#C7B79A", margin: "32px 0" }} />

          <Section>
            <Text style={{ fontSize: "14px", color: "#5C6646", margin: "0 0 8px" }}>
              <Link href={publicUrl} style={{ color: "#A6803A" }}>
                Read on the web
              </Link>
              {unsubscribeUrl ? (
                <>
                  {" · "}
                  <Link href={unsubscribeUrl} style={{ color: "#5C6646" }}>
                    Unsubscribe
                  </Link>
                </>
              ) : null}
            </Text>
            <Text
              style={{
                fontSize: "12px",
                fontStyle: "italic",
                color: "#5C6646",
                fontFamily: "Georgia, 'Times New Roman', serif",
                margin: "16px 0 0",
                lineHeight: 1.5,
              }}
            >
              &ldquo;Be on guard for yourselves and for all the flock.&rdquo; — Acts 20:28
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default NewsletterEmail;
