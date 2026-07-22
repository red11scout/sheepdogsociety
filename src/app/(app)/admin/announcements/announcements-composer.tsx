"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { Send, FlaskConical, Users, Crown, MapPin } from "lucide-react";
import {
  sendAnnouncement,
  type AnnouncementAudience,
  type AnnouncementHistoryRow,
} from "@/server/announcements";

const AUDIENCES: {
  key: AnnouncementAudience;
  label: string;
  detail: string;
  icon: typeof Users;
}[] = [
  {
    key: "all",
    label: "All subscribed members",
    detail: "Every active member with the Letter box checked",
    icon: Users,
  },
  {
    key: "leaders",
    label: "Leaders only",
    detail: "Group leaders and assistant leaders",
    icon: Crown,
  },
  {
    key: "groups",
    label: "Men in groups",
    detail: "Members assigned to a group",
    icon: MapPin,
  },
];

export function AnnouncementsComposer({
  counts,
  history,
  dbError,
}: {
  counts: Record<AnnouncementAudience, number>;
  history: AnnouncementHistoryRow[];
  dbError: string;
}) {
  const [audience, setAudience] = useState<AnnouncementAudience>("all");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState<"test" | "send" | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [sentLog, setSentLog] = useState<AnnouncementHistoryRow[]>(history);

  const recipientCount = counts[audience];
  const canCompose = subject.trim().length > 0 && body.trim().length > 0;

  async function run(testOnly: boolean) {
    setBusy(testOnly ? "test" : "send");
    setNotice(null);
    try {
      const res = await sendAnnouncement({
        subject,
        body,
        ctaLabel: ctaLabel || undefined,
        ctaUrl: ctaUrl || undefined,
        audience,
        testOnly,
      });
      if (res.ok) {
        if (testOnly) {
          setNotice({ ok: true, text: "Test sent. Check your inbox." });
        } else {
          setNotice({
            ok: true,
            text: `Sent to ${res.sent} ${res.sent === 1 ? "man" : "men"}.`,
          });
          setSubject("");
          setBody("");
          setCtaLabel("");
          setCtaUrl("");
          setSentLog((prev) => [
            {
              id: `local-${Date.now()}`,
              subject: subject.trim(),
              audience,
              audienceLabel:
                AUDIENCES.find((a) => a.key === audience)?.label ?? audience,
              recipientCount: res.sent,
              sentAt: new Date().toISOString(),
            },
            ...prev,
          ]);
        }
      } else {
        setNotice({
          ok: false,
          text:
            res.reason ??
            (res.failed > 0
              ? `${res.failed} of ${res.sent + res.failed} failed to send. Check the server logs.`
              : "That did not go through."),
        });
      }
    } catch (err) {
      setNotice({
        ok: false,
        text: err instanceof Error ? err.message : "That did not go through.",
      });
    }
    setBusy(null);
    setConfirming(false);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6 md:p-10">
      <div>
        <h1 className="text-2xl font-bold">Announcements</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A branded email from shepherd@acts2028sheepdogsociety.com. Replies
          land with Jeremy.
        </p>
      </div>

      {dbError && (
        <Card className="border-destructive/50">
          <CardContent className="p-4 text-sm text-destructive">{dbError}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Who gets it</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          {AUDIENCES.map((a) => {
            const ActiveIcon = a.icon;
            const active = audience === a.key;
            return (
              <button
                key={a.key}
                type="button"
                onClick={() => {
                  setAudience(a.key);
                  setConfirming(false);
                }}
                aria-pressed={active}
                className={`rounded-md border p-4 text-left transition-colors ${
                  active
                    ? "border-bronze bg-bronze/10"
                    : "border-border hover:border-bronze/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <ActiveIcon className="h-4 w-4 text-bronze" />
                  <span className="text-sm font-semibold">{a.label}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{a.detail}</p>
                <Badge variant="secondary" className="mt-2">
                  {counts[a.key]} {counts[a.key] === 1 ? "man" : "men"}
                </Badge>
              </button>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">The message</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium" htmlFor="ann-subject">
              Subject
            </label>
            <Input
              id="ann-subject"
              value={subject}
              maxLength={200}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Men's breakfast this Saturday"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="ann-body">
              Message
            </label>
            <Textarea
              id="ann-body"
              value={body}
              maxLength={10000}
              rows={8}
              onChange={(e) => setBody(e.target.value)}
              placeholder={"Brothers,\n\nWrite it the way you would say it. Blank lines start new paragraphs."}
              className="mt-1"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium" htmlFor="ann-cta-label">
                Button label (optional)
              </label>
              <Input
                id="ann-cta-label"
                value={ctaLabel}
                maxLength={60}
                onChange={(e) => setCtaLabel(e.target.value)}
                placeholder="See the details"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="ann-cta-url">
                Button link
              </label>
              <Input
                id="ann-cta-url"
                value={ctaUrl}
                maxLength={500}
                onChange={(e) => setCtaUrl(e.target.value)}
                placeholder="https://www.acts2028sheepdogsociety.com/events"
                className="mt-1"
              />
            </div>
          </div>

          {notice && (
            <p
              className={`text-sm ${notice.ok ? "text-bronze" : "text-destructive"}`}
              role="status"
            >
              {notice.text}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Button
              variant="outline"
              disabled={!canCompose || busy !== null}
              onClick={() => run(true)}
            >
              <FlaskConical className="mr-1 h-4 w-4" />
              {busy === "test" ? "Sending test..." : "Send test to me"}
            </Button>
            {!confirming ? (
              <Button
                disabled={!canCompose || busy !== null || recipientCount === 0}
                onClick={() => setConfirming(true)}
              >
                <Send className="mr-1 h-4 w-4" />
                Send to {recipientCount} {recipientCount === 1 ? "man" : "men"}
              </Button>
            ) : (
              <>
                <Button disabled={busy !== null} onClick={() => run(false)}>
                  {busy === "send"
                    ? "Sending..."
                    : `Yes — send to ${recipientCount} ${recipientCount === 1 ? "man" : "men"}`}
                </Button>
                <Button
                  variant="ghost"
                  disabled={busy !== null}
                  onClick={() => setConfirming(false)}
                >
                  Cancel
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Sent</h2>
        {sentLog.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing sent yet. The history of every announcement lands here.
          </p>
        ) : (
          <div className="space-y-2">
            {sentLog.map((row) => (
              <Card key={row.id}>
                <CardContent className="flex flex-wrap items-center gap-3 p-3">
                  <Badge variant="secondary">{row.audienceLabel}</Badge>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {row.subject}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {row.recipientCount} sent ·{" "}
                    {format(new Date(row.sentAt), "MMM d, yyyy h:mm a")}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
