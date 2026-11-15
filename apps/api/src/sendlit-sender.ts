import { ownerEmail } from "./school-lifecycle.js";
import type { AppDb } from "./types.js";

/**
 * How a school's marketing email is signed. It goes out from the shared
 * sending address, so the sender name is the school's and replies go to its
 * owner rather than to the shared address.
 */
export type SchoolSender = { fromName: string; replyTo?: string };

/**
 * A school's name as a From name SendLit accepts: at most 100 characters,
 * with no control or invisible formatting characters, `<`, `>` or `@`, so it
 * can't pass for an address or read as something else. School names are checked
 * when they're saved (S14), but imported schools predate that. `null` when
 * nothing is left, so the sender's own name is used.
 */
export function senderName(name: string): string | null {
  const cleaned = name
    .replace(/[\p{Cc}\p{Cf}<>@]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100)
    .trim();
  return cleaned || null;
}

export function schoolSender(name: string, owner: string | null): SchoolSender {
  const replyTo = owner?.trim();
  const fromName = senderName(name) ?? "CourseLit";
  return replyTo ? { fromName, replyTo } : { fromName };
}

/** The sender for a school, with its owner's current email as reply-to. */
export async function loadSchoolSender(
  db: AppDb,
  school: { schoolId: string; name: string },
): Promise<SchoolSender> {
  return schoolSender(school.name, await ownerEmail(db, school.schoolId));
}
