import { describe, expect, it } from "bun:test";
import {
  type ChecklistInput,
  canGoLive,
  coursePreviewPath,
  draftLessonIds,
  dripBody,
  dripFormFor,
  dripLabel,
  hasDescription,
  launchChecklist,
  lessonCounts,
  lessonMeta,
  lessonShortLabel,
  nextSectionName,
  optionalProgress,
  productPhase,
  SECONDS_PER_DAY,
  sectionSummary,
  validateDripForm,
} from "./product-publishing";

const lesson = (id: string, status: "draft" | "published", sectionId = "s1") => ({
  id,
  status,
  sectionId,
});

const base: ChecklistInput = {
  kind: "course",
  privacy: "unlisted",
  description: "",
  hasFeaturedImage: false,
  discussions: false,
  certificate: false,
  leadMagnet: false,
  plans: [],
  lessons: [],
};

describe("productPhase", () => {
  it("is draft until it has gone live once", () => {
    expect(productPhase({ status: "draft", publishedAt: null })).toBe("draft");
    expect(productPhase({ status: "draft" })).toBe("draft");
  });
  it("is live while published", () => {
    expect(
      productPhase({ status: "published", publishedAt: "2026-01-01T00:00:00Z" }),
    ).toBe("live");
  });
  it("is offline when taken back to draft after going live", () => {
    expect(productPhase({ status: "draft", publishedAt: "2026-01-01T00:00:00Z" })).toBe(
      "offline",
    );
  });
});

describe("lesson counts", () => {
  const lessons = [
    lesson("a", "published"),
    lesson("b", "draft"),
    lesson("c", "draft"),
  ];
  it("counts live and draft lessons", () => {
    expect(lessonCounts(lessons)).toEqual({ total: 3, live: 1, drafts: 2 });
    expect(draftLessonIds(lessons)).toEqual(["b", "c"]);
  });
  it("summarises a section", () => {
    expect(sectionSummary(lessons)).toBe("1 of 3 live");
    expect(sectionSummary([])).toBe("Empty");
  });
});

describe("launchChecklist", () => {
  it("blocks a blank course on a plan and a live lesson", () => {
    const steps = launchChecklist(base);
    expect(steps.filter((s) => s.required).map((s) => s.key)).toEqual([
      "plans",
      "content",
    ]);
    expect(canGoLive(steps)).toBe(false);
    expect(steps.find((s) => s.key === "content")).toMatchObject({
      title: "Add your first lesson",
      cta: "Add lessons",
      done: false,
    });
  });

  it("asks for a live lesson when every lesson is a draft", () => {
    const steps = launchChecklist({
      ...base,
      plans: [{ status: "active", kind: "free" }],
      lessons: [lesson("a", "draft"), lesson("b", "draft")],
    });
    expect(steps.find((s) => s.key === "content")).toMatchObject({
      title: "Make at least one lesson live",
      detail: "All 2 lessons are drafts.",
    });
    expect(canGoLive(steps)).toBe(false);
  });

  it("ignores archived plans", () => {
    const steps = launchChecklist({
      ...base,
      plans: [{ status: "archived", kind: "free" }],
      lessons: [lesson("a", "published")],
    });
    expect(canGoLive(steps)).toBe(false);
  });

  it("can go live with an active plan and a live lesson", () => {
    const steps = launchChecklist({
      ...base,
      plans: [{ status: "active", kind: "one_time" }],
      lessons: [lesson("a", "published"), lesson("b", "draft")],
    });
    expect(canGoLive(steps)).toBe(true);
    expect(steps.find((s) => s.key === "content")?.detail).toBe("1 of 2 lessons live.");
    expect(steps.find((s) => s.key === "plans")?.detail).toBe("1 plan.");
  });

  it("tracks the optional extras", () => {
    const steps = launchChecklist({
      ...base,
      description: "Learn to paint",
      hasFeaturedImage: true,
      certificate: true,
    });
    // Visibility always counts as chosen.
    expect(optionalProgress(steps)).toEqual({ done: 4, total: 5 });
  });

  it("talks about files and skips course extras for a download", () => {
    const steps = launchChecklist({ ...base, kind: "download" });
    expect(steps.map((s) => s.key)).toEqual([
      "plans",
      "content",
      "visibility",
      "description",
      "image",
    ]);
    expect(steps[1]).toMatchObject({ title: "Add your files", cta: "Add files" });
  });
});

