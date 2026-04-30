# A2P 10DLC Charity Registration — Sheepdog Society
*Paste-in runbook for the admin doing the Twilio onboarding. Allow up to 14 business days from start to first compliant send.*

The shorthand: **A2P 10DLC** is the US carrier registration regime for any business sending SMS from a 10-digit long code. Charity (501(c)(3)) is a preferred use case with lower per-message fees. You cannot legally text members until brand + campaign approval lands.

---

## Pre-requisites — gather before you click anything

- [ ] Legal ministry name **exactly** as it appears on the IRS 501(c)(3) determination letter
- [ ] EIN
- [ ] IRS 501(c)(3) determination letter PDF
- [ ] Physical street address (no PO box)
- [ ] Live website with `/privacy` and `/sms-terms` published (already shipped — see `(public)/privacy/page.tsx` and `(public)/sms-terms/page.tsx`)
- [ ] Authorized representative — first/last name, email at the ministry domain (`@acts2028sheepdogsociety.com`), phone
- [ ] Estimated monthly SMS volume (start at 5,000 messages/mo)
- [ ] At least one Twilio US local number purchased (any 10DLC number qualifies)
- [ ] Two or three sample messages — see "Sample messages" below
- [ ] Screenshot of `/join` showing the SMS opt-in checkbox + disclosure visible
- [ ] Public URL of the opt-in form: `https://www.acts2028sheepdogsociety.com/join`

---

## Step 1 — Twilio account setup

- [ ] Upgrade from trial. Add a payment method.
- [ ] Console → Account → Settings → Edit business profile:
  - Account Type: **Business**
  - Business Type: **Non-profit Corporation**
  - Industry: **Religion** (or **Non-profit**)
  - Company Type: **non_profit**
- [ ] Verify rep email + phone via the email/SMS links Twilio sends.

## Step 2 — Brand registration

- [ ] Console → Messaging → Regulatory Compliance → Onboarding
- [ ] Company Type: **US Non-Profit**
- [ ] Brand Type: **Standard** ($46 one-time fee — required for the Charity use case)
- [ ] Submit EIN, legal name, address, vertical: **Religion / Non-profit**
- [ ] Wait for **APPROVED** (typically 1–3 business days; up to 5 if Aegis verification needs more proof)
- [ ] Note the **brand ID** when issued — you will paste it in step 5.

## Step 3 — Opt-in compliance (must already be live before Twilio review)

- [ ] `/sms-terms` is published and includes program name, message types, "Msg & data rates may apply", STOP/HELP keywords, customer-care contact, link to privacy. ✅ **Shipped.**
- [ ] `/privacy` includes the verbatim sentence: *"We do not sell or share mobile opt-in data or consent with third parties for marketing purposes."* ✅ **Shipped.**
- [ ] `/join` opt-in form has the SMS checkbox **unchecked by default** + the full disclosure text visible inline (rendered from `SMS_OPT_IN_DISCLOSURE` in `src/lib/sms/index.ts`). ✅ **Shipped.**
- [ ] Take a screenshot of the form with the SMS checkbox + disclosure visible. Save it. You will upload it in step 5.

## Step 4 — Messaging Service

- [ ] Console → Messaging → Services → **Create new**
  - Friendly name: `Acts 2028 Sheepdog Society`
  - Use case: **Notify my users**
- [ ] Add your 10DLC number(s) to the sender pool
- [ ] Inbound webhook (Configure → Integration → Incoming Messages):
  ```
  https://www.acts2028sheepdogsociety.com/api/webhooks/twilio/inbound
  ```
- [ ] Status callback (Configure → Integration → Delivery Status Callback):
  ```
  https://www.acts2028sheepdogsociety.com/api/webhooks/twilio/status
  ```
- [ ] HELP keyword auto-response — set in Console under Advanced Opt-Out, or rely on our `/api/webhooks/twilio/inbound` route which returns the same text from `HELP_RESPONSE_TEXT` in `src/lib/sms/index.ts`. Either is fine; the route is canonical.
- [ ] Note the **Messaging Service SID** — you will paste it as `TWILIO_MESSAGING_SERVICE_SID` env var.

## Step 5 — Campaign registration

- [ ] Brand → A2P 10DLC → **Create Campaign**
- [ ] Use case: **Charity / 501(c)(3) Nonprofit** (preferred — lowest per-message fee).
  - Fallback: **Low Volume Mixed** if your EIN hasn't been re-verified by Aegis yet (cheaper to register, slightly higher per-msg).
- [ ] Link the Messaging Service from step 4
- [ ] Description (paste verbatim, edit if needed):
  > Sends event reminders, weekly Letter notifications, and prayer/devotional updates to congregants and volunteers who opted in via our website at acts2028sheepdogsociety.com/join. Messages are sent only to users who checked the SMS opt-in box and confirmed via reply YES.
- [ ] Sample messages (paste all three):
  1. `A brother saved a seat. Reply YES to confirm reminders from Acts 2:28 Sheepdog Society. Msg & data rates may apply. Reply STOP to opt out, HELP for help.`
  2. `Tomorrow morning, 6:30am — Tuesday breakfast at the diner on 5th. We'll save you a chair. Reply STOP to opt out.`
  3. `New Letter is up: "Watch yourself." Five-minute read. acts2028sheepdogsociety.com/letter/watch-yourself. Reply STOP to opt out.`
