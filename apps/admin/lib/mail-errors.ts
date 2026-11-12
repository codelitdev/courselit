import { EMAIL_READINESS_MESSAGES } from "./email-readiness";

/** Matches the API's "Add your mailing address in Marketing → Settings before
 * sending email." conflict, so screens can offer a link to the settings. */
export function isMailingAddressRequiredError(message: string): boolean {
  return /mailing address/i.test(message);
}

/** Matches the API's refusal to send an email with no subject or an
 * unedited placeholder body, which may carry an "Email N:" prefix. */
export function isEmailNotReadyError(message: string): boolean {
  return Object.values(EMAIL_READINESS_MESSAGES).some((known) => message.includes(known));
}
