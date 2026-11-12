/**
 * Pure rules behind the product workspace: whether a product is a draft, live
 * or offline, what it still needs before it can go live, and how a section's
 * drip release reads and saves. Kept free of React so it can be unit tested.
 */

export type ProductPhase = "draft" | "live" | "offline";

type PhaseInput = {
  status: "draft" | "published";
  /** When the product first went live; kept after it goes back to draft. */
  publishedAt?: string | null;
};

/** Draft: never launched. Offline: was live once, now back to draft. */
export function productPhase(product: PhaseInput): ProductPhase {
  if (product.status === "published") return "live";
  return product.publishedAt ? "offline" : "draft";
}

export const PHASE_LABEL: Record<ProductPhase, string> = {
  draft: "Draft",
  live: "Live",
  offline: "Offline",
};

type LessonLike = {
  id: string;
  status: "draft" | "published";
  sectionId: string | null;
};

export function lessonCounts(lessons: readonly LessonLike[]) {
  const live = lessons.filter((lesson) => lesson.status === "published").length;
  return { total: lessons.length, live, drafts: lessons.length - live };
}

export function draftLessonIds(lessons: readonly LessonLike[]): string[] {
  return lessons.filter((lesson) => lesson.status !== "published").map((l) => l.id);
}

/** "2 of 3 live", or "Empty" for a section without lessons. */
export function sectionSummary(lessons: readonly LessonLike[], noun = "live"): string {
  if (lessons.length === 0) return "Empty";
  const { live, total } = lessonCounts(lessons);
  return `${live} of ${total} ${noun}`;
}

export function plural(count: number, one: string, many = `${one}s`) {
  return `${count} ${count === 1 ? one : many}`;
}

type PlanLike = { status: "active" | "archived"; kind: string };

export type ChecklistTarget =
  | "plans"
  | "content"
  | "visibility"
  | "details"
  | "image"
  | "discussions"
  | "certificate"
  | "lead";

export type ChecklistStep = {
  key: string;
  title: string;
  detail: string;
  /** Needed before the product can go live. */
  required: boolean;
  done: boolean;
  cta: string;
  target: ChecklistTarget;
};

export type ChecklistInput = {
  kind: "course" | "download";
  privacy: "public" | "unlisted";
  description: string;
  hasFeaturedImage: boolean;
  discussions: boolean;
  certificate: boolean;
  leadMagnet: boolean;
  plans: readonly PlanLike[];
  lessons: readonly LessonLike[];
};

/** A description counts as written once it has any visible text. */
export function hasDescription(description: string): boolean {
  const trimmed = description.trim();
  if (!trimmed) return false;
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object") return documentHasText(parsed);
  } catch {
    // Plain text.
  }
  return true;
}

function documentHasText(node: unknown): boolean {
  if (!node || typeof node !== "object") return false;
  const record = node as { text?: unknown; content?: unknown };
  if (typeof record.text === "string" && record.text.trim()) return true;
  return Array.isArray(record.content) && record.content.some(documentHasText);
}

/**
 * The steps on the Overview tab. The first two are required to go live: a way
 * to join (an active plan) and something to get (a live lesson, or a file).
 */
export function launchChecklist(input: ChecklistInput): ChecklistStep[] {
  const activePlans = input.plans.filter((plan) => plan.status === "active");
  const hasPlan = activePlans.length > 0;
  const { total, live } = lessonCounts(input.lessons);
  const isDownload = input.kind === "download";

  const steps: ChecklistStep[] = [
    {
      key: "plans",
      title: "Add a payment plan",
      detail: hasPlan
        ? `${plural(activePlans.length, "plan")}.`
        : "Free, one time, subscription or EMI.",
      required: true,
      done: hasPlan,
      cta: "Add plan",
      target: "plans",
    },
    isDownload
      ? {
          key: "content",
          title: total ? "Make at least one file live" : "Add your files",
          detail: live
            ? `${live} of ${plural(total, "file")} live.`
            : total
              ? `All ${plural(total, "file")} are drafts.`
              : "What people get after they buy or sign up.",
          required: true,
          done: live > 0,
          cta: total ? "Open files" : "Add files",
          target: "content",
        }
      : {
          key: "content",
          title: total ? "Make at least one lesson live" : "Add your first lesson",
          detail: live
            ? `${live} of ${plural(total, "lesson")} live.`
            : total
              ? `All ${plural(total, "lesson")} are drafts.`
              : "Start with a section, then add lessons to it.",
          required: true,
          done: live > 0,
          cta: total ? "Open content" : "Add lessons",
          target: "content",
        },
    {
      key: "visibility",
      title: "Choose who can find it",
      detail:
        input.privacy === "public"
          ? "Anyone: listed on your site."
          : "Only people with the link.",
      required: false,
      done: true,
      cta: "Change",
      target: "visibility",
    },
    {
      key: "description",
      title: "Write a description",
      detail: "Tell people what they'll get.",
      required: false,
      done: hasDescription(input.description),
      cta: "Write",
      target: "details",
    },
    {
      key: "image",
      title: "Add a featured image",
      detail: "Shown on the sales page and when the link is shared.",
      required: false,
      done: input.hasFeaturedImage,
      cta: "Choose",
      target: "image",
    },
  ];
  if (!isDownload) {
    steps.push(
      {
        key: "discussions",
        title: "Turn on discussions",
        detail: "A space for learners to ask and help each other.",
        required: false,
        done: input.discussions,
        cta: "Set up",
        target: "discussions",
      },
      {
        key: "certificate",
        title: "Issue certificates",
        detail: "Learners get one when they finish.",
        required: false,
        done: input.certificate,
        cta: "Set up",
        target: "certificate",
      },
    );
  }
  return steps;
}