describe("hasDescription", () => {
  it("treats empty editor documents as missing", () => {
    expect(hasDescription("")).toBe(false);
    expect(
      hasDescription(JSON.stringify({ type: "doc", content: [{ type: "paragraph" }] })),
    ).toBe(false);
  });
  it("finds text in an editor document or plain text", () => {
    expect(
      hasDescription(
        JSON.stringify({
          type: "doc",
          content: [{ type: "paragraph", content: [{ type: "text", text: "Hi" }] }],
        }),
      ),
    ).toBe(true);
    expect(hasDescription("Plain words")).toBe(true);
  });
});

describe("drip release", () => {
  const none = {
    dripEnabled: false,
    dripType: null,
    dripDelaySeconds: null,
    dripAt: null,
  };

  it("reads a section into the form", () => {
    expect(dripFormFor(none)).toEqual({ mode: "now", days: "1", at: "" });
    expect(
      dripFormFor({
        ...none,
        dripEnabled: true,
        dripType: "relative-date",
        dripDelaySeconds: 3 * SECONDS_PER_DAY,
      }),
    ).toMatchObject({ mode: "relative-date", days: "3" });
  });

  it("validates days and dates", () => {
    expect(validateDripForm({ mode: "relative-date", days: "0", at: "" })).toMatch(
      /days/,
    );
    expect(validateDripForm({ mode: "relative-date", days: "2.5", at: "" })).toMatch(
      /days/,
    );
    expect(validateDripForm({ mode: "exact-date", days: "1", at: "" })).toMatch(/date/);
    expect(validateDripForm({ mode: "relative-date", days: "2", at: "" })).toBeNull();
    expect(validateDripForm({ mode: "now", days: "", at: "" })).toBeNull();
  });

  it("builds the section body", () => {
    expect(dripBody({ mode: "now", days: "4", at: "" })).toEqual(none);
    expect(dripBody({ mode: "relative-date", days: "2", at: "" })).toEqual({
      dripEnabled: true,
      dripType: "relative-date",
      dripDelaySeconds: 2 * SECONDS_PER_DAY,
      dripAt: null,
    });
    const exact = dripBody({ mode: "exact-date", days: "1", at: "2026-12-01T09:30" });
    expect(exact).toMatchObject({
      dripEnabled: true,
      dripType: "exact-date",
      dripDelaySeconds: null,
    });
    expect(new Date(exact.dripAt!).getTime()).toBe(
      new Date("2026-12-01T09:30").getTime(),
    );
  });

  it("labels the section badge", () => {
    expect(dripLabel(none)).toBeNull();
    expect(
      dripLabel({
        ...none,
        dripEnabled: true,
        dripType: "relative-date",
        dripDelaySeconds: SECONDS_PER_DAY,
      }),
    ).toBe("Opens 1 day after previous");
    expect(
      dripLabel(
        {
          ...none,
          dripEnabled: true,
          dripType: "exact-date",
          dripAt: "2026-12-01T12:00:00.000Z",
        },
        "en-GB",
      ),
    ).toBe("Opens 1 Dec");
  });
});

describe("lesson rows and sections", () => {
  it("labels lesson types", () => {
    expect(lessonShortLabel("video")).toBe("VID");
    expect(lessonShortLabel("quiz")).toBe("QZ");
    expect(lessonMeta({ type: "text", requiresEnrollment: false }, "course")).toBe(
      "Text · Free preview",
    );
    expect(lessonMeta({ type: "file", requiresEnrollment: false }, "download")).toBe(
      "File",
    );
  });

  it("names a new section after the next free number", () => {
    expect(nextSectionName([])).toBe("Section 1");
    expect(nextSectionName([{ title: "Intro" }, { title: "Section 3" }])).toBe(
      "Section 4",
    );
  });
});

describe("coursePreviewPath", () => {
  it("opens the storefront course viewer with the token in the hash", () => {
    expect(coursePreviewPath({ id: "prd_1", slug: "water-lilies" }, "a/b+c")).toBe(
      "/course/water-lilies/prd_1#preview=a%2Fb%2Bc",
    );
  });
  it("falls back to the id when there is no slug", () => {
    expect(coursePreviewPath({ id: "prd_1", slug: "" }, "t")).toBe(
      "/course/prd_1/prd_1#preview=t",
    );
  });
});
