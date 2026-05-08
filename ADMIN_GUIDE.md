# Admin Guide — Sheepdog Society
*A field guide for the men running the site.*

You don't need to think like a developer. You will not break the site by clicking around. Every page in `/admin/*` has a `?` button bottom-right that opens a help panel. Every form has plain-language hints next to the fields. Every destructive action asks for a typed confirmation.

If you can read your email, you can run this.

---

## First login

1. Open `acts2028sheepdogsociety.com/admin/sign-in`.
2. Enter your email and the password your developer set up.
3. You land on the dashboard.

You'll see a **Setup Checklist** card at the top of the dashboard the first time you log in. Walk through it before anything else. It auto-hides when complete.

The keyboard shortcuts:
- `⌘K` — open the command palette. Type the name of any group, letter, event. Hit Enter to jump.
- `⌘J` — open the AI assistant. Ask Claude anything in plain English.
- `?` — open the help panel from any admin page.

---

## What lives where

| Section | What it does |
| :-- | :-- |
| **Dashboard** | A snapshot of the week. Recent letters, pending requests, AI-quick-actions. |
| **Letters** | Write and publish the weekly Letter. Tiptap editor, AI bubble menu, cover-image generator. |
| **Encouragements / Devotionals** | Daily readings curated by the admin. |
| **Reading plans** | Multi-day scripture plans. |
| **Newsletter** | The Resend audience. Pull subscriber counts. |
| **Events** | Gatherings — breakfasts, prayer nights, retreats. |
| **Groups / Locations** | The map of where men meet. |
| **Plant Requests** | Men asking to start a group in their city. |
| **Resources** | PDFs, guides, field cards. |
| **Stories / Testimonies** | Approved testimonies that show on the public site. |
| **Members** *(read-only this phase)* | Every man who signed up via `/join`. |
| **Admins / Settings** | Add admins, view integrations, see the brand voice. |
| **Audit log** | Every change made by every admin, ever. Read-only. |

---

## Composing the Weekly Encouragement

This is your main weekly artifact. The composer walks you through it in four short steps.

1. **Weekly Encouragements → Compose this week's encouragement.**
2. **Step 1 — Theme & title.** One word for the theme (Endurance, Integrity). One line for the title that a man will remember on Wednesday. Concrete beats clever.
3. **Step 2 — Cover image.** Upload one you have, paste a URL, or click *Generate with AI*. The prompt is pre-filled from your theme. Skip if you want to add it later.
4. **Step 3 — Voice.** Pick whose preaching cadence Claude should write in. Ten options: Piper, Keller, Sproul, MacArthur, Begg, Carson, Ferguson, DeYoung, Baucham, Washer. Or describe your own in the textarea below the cards. The output is **original prose in the spirit of the voice** — never a fabricated quotation.
5. **Step 4 — Draft.** One button. Claude returns intro, two or three scripture anchors with notes, the guidance, and a brief closing. About 20 seconds. *Try a different draft* re-runs. *Use this draft* saves and opens the editor.
6. **Edit and publish.** Tweak any section by hand. Each section also has its own *Draft with AI* helper for incremental rewrites. Click *Publish now* when ready and the public page goes live at `/encouragements/<slug>`.

Bible verse **text** is never generated. The composer returns references only (e.g. `Romans 5:3-4`) and the public page renders the actual verse text from the ESV.

---

## Writing the Letter

1. **Letters → Start a new Letter.**
2. The editor opens. The cover-image slot is at the very top.
3. Click "Generate with AI" to write a prompt and pick a style. The card shows up in the slot.
4. Type a one-word **theme**, the **title**, and a **subtitle**. The autosave starts immediately; you'll see "Saved 2s ago" in the top bar.
5. Highlight any sentence to bring up the AI bubble menu. Six actions:
   - **Match voice** — rewrites in Jeremy's voice without changing meaning.
   - **Tighten** — cuts the passage to roughly half its length.
   - **Sharpen verbs** — replaces every weak verb with a stronger one.
   - **Expand** — adds 50% more depth without filler.
   - **Fix** — fixes grammar and typos only.
   - **Pastoral** — softens the tone.
6. **Bible verse text is never generated.** Use placeholders like `{{VERSE: Romans 5:3-4}}` and the system fetches the ESV text on render.
7. When ready, **Publish** opens a confirm panel. You can:
   - Send via email broadcast (Resend) or skip the email and just publish to the web.
   - Set the email subject + preview text.
   - There's a 3-second countdown before the send. Bail anytime.
8. Once published, the Letter is **locked**. To revise, **clone** it from the list view.

If something is in draft and you walk away, the "Saving…" indicator persists. The autosave never loses your work. Every save snapshots into `letter_versions` for restore.

---

## Adding a group