export function canGoLive(steps: readonly ChecklistStep[]): boolean {
  return steps.filter((step) => step.required).every((step) => step.done);
}

export function optionalProgress(steps: readonly ChecklistStep[]) {
  const optional = steps.filter((step) => !step.required);
  return { done: optional.filter((step) => step.done).length, total: optional.length };
}

// ---------------------------------------------------------------------------
// Section drip release

export const SECONDS_PER_DAY = 24 * 60 * 60;

export type DripMode = "now" | "relative-date" | "exact-date";

export type DripSection = {
  dripEnabled: boolean;
  dripType: "relative-date" | "exact-date" | null;
  dripDelaySeconds: number | null;
  dripAt: string | null;
};

export type DripForm = { mode: DripMode; days: string; at: string };

/** A `datetime-local` value in the viewer's time zone. */
export function toDatetimeLocal(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function dripFormFor(section: DripSection): DripForm {
  if (!section.dripEnabled || !section.dripType)
    return { mode: "now", days: "1", at: "" };
  return {
    mode: section.dripType,
    days:
      section.dripDelaySeconds === null
        ? "1"
        : String(Math.round(section.dripDelaySeconds / SECONDS_PER_DAY)),
    at: toDatetimeLocal(section.dripAt),
  };
}

export function validateDripForm(form: DripForm): string | null {
  if (form.mode === "relative-date") {
    const days = Number(form.days);
    if (!Number.isInteger(days) || days < 1) {
      return "Enter the number of days after the previous section.";
    }
  }
  if (form.mode === "exact-date" && !form.at) return "Choose a release date.";
  return null;
}

/** The section PATCH body for a drip form. */
export function dripBody(form: DripForm): DripSection {
  if (form.mode === "now") {
    return { dripEnabled: false, dripType: null, dripDelaySeconds: null, dripAt: null };
  }
  if (form.mode === "relative-date") {
    return {
      dripEnabled: true,
      dripType: "relative-date",
      dripDelaySeconds: Number(form.days) * SECONDS_PER_DAY,
      dripAt: null,
    };
  }
  return {
    dripEnabled: true,
    dripType: "exact-date",
    dripDelaySeconds: null,
    dripAt: new Date(form.at).toISOString(),
  };
}

/** The badge on a section header, or null when it opens right away. */
export function dripLabel(section: DripSection, locale?: string): string | null {
  if (!section.dripEnabled || !section.dripType) return null;
  if (section.dripType === "relative-date") {
    const days = Math.round((section.dripDelaySeconds ?? 0) / SECONDS_PER_DAY);
    return `Opens ${plural(days, "day")} after previous`;
  }
  if (!section.dripAt) return null;
  const date = new Date(section.dripAt);
  if (Number.isNaN(date.getTime())) return null;
  return `Opens ${date.toLocaleDateString(locale, { day: "numeric", month: "short" })}`;
}

// ---------------------------------------------------------------------------
// Lesson rows

const LESSON_SHORT: Record<string, string> = {
  text: "TXT",
  video: "VID",
  audio: "AUD",
  pdf: "PDF",
  file: "FILE",
  embed: "EMB",
  quiz: "QZ",
  scorm: "SCO",
};

const LESSON_LABEL: Record<string, string> = {
  text: "Text",
  video: "Video",
  audio: "Audio",
  pdf: "PDF",
  file: "File",
  embed: "Embed",
  quiz: "Quiz",
  scorm: "SCORM",
};

export function lessonShortLabel(type: string): string {
  return LESSON_SHORT[type] ?? type.slice(0, 3).toUpperCase();
}

/** The muted line under a lesson title: its type, plus "Free preview". */
export function lessonMeta(
  lesson: { type: string; requiresEnrollment: boolean },
  kind: "course" | "download",
): string {
  const parts = [LESSON_LABEL[lesson.type] ?? lesson.type];
  if (kind === "course" && !lesson.requiresEnrollment && lesson.type !== "quiz") {
    parts.push("Free preview");
  }
  return parts.join(" · ");
}

/** The name given to a section added from the Content tab before it is renamed. */
export function nextSectionName(existing: readonly { title: string }[]): string {
  const taken = new Set(existing.map((section) => section.title));
  let n = existing.length + 1;
  while (taken.has(`Section ${n}`)) n += 1;
  return `Section ${n}`;
}

// ---------------------------------------------------------------------------
// Preview

/**
 * The storefront course viewer path that opens a draft with a preview token.
 * Matches the storefront's `/course/<slug>/<id>` route; the token stays in the
 * hash so it never reaches server logs.
 */
export function coursePreviewPath(
  product: { id: string; slug: string | null | undefined },
  token: string,
): string {
  const slug = product.slug?.trim() || product.id;
  return `/course/${encodeURIComponent(slug)}/${encodeURIComponent(product.id)}#preview=${encodeURIComponent(token)}`;
}
