// The Letter autopilot engine (spec Phase C, Task 6). Runs once a week
// from /api/cron/autopilot-letters and, when the scheduled queue is low,
// writes the next four-week block: proposes a season-aware theme in the
// next theologian's voice, generates four letters, verifies every
// scripture reference, persists the survivors as a scheduled series,
// generates covers, and emails the shepherd a plain-text summary.
//
// Import-safe by design: no top-level side effects (db is a lazy Proxy,
// resend() is lazy, the anthropic provider reads env at call time), so a
// dry-run script can `import { runAutopilot }` and call it with
// { dryRun: true } to exercise the full generation pipeline without
// persisting letters, updating autopilot state, or sending email.
// (AI calls still log to ai_generations in a dry run: the calls are real
// and the repo rule is that every AI call is logged.)
//
// Disabled by default: the single letter_autopilot row ships with
// enabled=false and this engine creates it that way if it is missing.

import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  aiGenerations,
  letterAutopilot,
  letterSeries,
  weeklyEncouragements,
} from "@/db/schema";
import { SYSTEM_PROMPT } from "@/lib/ai/system-prompt";
import { THEOLOGIAN_VOICES, type TheologianVoice } from "@/lib/ai/voices";
import { findBannedLanguage } from "@/lib/ai/banned";
import { scrubAiPayload } from "@/lib/ai/scrub";
import {
  generateLetterSeries,
  SERIES_PLAN_PROMPT_VERSION,
  type SeriesPlan,
} from "@/lib/ai/letter-series";
import { verifyReference } from "@/lib/letters/verify-reference";
import {
  seasonForDate,
  chicagoDateParts,
  type SeasonContext,
} from "@/lib/letters/theme-calendar";
import {
  createSeriesWithLettersCore,
  type DraftLetter,
} from "@/server/letters/series-core";
import { generateCoverImage } from "@/server/letters/cover-image";
import {
  getOrCreatePilotRow,
  computeBlockDates,
  BLOCK_SIZE,
  PUBLISH_HOUR,
  pad2,
} from "@/server/letters/autopilot-state";
import { resend, FROM_TRANSACTIONAL } from "@/lib/email";

const MODEL = "claude-sonnet-4-5";
export const AUTOPILOT_THEME_PROMPT_VERSION = "letter-autopilot-theme.v1";

const SHEPHERD_EMAIL = "shepherd@acts2028sheepdogsociety.com";
const KILL_SWITCH_LINE =
  "To stop the autopilot: /admin/encouragements, Autopilot card, one toggle.";

export interface AutopilotRunReport {
  ran: boolean; // false when disabled or enough letters scheduled
  reason?: string; // "disabled" | "3 letters already scheduled" | ...
  theme?: string;
  voice?: string;
  scheduled: { id: string; title: string; scheduledFor: string }[];
  gaps: { position: number; reason: string }[];
  verificationSkipped?: boolean; // ESV unavailable this run
  coversGenerated: number;
  dryRun?: boolean;
}

interface WeekPlan {
  position: number;
  scheduledFor: Date;
  parts: { year: number; month: number; day: number };
  season: SeasonContext;
}

// ------------------------------------------------------------------
// Small pure helpers
// ------------------------------------------------------------------

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatChicagoDate(parts: { year: number; month: number; day: number }): string {
  return `${MONTH_NAMES[parts.month - 1]} ${parts.day}, ${parts.year}`;
}

function seasonLine(week: WeekPlan): string {
  const cultural = week.season.cultural ? ` (${week.season.cultural})` : "";
  return `Week ${week.position}, publishing ${formatChicagoDate(week.parts)}: ${week.season.liturgical}${cultural}`;
}

function skipped(reason: string, dryRun: boolean): AutopilotRunReport {
  return {
    ran: false,
    reason,
    scheduled: [],
    gaps: [],
    coversGenerated: 0,
    ...(dryRun ? { dryRun } : {}),
  };
}

// ------------------------------------------------------------------
// ai_generations logging (inline insert pattern, per the field-notes
// route). entityType "letter"; userId is the autopilot's authorId,
// which may legitimately be null before an admin configures one.
// ------------------------------------------------------------------