1. **Groups → Add group.** (Or **Locations** if you mean a place where a group meets.)
2. Required: name, city, state, latitude/longitude. The map picker geocodes automatically when you type a city.
3. Optional but useful: meeting day + time, leader name, leader phone (private — never shown publicly), capacity, a one-paragraph description.
4. Toggle **Active** on. The group shows on `/locations` immediately.
5. Capacity hits the soft cap → status flips to **full** automatically with a banner suggesting "Start a second chapter."

The leader's email and phone are **never** exposed in the public payload. The locator hides them and the contact form on the group page relays through Resend (with the inquirer as `replyTo`).

---

## Approving a plant request

A man fills out `/locations/request` (linked from `/groups/start`).

1. **Plant Requests** in the sidebar shows a badge with the count.
2. Click a request to read the full submission.
3. Email or call the man. Use the **Reply** button to send a Resend email from a templated thread.
4. When he's launched a group, mark the request **Launched** and create the matching Group/Location row.

States: New → Contacted → Vetting → Approved → Launched / Declined / Archived.

---

## Sending the newsletter

The Letter publish flow handles this — you don't run a separate "send newsletter" step. When you publish a Letter with the broadcast checkbox on, Resend ships it to your audience. The post-send report card shows opens, clicks, unsubscribes 24 hours later.

If you ever want to send something OFF-letter — an event reminder blast, a one-off note — use **Newsletter → Custom broadcast**.

---

## Resources

1. **Resources → Add resource.**
2. Upload a PDF (or paste an external link).
3. Title, one-sentence description, category, level (newcomer / leader / all).
4. Toggle **Published**.
5. The cover thumbnail is auto-extracted from the PDF first page; you can override.

The download counter ticks on every public download from `/resources/[slug]`. Sort by it to see what's resonating.

---

## SMS — Member texts

SMS is gated behind the `SMS_ENABLED` flag and requires Twilio + A2P 10DLC Charity registration. See `docs/A2P_10DLC_CHECKLIST.md` for the full registration runbook.

When you turn SMS on:
- Member signups with the SMS box checked get a "Reply YES to confirm" double-opt-in text.
- Event reminders go out at 24h-before and 2h-before, recipient-local.
- Quiet hours are enforced server-side: 9am–8pm Mon–Sat, noon–6pm Sun. Sends queued outside the window simply don't go.
- Replying STOP from any phone unsubscribes that man's record automatically.
- Replying HELP returns a customer-care message with `hello@acts2028sheepdogsociety.com`.

---

## When something goes wrong

**Tab refuses to load.** Refresh once. If still broken, open `?` in the admin and email `hello@`.

**The Letter editor lost my work.** Open the Letter from `/admin/letters`. Scroll to the bottom — every autosave is in `letter_versions`. Restore the version you want.

**Claude's bubble-menu is stuck.** Click outside the highlight to dismiss, then re-highlight. If still stuck, refresh.

**An email didn't arrive.** Check `/admin/audit` — every send is logged. If Resend says "delivered" but the recipient didn't get it, ask them to check spam or whitelist `letter@acts2028sheepdogsociety.com`.

**A man emailed asking to be removed.** Find him in **Members**. Right-click → archive. Phase E ships an inline status editor; for now you can run `UPDATE members SET status = 'archived', deleted_at = NOW() WHERE email = '...';` against the DB.

---

## Adding another admin

1. Open `/admin/settings/team` *(lands in a future phase; for now)*:
2. SSH into a place where you can run a one-liner against the production DB:
   ```bash
   ADMIN_EMAIL='new-admin@acts2028sheepdogsociety.com' \
     ADMIN_PASSWORD='change-me-on-first-login' \
     ADMIN_NAME='First Last' \
     NEON_DATABASE_URL="$(vercel env pull --environment=production --yes && grep NEON_DATABASE_URL .env)" \
     node scripts/seed-admin.mjs
   ```
3. Tell them to log in at `/admin/sign-in` and change their password from **Settings → Account**.

---

## The voice rules

If you write copy that ships in front of a member, it has to read like this:
- Short Anglo-Saxon sentences. Plain words. Strong verbs.
- No exclamation points except inside scripture.
- No em-dashes when a comma works.
- Imperative paired with invitation, never command alone.
- Never preach. Point to Christ.

Banned words: *delve, leverage, navigate, robust, tapestry, journey (n.), rise, reclaim, fight back, real men, alpha, based, toxic masculinity*. Banned clichés: *walk with God, do life together, in today's fast-paced world, level up, unpack, the journey of faith*.

The full brand voice lives in `/admin/settings`. Read it when in doubt. Claude follows it on every AI generation — if you want to change it, edit `src/lib/ai/prompts.ts` via PR.

---

## The success test

Before you publish, ask: **would a man text this to a brother because of how it made him feel?** If the answer is "maybe," it isn't done.

Now go stand watch.
