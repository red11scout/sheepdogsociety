/**
 * Client-safe constants from the SMS module.
 *
 * The form (`MemberSignup.tsx`) is a client component and must NOT import
 * the full `lib/sms/index.ts` — that file imports the Twilio SDK which
 * pulls in Node-only modules (`fs`, `net`, `tls`) that break browser bundles.
 *
 * Anything a client component needs from the SMS module lives here.
 */

/**
 * Verbatim TCPA / A2P 10DLC opt-in disclosure rendered next to the SMS
 * checkbox on every public form that collects a phone for SMS. Snapshot
 * this exact string into `members.member_notification_prefs.sms_consent_text_shown`
 * at submit time — A2P 10DLC requires we can prove the disclosure shown.
 */
export const SMS_OPT_IN_DISCLOSURE = `I agree to receive recurring text messages from Acts 2:28 Sheepdog Society about events, dispatches, and group updates at the number provided. Consent is not a condition of any service. Msg & data rates may apply. Msg frequency varies. Reply STOP to opt out, HELP for help. See SMS Terms (/sms-terms) and Privacy Policy (/privacy).`;