async function logGeneration(entry: {
  prompt: string;
  promptVersion: string;
  output: string;
  tokensIn?: number;
  tokensOut?: number;
  userId: string | null;
  entityId?: string | null;
}): Promise<void> {
  try {
    await db.insert(aiGenerations).values({
      type: "draft",
      prompt: entry.prompt.slice(0, 4000),
      promptVersion: entry.promptVersion,
      model: MODEL,
      output: entry.output.slice(0, 8000),
      inputTokens: entry.tokensIn ?? null,
      outputTokens: entry.tokensOut ?? null,
      entityType: "letter",
      entityId: entry.entityId ?? null,
      userId: entry.userId,
    });
  } catch (err) {
    console.error("autopilot ai_generations log failed", err);
  }
}

// ------------------------------------------------------------------
// Emails. Plain text, brand voice, no em-dashes. Returns whether the
// send succeeded. Alert emails treat a failure as best-effort (logged,
// never blocking: the run already stopped and nothing will publish).
// The VISIBILITY email is different: it is the sole compensating
// control for unreviewed publishing, so its caller checks the return
// and reverts the persisted block when the send fails.
// ------------------------------------------------------------------

async function sendEmail(subject: string, text: string): Promise<boolean> {
  try {
    const { error } = await resend().emails.send({
      from: FROM_TRANSACTIONAL,
      to: SHEPHERD_EMAIL,
      subject,
      text,
    });
    if (error) {
      console.error("autopilot email rejected", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("autopilot email failed", err);
    return false;
  }
}

function buildAlertBody(reason: string): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.acts2028sheepdogsociety.com";
  return [
    "Brother,",
    "",
    `The letter autopilot ran this morning and stopped: ${reason}.`,
    "",
    `No letters were scheduled. It will try again next Monday. If the calendar needs a letter before then, schedule one at ${site}/admin/encouragements.`,
    "",
    KILL_SWITCH_LINE,
  ].join("\n");
}

// ------------------------------------------------------------------
// Theme proposal. generateObject with the bare anthropic provider,
// claude-sonnet-4-5, SYSTEM_PROMPT + voice addendum. The schema carries
// ZERO size constraints (Anthropic structured output rejects them, same
// workaround as generate-field-notes.ts); length and banned-language are
// enforced post-response with a two-attempt budget.
// ------------------------------------------------------------------

const themeSchema = z.object({
  theme: z.string().describe("The theme: 1 to 3 words, concrete, weighty."),
  rationale: z
    .string()
    .describe("Two or three sentences on why this theme, for these weeks, in this voice."),
});

type ThemeProposal =
  | { ok: true; theme: string; rationale: string; tokensIn: number; tokensOut: number }
  | { ok: false; detail: string; tokensIn: number; tokensOut: number };

async function proposeTheme(input: {
  voice: TheologianVoice;
  seasonBlock: string;
  recentThemes: string[];
}): Promise<ThemeProposal> {
  const system = `${SYSTEM_PROMPT}\n\n${input.voice.systemAddendum}`.trim();

  const recentBlock = input.recentThemes.length
    ? `\n\nRecent autopilot themes. Do NOT repeat any of these, and do not propose a light rephrase of one:\n${input.recentThemes.map((t) => `- ${t}`).join("\n")}`
    : "";

  const prompt = `Propose ONE theme for the next four weekly Letters to the men of the Sheepdog Society.

Rules for the theme:
- 1 to 3 words. Short enough for a man to carry through his week.
- Concrete and scriptural in weight, not abstract branding language.
- It must hold up across four letters, each taking it apart from a different angle.

The four letters will publish on these weeks:
${input.seasonBlock}

Let those seasons shape the choice. A theme that lands in this stretch of the calendar beats one that could run any week of the year.${recentBlock}

Return:
- theme: the 1 to 3 word theme
- rationale: two or three sentences on why this theme, for these weeks, in this voice.`;

  let totalIn = 0;
  let totalOut = 0;
  let lastDetail = "";

  for (let attempt = 1; attempt <= 2; attempt++) {
    let object: z.infer<typeof themeSchema>;
    try {
      const result = await generateObject({
        model: anthropic(MODEL),
        system,
        prompt,
        schema: themeSchema,
        temperature: attempt === 1 ? 0.7 : 0.5,
        maxRetries: 1,
      });
      object = scrubAiPayload(result.object);
      totalIn += result.usage?.inputTokens ?? 0;
      totalOut += result.usage?.outputTokens ?? 0;
    } catch (err) {
      console.error("autopilot theme generation error", err);
      return {
        ok: false,
        detail: err instanceof Error ? err.message.slice(0, 400) : "generateObject threw",
        tokensIn: totalIn,
        tokensOut: totalOut,
      };
    }

    const theme = object.theme.trim();
    const words = theme.split(/\s+/).filter(Boolean);
    if (words.length < 1 || words.length > 3 || theme.length > 60) {
      lastDetail = `theme "${theme.slice(0, 80)}" is not 1-3 words`;
      console.warn(`autopilot theme attempt ${attempt} rejected: ${lastDetail}`);
      continue;
    }
    const banned = findBannedLanguage(theme);
    if (banned.length > 0) {
      lastDetail = `theme "${theme}" used banned language: ${banned.join(", ")}`;
      console.warn(`autopilot theme attempt ${attempt} rejected: ${lastDetail}`);
      continue;
    }

    return {
      ok: true,
      theme,
      rationale: object.rationale.trim(),
      tokensIn: totalIn,
      tokensOut: totalOut,
    };
  }

  return { ok: false, detail: lastDetail || "validation failed twice", tokensIn: totalIn, tokensOut: totalOut };
}

// ------------------------------------------------------------------
// The run itself
// ------------------------------------------------------------------

type PlanLetter = SeriesPlan["letters"][number];

function toDraft(letter: PlanLetter, position: number): DraftLetter {
  return {
    position,
    title: letter.title,
    intro: letter.intro,
    scriptures: letter.scriptures,
    guidance: letter.guidance,
    notes: letter.notes,
    callToAction: letter.callToAction,
  };
}

export async function runAutopilot(opts?: { dryRun?: boolean }): Promise<AutopilotRunReport> {
  const dryRun = opts?.dryRun ?? false;
  // Dry-run AI calls are real spend; the tag keeps cost analysis honest.
  const dryTag = dryRun ? " (dry run)" : "";

  // 1. Load the single autopilot row; create it (disabled) if missing.
  const pilot = await getOrCreatePilotRow();
  if (!pilot.enabled) {
    return skipped("disabled", dryRun);
  }

  // Overlap guard (a): the weekly cron and a manual re-fire (curl with
  // the Bearer secret) can race or double-fire. A real run inside the
  // last 24 hours means this one stands down. Dry runs skip the guard:
  // they persist nothing, so they cannot double-book the calendar.
  if (
    !dryRun &&
    pilot.lastRunAt &&
    Date.now() - pilot.lastRunAt.getTime() < 24 * 3600 * 1000
  ) {
    return skipped("ran recently", dryRun);
  }

  // 2. How many letters are already scheduled? Two or more means the
  // queue is healthy and this run stands down.
  const scheduledRows = await db
    .select({ scheduledFor: weeklyEncouragements.scheduledFor })
    .from(weeklyEncouragements)
    .where(
      and(
        eq(weeklyEncouragements.status, "scheduled"),
        isNull(weeklyEncouragements.deletedAt)
      )
    );
  if (scheduledRows.length >= 2) {
    return skipped(`${scheduledRows.length} letters already scheduled`, dryRun);
  }

  // 3. Block dates: the new block starts one week after the last
  // scheduled letter (fallback: now). Letters land at +7d, +14d, +21d,
  // +28d from that anchor, publish hour 6am Central, exactly as
  // computeScheduledFor will persist them. The pure computation lives in
  // computeBlockDates (autopilot-state.ts) so it can be unit tested
  // without a database.
  let maxScheduledFor: Date | null = null;
  for (const row of scheduledRows) {
    if (row.scheduledFor && (!maxScheduledFor || row.scheduledFor.getTime() > maxScheduledFor.getTime())) {
      maxScheduledFor = row.scheduledFor;
    }
  }
  const blockDates = computeBlockDates(maxScheduledFor, new Date());
  const startParts = chicagoDateParts(blockDates[0]);
  const startDate = `${startParts.year}-${pad2(startParts.month)}-${pad2(startParts.day)}`;

  // 4. Season context for each of the four weeks.
  const weeks: WeekPlan[] = blockDates.map((scheduledFor, i) => {
    const parts = chicagoDateParts(scheduledFor);
    return { position: i + 1, scheduledFor, parts, season: seasonForDate(parts) };
  });
  const seasonBlock = weeks.map(seasonLine).join("\n");

  // 5. Next theologian in the rotation.
  const voice = THEOLOGIAN_VOICES[pilot.voiceRotationIndex % THEOLOGIAN_VOICES.length];

  // 6. Theme proposal, informed by the last 3 autopilot block themes.
  const recentSeries = await db
    .select({ theme: letterSeries.theme })
    .from(letterSeries)
    .where(eq(letterSeries.origin, "autopilot"))
    .orderBy(desc(letterSeries.createdAt))
    .limit(3);
  const recentThemes = recentSeries.map((r) => r.theme).filter(Boolean);

  const proposal = await proposeTheme({ voice, seasonBlock, recentThemes });
  await logGeneration({
    prompt: `autopilot theme: block starting ${startDate}, voice ${voice.name}${dryTag}`,
    promptVersion: AUTOPILOT_THEME_PROMPT_VERSION,
    output: proposal.ok
      ? JSON.stringify({ theme: proposal.theme, rationale: proposal.rationale })
      : `FAILED: ${proposal.detail}`,
    tokensIn: proposal.tokensIn || undefined,
    tokensOut: proposal.tokensOut || undefined,
    userId: pilot.defaultAuthorId,
  });
  if (!proposal.ok) {
    if (!dryRun) {
      await sendEmail(
        "The letter autopilot could not finish this week",
        buildAlertBody(`theme generation failed (${proposal.detail})`)
      );
    }
    return skipped("theme generation failed", dryRun);
  }
  const theme = proposal.theme;

  // 7. Generate the four-letter series. generateLetterSeries runs its
  // own banned-language + CTA validation with a 2-attempt loop and
  // throws when both attempts fail.
  let plan: SeriesPlan & { tokensIn?: number; tokensOut?: number };
  try {
    plan = await generateLetterSeries({
      title: theme,
      theme,
      voiceId: voice.id,
      totalCount: BLOCK_SIZE,
      callToActionRequired: true,
      seasonContext: seasonBlock,
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message.slice(0, 400) : "";
    console.error("autopilot series generation failed:", err);
    await logGeneration({
      prompt: `autopilot series: ${theme} (${voice.name})${dryTag}`,
      promptVersion: SERIES_PLAN_PROMPT_VERSION,
      output: `FAILED: ${detail}`,
      userId: pilot.defaultAuthorId,
    });
    if (!dryRun) {
      await sendEmail(
        "The letter autopilot could not finish this week",
        buildAlertBody(`series generation failed (${detail})`)
      );
    }
    return skipped("series generation failed", dryRun);
  }
  await logGeneration({
    prompt: `autopilot series: ${theme} (${voice.name})${dryTag}`,
    promptVersion: SERIES_PLAN_PROMPT_VERSION,
    output: JSON.stringify(plan.letters),
    tokensIn: plan.tokensIn,
    tokensOut: plan.tokensOut,
    userId: pilot.defaultAuthorId,
  });

  // Normalize positions to exactly 1..4 by series order. The generator's
  // validation pins the count but not position uniqueness; the positions
  // drive publish dates, so they must be trustworthy.
  const ordered = [...plan.letters].sort((a, b) => a.position - b.position);

  // 8. Scripture gate: verify every reference. Any "invalid" gets ONE
  // single-letter regeneration (same theme/voice, season scoped to that
  // week, original position kept); a second failure becomes a gap week.
  // "unavailable" (ESV down / no key) never drops a letter, it only
  // flags the run for review.
  const gaps: { position: number; reason: string }[] = [];
  let verificationSkipped = false;
  const survivors: DraftLetter[] = [];

  for (let i = 0; i < ordered.length; i++) {
    const position = i + 1;
    const letter = ordered[i];
    const week = weeks[i];

    const verdicts = await Promise.all(letter.scriptures.map((s) => verifyReference(s.ref)));
    if (verdicts.includes("unavailable")) verificationSkipped = true;
    if (!verdicts.includes("invalid")) {
      survivors.push(toDraft(letter, position));
      continue;
    }

    const badRefs = letter.scriptures
      .filter((_, idx) => verdicts[idx] === "invalid")
      .map((s) => s.ref);
    console.warn(
      `autopilot letter ${position} ("${letter.title}") has invalid scripture: ${badRefs.join(", ")}; regenerating once`
    );

    // One retry: regenerate this letter alone.
    let replacement: DraftLetter | null = null;
    let regenDetail = "";
    try {
      const single = await generateLetterSeries({
        title: theme,
        theme,
        voiceId: voice.id,
        totalCount: 1,
        callToActionRequired: true,
        seasonContext: seasonLine(week),
      });
      await logGeneration({
        prompt: `autopilot regenerate: position ${position}, ${theme} (${voice.name})${dryTag}`,
        promptVersion: SERIES_PLAN_PROMPT_VERSION,
        output: JSON.stringify(single.letters),
        tokensIn: single.tokensIn,
        tokensOut: single.tokensOut,
        userId: pilot.defaultAuthorId,
      });
      const candidate = single.letters[0];
      const retryVerdicts = await Promise.all(
        candidate.scriptures.map((s) => verifyReference(s.ref))
      );
      if (retryVerdicts.includes("unavailable")) verificationSkipped = true;
      if (!retryVerdicts.includes("invalid")) {
        replacement = toDraft(candidate, position); // keep the ORIGINAL position
      } else {
        regenDetail = `replacement also failed verification (${candidate.scriptures
          .filter((_, idx) => retryVerdicts[idx] === "invalid")
          .map((s) => s.ref)
          .join(", ")})`;
      }
    } catch (err) {
      regenDetail = `regeneration failed (${err instanceof Error ? err.message.slice(0, 200) : ""})`;
      console.error(`autopilot regeneration for position ${position} failed:`, err);
      await logGeneration({
        prompt: `autopilot regenerate: position ${position}, ${theme} (${voice.name})${dryTag}`,
        promptVersion: SERIES_PLAN_PROMPT_VERSION,
        output: `FAILED: ${regenDetail}`,
        userId: pilot.defaultAuthorId,
      });
    }

    if (replacement) {
      survivors.push(replacement);
    } else {
      gaps.push({
        position,
        reason: `invalid scripture reference: ${badRefs.join(", ")}; ${regenDetail || "second attempt failed"}`,
      });
    }
  }

  if (survivors.length === 0) {
    if (!dryRun) {
      await sendEmail(
        "The letter autopilot could not finish this week",
        buildAlertBody("every letter in the block failed scripture verification")
      );
    }
    return {
      ran: false,
      reason: "all letters failed scripture verification",
      theme,
      voice: voice.name,
      scheduled: [],
      gaps,
      ...(verificationSkipped ? { verificationSkipped } : {}),
      coversGenerated: 0,
      ...(dryRun ? { dryRun } : {}),
    };
  }

  // 9. Dry run stops here: nothing persisted, no email. The scheduled
  // list carries empty ids (nothing was inserted) with the titles and
  // dates the real run would have used.
  if (dryRun) {
    return {
      ran: true,
      theme,
      voice: voice.name,
      scheduled: survivors.map((s) => ({
        id: "",
        title: s.title,
        scheduledFor: weeks[s.position - 1].scheduledFor.toISOString(),
      })),
      gaps,
      ...(verificationSkipped ? { verificationSkipped } : {}),
      coversGenerated: 0,
      dryRun: true,
    };
  }

  // Author rule (locked): the autopilot never guesses an author. The
  // Autopilot card has no author control; default_author_id is seeded in
  // production, so this alert only fires if that seed is lost.
  const authorId = pilot.defaultAuthorId;
  if (!authorId) {
    await sendEmail(
      "The letter autopilot could not finish this week",
      buildAlertBody(
        "no default author is configured. The site owner must set default_author_id on the letter_autopilot row in the database (the Autopilot card has no author control). That value is seeded in production, so this alert means the seed was lost"
      )
    );
    return skipped("no default author configured", dryRun);
  }

  // Overlap guard (b): generation took minutes; re-check right before
  // writing. Two things can have changed underneath us, and both are
  // alert-free stand-downs (nothing is wrong, the world just moved):
  //
  // 1. The kill switch. Disabling the autopilot REVERTS scheduled
  //    letters to draft, which also clears the scheduled-count guard
  //    below — so the count recheck alone would happily let an in-flight
  //    run persist a fresh block right after the admin toggled Off. The
  //    enabled flag must be re-read from the database; the `pilot`
  //    snapshot from step 1 is minutes stale by now.
  const [pilotNow] = await db
    .select({ enabled: letterAutopilot.enabled })
    .from(letterAutopilot)
    .where(eq(letterAutopilot.id, pilot.id))
    .limit(1);
  if (!pilotNow?.enabled) {
    return skipped("autopilot was disabled while generating", dryRun);
  }

  // 2. The queue. Another writer (a concurrent run or the admin wizard)
  //    may have scheduled letters in the meantime, and standing down
  //    beats a double-booked calendar.
  const recheck = await db
    .select({ id: weeklyEncouragements.id })
    .from(weeklyEncouragements)
    .where(
      and(
        eq(weeklyEncouragements.status, "scheduled"),
        isNull(weeklyEncouragements.deletedAt)
      )
    );
  if (recheck.length >= 2) {
    return skipped("letters were scheduled while generating", dryRun);
  }

  // Persist. Gap-week rule (locked): survivors keep their ORIGINAL
  // positions (holes allowed) and the original block startDate. The core
  // computes each date from its position, so a dropped letter is simply
  // a missing week, never a renumbered one. A throw here is a terminal,
  // report-shaped outcome with an alert: the shepherd must know the week
  // produced nothing, not find out from a bare 500 in the cron logs.
  let created: Awaited<ReturnType<typeof createSeriesWithLettersCore>>;
  try {
    created = await createSeriesWithLettersCore(authorId, {
      title: theme,
      theme,
      voice: voice.id,
      totalCount: survivors.length,
      cadence: "weekly",
      startDate,
      publishHour: PUBLISH_HOUR,
      origin: "autopilot",
      letters: survivors,
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message.slice(0, 400) : "";
    console.error("autopilot persistence failed:", err);
    await sendEmail(
      "The letter autopilot could not finish this week",
      buildAlertBody(`it could not save the block to the database (${detail})`)
    );
    return {
      ran: false,
      reason: "persistence failed",
      theme,
      voice: voice.name,
      scheduled: [],
      gaps,
      ...(verificationSkipped ? { verificationSkipped } : {}),
      coversGenerated: 0,
    };
  }

  // From here on, letters ARE persisted and WILL publish. Step 12's
  // visibility email goes out FIRST: the four sequential cover
  // generations can eat minutes of wall clock, and a maxDuration kill
  // mid-covers must never strand scheduled letters unannounced. Steps 10
  // and 11 then run wrapped in try/catch, so neither an exception nor a
  // timeout in covers or bookkeeping can swallow the notification.
  // Unreviewed letters on the calendar with no note to the shepherd is
  // the one outcome this engine must never produce.

  // 12 (runs first). Visibility email to the shepherd. LOAD-BEARING:
  // this email is the sole compensating control for publishing without
  // human review, so if it cannot be sent the block must not stay on the
  // calendar. A failed send reverts every just-persisted letter to draft
  // and the run reports itself as not-ran. Nothing publishes unreviewed
  // when Resend is down.
  //
  // Accepted residual: a hard crash (process kill, OOM) in the roughly
  // one-second window between the persist commit above and this send
  // would leave the block scheduled with no email and no revert. That
  // window cannot be closed without an outbox/two-phase design; it is
  // accepted because the cron's 500, the missing summary email, and the
  // Autopilot card's scheduled-letters list all surface the block within
  // the same day, a week before anything publishes.
  const scheduled = created.letters.map((l) => {
    const draft = survivors.find((s) => s.position === l.position);
    const week = weeks[l.position - 1];
    return {
      id: l.id,
      title: draft?.title ?? "",
      scheduledFor: week.scheduledFor.toISOString(),
      position: l.position,
      dateLabel: formatChicagoDate(week.parts),
    };
  });
  const visibilitySent = await sendEmail(
    `The next four weeks are written: ${theme}, in the voice of ${voice.name}`,
    buildVisibilityBody({ theme, voiceName: voice.name, scheduled, gaps, verificationSkipped })
  );
  if (!visibilitySent) {
    const createdIds = created.letters.map((l) => l.id);
    let reason = "visibility email failed — block reverted to drafts";
    try {
      await db
        .update(weeklyEncouragements)
        .set({ status: "draft", scheduledFor: null, updatedAt: new Date() })
        .where(inArray(weeklyEncouragements.id, createdIds));
      console.error(
        `autopilot: visibility email failed; reverted the persisted block to drafts (letters: ${createdIds.join(", ")})`
      );
    } catch (revertErr) {
      // Worst case: no email AND the revert failed. Say so honestly in
      // the report and the logs; the letters are still a week from
      // publishing and visible on the Autopilot card.
      reason = "visibility email failed AND revert failed — letters remain scheduled unreviewed";
      console.error(
        `autopilot: visibility email failed AND the draft revert failed (letters: ${createdIds.join(", ")}):`,
        revertErr
      );
    }
    return {
      ran: false,
      reason,
      theme,
      voice: voice.name,
      scheduled: scheduled.map(({ id, title, scheduledFor }) => ({ id, title, scheduledFor })),
      gaps,
      ...(verificationSkipped ? { verificationSkipped } : {}),
      coversGenerated: 0,
    };
  }

  // 10. Covers: broadsheet style, landscape, final quality. Prompt names
  // the title, theme, and season only, never scripture text. Failures
  // are counted by omission and never block the run.
  let coversGenerated = 0;
  try {
    for (const inserted of created.letters) {
      const draft = survivors.find((s) => s.position === inserted.position);
      const week = weeks[inserted.position - 1];
      if (!draft || !week) continue;
      const seasonStr = week.season.cultural
        ? `${week.season.liturgical}, ${week.season.cultural}`
        : week.season.liturgical;
      const cover = await generateCoverImage({
        prompt: `Cover image for a weekly pastoral letter titled "${draft.title}". Series theme: ${theme}. Season: ${seasonStr}`,
        style: "broadsheet",
        aspectRatio: "landscape",
        quality: "final",
        folder: "letters",
      });
      if (!cover.ok) {
        console.error(
          `autopilot cover generation failed for position ${inserted.position}: ${cover.reason}`
        );
        continue;
      }
      try {
        await db
          .update(weeklyEncouragements)
          .set({
            coverImageUrl: cover.url,
            coverImageAlt: draft.title,
            updatedAt: new Date(),
          })
          .where(eq(weeklyEncouragements.id, inserted.id));
        coversGenerated += 1;
      } catch (err) {
        console.error(`autopilot cover save failed for ${inserted.id}:`, err);
      }
    }
  } catch (err) {
    console.error("autopilot cover generation failed:", err);
  }

  // 11. Advance the autopilot state. If this write fails, lastRunAt does
  // not advance, but the >= 2 scheduled-letters guard still stands the
  // next run down, so the block cannot double up.
  try {
    await db
      .update(letterAutopilot)
      .set({
        voiceRotationIndex: pilot.voiceRotationIndex + 1,
        lastRunAt: new Date(),
        lastBlockTheme: theme,
        lastBlockVoice: voice.id,
        lastBlockLetterIds: created.letters.map((l) => l.id),
        updatedAt: new Date(),
      })
      .where(eq(letterAutopilot.id, pilot.id));
  } catch (err) {
    console.error("autopilot state update failed:", err);
  }

  return {
    ran: true,
    theme,
    voice: voice.name,
    scheduled: scheduled.map(({ id, title, scheduledFor }) => ({ id, title, scheduledFor })),
    gaps,
    ...(verificationSkipped ? { verificationSkipped } : {}),
    coversGenerated,
  };
}

function buildVisibilityBody(args: {
  theme: string;
  voiceName: string;
  scheduled: { id: string; title: string; position: number; dateLabel: string }[];
  gaps: { position: number; reason: string }[];
  verificationSkipped: boolean;
}): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.acts2028sheepdogsociety.com";
  const lines: string[] = [
    "Brother,",
    "",
    `The autopilot has written the next block. One theme across the coming weeks: ${args.theme}. The voice is ${args.voiceName}.`,
    "",
    "Here is what will publish:",
    "",
  ];
  for (const letter of args.scheduled) {
    lines.push(`Week ${letter.position}: "${letter.title}"`);
    lines.push(`Publishes ${letter.dateLabel}`);
    lines.push(`${site}/admin/encouragements/${letter.id}`);
    lines.push("");
  }
  for (const gap of args.gaps) {
    lines.push(
      `Week ${gap.position} will be quiet: ${gap.reason}. Nothing publishes that week unless you schedule something yourself.`
    );
    lines.push("");
  }
  if (args.verificationSkipped) {
    lines.push(
      "Scripture verification was unavailable this run. Every reference parsed clean against the canon, but the ESV check could not confirm them. Give the references a look before the first letter goes out."
    );
    lines.push("");
  }
  lines.push("Read them before they run. Edit anything that does not sound like us.");
  lines.push("");
  lines.push(KILL_SWITCH_LINE);
  return lines.join("\n");
}
