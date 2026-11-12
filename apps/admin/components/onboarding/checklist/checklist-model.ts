export type ChecklistKey =
  | "pay"
  | "mail"
  | "legal"
  | "home"
  | "domain"
  | "ai"
  | "learners"
  | "welcome"
  | "course"
  | "team";

export type ChecklistEntry = { key: ChecklistKey; done: boolean };

export type SchoolOnboardingState = {
  status: "in_progress" | "complete";
  step: string;
  draft: Record<string, unknown>;
  checklistHidden: boolean;
  resumePromptHidden: boolean;
  checklist: ChecklistEntry[];
  billing: { required: boolean; entitled: boolean };
  updatedAt: string;
};

export type ChecklistItemDefinition = {
  key: ChecklistKey;
  title: string;
  why: string;
  cta: string;
};

export type ChecklistGroupDefinition = {
  name: string;
  items: ChecklistItemDefinition[];
};

export const CHECKLIST_GROUPS: ChecklistGroupDefinition[] = [
  {
    name: "Get ready to sell",
    items: [
      {
        key: "pay",
        title: "Connect payments",
        why: "Then add a price to your community, or any course or download.",
        cta: "Connect payments",
      },
      {
        key: "mail",
        title: "Add your mailing address",
        why: "Required by anti-spam law before you can send any email.",
        cta: "Add address",
      },
      {
        key: "legal",
        title: "Review and publish your Terms of use and Privacy policy",
        why: "They start as drafts with basic text. Make them fit your school, then publish: your footer and checkout link to them once they're published.",
        cta: "Review them",
      },
    ],
  },
  {
    name: "Make it yours",
    items: [
      {
        key: "home",
        title: "Edit your homepage",
        why: "Add sections, testimonials or an about you, in the page editor.",
        cta: "Open page editor",
      },
      {
        key: "domain",
        title: "Connect your own domain",
        why: "Use an address like learn.yourschool.com.",
        cta: "Add domain",
      },
      {
        key: "ai",
        title: "Connect your AI assistant",
        why: "Run your school from Claude, ChatGPT, Cursor and others.",
        cta: "Connect",
      },
    ],
  },
  {
    name: "Bring people in",
    items: [
      {
        key: "learners",
        title: "Invite your first members",
        why: "Share your join link, or import the contacts you already have.",
        cta: "Invite people",
      },
      {
        key: "welcome",
        title: "Set up a welcome email",
        why: "Greet every new member automatically.",
        cta: "Create welcome email",
      },
      {
        key: "course",
        title: "Create a course",
        why: "Teach with lessons and videos, and include it in your community.",
        cta: "Create course",
      },
      {
        key: "team",
        title: "Invite a team member",
        why: "Share the work with a co-teacher or assistant.",
        cta: "Invite",
      },
    ],
  },
];

export const CHECKLIST_KEYS: ChecklistKey[] = CHECKLIST_GROUPS.flatMap((g) =>
  g.items.map((i) => i.key),
);

export type ChecklistProgress = {
  total: number;
  doneCount: number;
  percent: number;
  allDone: boolean;
  /** First item, in display order, that is not done yet. */
  firstTodo: ChecklistKey | null;
  isDone: (key: ChecklistKey) => boolean;
};

export function summarizeChecklist(
  entries: readonly ChecklistEntry[] | undefined,
): ChecklistProgress {
  const done = new Set((entries ?? []).filter((e) => e.done).map((e) => e.key));
  const total = CHECKLIST_KEYS.length;
  const doneCount = CHECKLIST_KEYS.filter((k) => done.has(k)).length;
  return {
    total,
    doneCount,
    percent: Math.round((doneCount / total) * 100),
    allDone: doneCount === total,
    firstTodo: CHECKLIST_KEYS.find((k) => !done.has(k)) ?? null,
    isDone: (key) => done.has(key),
  };
}

type PageSummary = { id: string; slug: string; status: string };

/**
 * Picks the website page the "legal" item should open: the first of Terms and
 * Privacy that is not published yet, falling back to Terms.
 */
export function pickLegalPage(pages: readonly PageSummary[]): PageSummary | null {
  const terms = pages.find((p) => p.slug === "terms");
  const privacy = pages.find((p) => p.slug === "privacy");
  const unpublished = [terms, privacy].find((p) => p && p.status !== "published");
  return unpublished ?? terms ?? privacy ?? null;
}

export function pickHomePage(pages: readonly PageSummary[]): PageSummary | null {
  return pages.find((p) => p.slug === "") ?? null;
}

export function pageEditorHref(pageId: string, redirectTo: string): string {
  return `/pages/${encodeURIComponent(pageId)}/edit?redirectTo=${encodeURIComponent(redirectTo)}`;
}