- [ ] Opt-in workflow: **Web form**. Upload the screenshot from step 3. Paste opt-in URL: `https://www.acts2028sheepdogsociety.com/join`
- [ ] Opt-in keywords: `YES`
- [ ] Opt-out keywords: `STOP, STOPALL, UNSUBSCRIBE, CANCEL, END, QUIT`
- [ ] Help keywords: `HELP, INFO`
- [ ] Embedded links: **Yes** (your domain only)
- [ ] Embedded phone: **Yes** if including a callback number anywhere
- [ ] Age-gated: **No**
- [ ] Submit. **$15 vetting fee.** Wait up to **10 business days**.
- [ ] When approved, note the **campaign ID**.

## Step 6 — Production wiring

- [ ] Set the following env vars in Vercel (Production + Preview):
  ```
  SMS_ENABLED=true
  TWILIO_ACCOUNT_SID=AC…          (from Twilio Console → Account)
  TWILIO_AUTH_TOKEN=…             (from Twilio Console → Account)
  TWILIO_MESSAGING_SERVICE_SID=MG…  (from step 4)
  TWILIO_WEBHOOK_SIGNING_SECRET=… (defaults to TWILIO_AUTH_TOKEN; set explicitly only if you rotate)
  ```
- [ ] Trigger a Vercel redeploy so the new env is active.
- [ ] Verify `isSmsEnabled()` returns `true` in production by hitting `/admin/settings` — the Twilio integration row should show **Configured**.

## Step 7 — Production smoke test

- [ ] From `/join` on production, sign up with your own phone, SMS opt-in checked.
- [ ] Confirm you receive the double-opt-in message within 30 seconds.
- [ ] Reply `YES`. Verify in DB: `SELECT sms_double_opt_in_at FROM member_notification_prefs WHERE member_id = (SELECT id FROM members WHERE phone = 'your-number-e164');` should be non-null.
- [ ] Reply `STOP` from your phone. Verify Twilio's auto-reply lands AND `wants_sms` flips to `false` in the DB (our webhook mirrors STOP regardless of Twilio's auto-handler).
- [ ] Reply `HELP`. Verify the response text matches `HELP_RESPONSE_TEXT` in `src/lib/sms/index.ts`.

## Step 8 — Document the runbook (private)

In whatever runbook the ministry keeps (Notion, 1Password, etc.), record:
- Brand ID
- Campaign ID
- Messaging Service SID
- Approval dates
- A note on how to roll new keys (Twilio → Account → Auth Tokens → Rotate)

---

## Operational notes

**Quiet hours.** `src/lib/sms/index.ts → isInQuietHours()` enforces 9am–8pm Mon–Sat / noon–6pm Sun, recipient-local. Sends outside the window return `{ status: "queued", reason: "quiet_hours" }`. Confirmation messages (the YES double-opt-in) bypass the gate because they're a direct response to user action.

**Cost.** Charity use case: ~$0.0075–$0.01 per outbound SMS in the US. 5,000 sends/month ≈ $40. Inbound is free. The brand registration is a one-time $46; campaign vetting is one-time $15.

**Renewals.** Brand registration is permanent. Campaigns auto-renew but can be killed by carrier audits if the opt-in flow drifts. If you ever change the SMS_OPT_IN_DISCLOSURE wording, take a fresh screenshot and re-attach it under the campaign in Twilio Console — otherwise an audit finds the disclosure on the website doesn't match the one filed and the campaign gets paused.

**STOP is forever.** Once a member texts STOP, they cannot be re-subscribed via webhook. They have to re-sign-up at `/join`. This is by design — a server-side "resubscribe" button would violate TCPA.

**Webhook signing.** Production traffic is verified via `twilio.validateRequest()` in `src/app/api/webhooks/twilio/inbound/route.ts`. Without `TWILIO_AUTH_TOKEN` set, the verify is skipped (dev-only). Never expose webhook URLs publicly until that env is in place — bad actors could spoof STOP/YES events otherwise.

---

## When something is wrong

- **Brand keeps getting rejected:** Aegis (Twilio's KYC partner) wants the legal name to match exactly, including punctuation. "Acts 2:28 Sheepdog Society Inc." ≠ "Acts 2:28 Sheepdog Society, Inc.". Check the IRS 501(c)(3) letter character-by-character.
- **Campaign approval times out (>14 days):** Open a Twilio support ticket from the campaign page. Ask explicitly for "Aegis review escalation."
- **Production sends return error 30007 (Filtered):** Carrier flagged your traffic. Most common cause: a STOP'd recipient is still on the send list. Verify the unsubscribe webhook is hitting your DB.
- **`/api/webhooks/twilio/inbound` 403s:** Signature verify is failing. Either `TWILIO_AUTH_TOKEN` env doesn't match the account, or your reverse proxy is rewriting the URL the signature was computed against. Check `x-forwarded-host` matches the publicly-resolvable host.
