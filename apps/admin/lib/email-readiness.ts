/**
 * Mirrors the API's check (apps/api/src/email-readiness.ts) so the UI can say
 * why an email can't go out before the creator tries. The API stays the
 * authority; keep the two in step.
 */

/** The Blank starter's sample lines. An email that has nothing but these
 * (and the footer) is unedited. */
const PLACEHOLDER_LINES = new Set([
  "start writing here",
  "add your message, links, and call to action.",
]);

/** A line without markdown heading/quote markers, spacing or case. */
function normalizeLine(line: string): string {
  return line
    .replace(/^\s*(#{1,6}|>)\s*/, "")
    .replace(/[\s ]+/g, " ")
    .trim()
    .toLowerCase();
}

export type EmailReadinessProblem =
  | "subject_empty"
  | "body_empty"
  | "body_placeholder";

export const EMAIL_READINESS_MESSAGES: Record<EmailReadinessProblem, string> = {
  subject_empty: "Add a subject before sending this email.",
  body_empty: "Write the email's content before sending it.",
  body_placeholder:
    'This email still has the "Start writing here" placeholder. Replace it with your message before sending.',
};

function stripBoilerplate(text: string): string {
  return text
    .replace(/\{\{[^}]*\}\}/g, "")
    .replace(/\[\s*unsubscribe\s*\]\(\s*\)/gi, "")
    .replace(/[\s ]+/g, " ")
    .trim();
}

/** The body can arrive as an object, a JSON string, or wrapped in another
 * `content`. */
function blocksOf(raw: unknown): unknown[] | null {
  let value = raw;
  for (let depth = 0; depth < 3; depth += 1) {
    if (typeof value === "string") {
      try {
        value = JSON.parse(value);
      } catch {
        return null;
      }
    }
    if (!value || typeof value !== "object") return null;
    const inner = (value as { content?: unknown }).content;
    if (Array.isArray(inner)) return inner;
    value = inner;
  }
  return null;
}

export function emailBodyProblem(
  content: unknown,
): "body_empty" | "body_placeholder" | null {
  const blocks = blocksOf(content);
  if (!blocks) return "body_empty";
  let hasContent = false;
  let hasPlaceholder = false;
  for (const block of blocks) {
    if (!block || typeof block !== "object") continue;
    const { blockType, settings } = block as {
      blockType?: unknown;
      settings?: { content?: unknown };
    };
    if (blockType !== "text") {
      // Images, buttons and the like are content the creator chose.
      hasContent = true;
      continue;
    }
    const raw = typeof settings?.content === "string" ? settings.content : "";
    // The starter's own lines don't count; anything the creator wrote does,
    // including an edited version of a starter line.
    const written = raw
      .split(/\r?\n/)
      .filter((line) => {
        const isPlaceholder = PLACEHOLDER_LINES.has(normalizeLine(line));
        if (isPlaceholder) hasPlaceholder = true;
        return !isPlaceholder;
      })
      .join("\n");
    if (stripBoilerplate(written)) hasContent = true;
  }
  if (hasContent) return null;
  return hasPlaceholder ? "body_placeholder" : "body_empty";
}

export function emailReadinessProblem(email: {
  subject?: unknown;
  content?: unknown;
}): EmailReadinessProblem | null {
  if (typeof email.subject !== "string" || !email.subject.trim()) return "subject_empty";
  return emailBodyProblem(email.content);
}

/** The message to show beside a disabled send button, or null when ready. */
export function emailReadinessMessage(email: {
  subject?: unknown;
  content?: unknown;
}): string | null {
  const problem = emailReadinessProblem(email);
  return problem ? EMAIL_READINESS_MESSAGES[problem] : null;
}

/**
 * The message for a sequence that can't be activated yet. In a sequence only
 * published emails are sent, so drafts may still be placeholders.
 */
export function sequenceReadinessMessage(
  emails: ReadonlyArray<{ subject?: unknown; content?: unknown; published?: boolean }>,
): string | null {
  for (let index = 0; index < emails.length; index += 1) {
    const email = emails[index]!;
    if (!email.published) continue;
    const message = emailReadinessMessage(email);
    if (message) return `Email ${index + 1}: ${message}`;
  }
  return null;
}

/** True when the school's mail settings hold no usable postal address. */
export function isMailingAddressMissing(
  settings: { mailingAddress?: string | null } | null | undefined,
): boolean {
  return !settings?.mailingAddress?.trim();
}
