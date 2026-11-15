import { ownerEmail } from "./school-lifecycle.js";
import type { AppDb } from "./types.js";

/**
 * How a school's marketing email is signed. It goes out from the shared
 * sending address, so the sender name is the school's and replies go to its
 * owner rather than to the shared address.
 */
export type SchoolSender = { fromName: string; replyTo?: string };

export function schoolSender(name: string, owner: string | null): SchoolSender {
  const replyTo = owner?.trim();
  return replyTo ? { fromName: name, replyTo } : { fromName: name };
}

/** The sender for a school, with its owner's current email as reply-to. */
export async function loadSchoolSender(
  db: AppDb,
  school: { schoolId: string; name: string },
): Promise<SchoolSender> {
  return schoolSender(school.name, await ownerEmail(db, school.schoolId));
}
