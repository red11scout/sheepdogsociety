import { ZodError } from "zod";

const FIELD_LABELS: Record<string, string> = {
  voiceFreeform: "Custom voice description",
  title: "Title",
  theme: "Theme",
  voiceId: "Voice",
  totalCount: "Number of letters",
};

/**
 * Turns a ZodError into one plain sentence for the admin — ZodError's own
 * `.message` is a JSON-stringified issues array, which reads as a bug
 * report, not a form error, if shown as-is.
 */
export function friendlyZodError(err: unknown): string {
  if (!(err instanceof ZodError)) {
    return err instanceof Error ? err.message : "Something didn't validate.";
  }
  const issue = err.issues[0];
  if (!issue) return "Something didn't validate.";
  const field = FIELD_LABELS[String(issue.path[0])] ?? String(issue.path[0] ?? "That field");
  if (issue.code === "too_big") {
    return `${field} is too long — trim it to ${issue.maximum} characters or fewer.`;
  }
  if (issue.code === "too_small") {
    return `${field} is too short — it needs at least ${issue.minimum} characters.`;
  }
  return `${field}: ${issue.message}`;
}
