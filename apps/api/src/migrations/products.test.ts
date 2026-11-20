import { describe, expect, it } from "bun:test";
import { and, eq } from "drizzle-orm";
import * as schema from "../db/schema/index.js";
import { createPgliteRuntime, freezeRuntimeClock } from "../runtime.js";
import { seedWorld } from "../seed.js";
import { importLegacyDomains } from "./domains.js";
import { importLegacyProducts, quizFromMainContent } from "./products.js";

describe.serial("legacy product migration", () => {
  it("dry-runs and applies source-typed courses with sections, rich lessons, drip, and idempotency", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    const domain = await importLegacyDomains(runtime.db, {
      clock,
      mode: "apply",
      records: [
        {
          _id: "legacy-domain-products",
          name: "products-school",
          email: world.owner.email,
          currency: "INR",
        },
      ],
    });
    const schoolId = domain.verificationChallenges.length === 0
      ? (await runtime.db
          .select({ id: schema.schools.id })
          .from(schema.schools)
          .where(eq(schema.schools.subdomain, "products-school"))
          .limit(1))[0]!.id
      : null;
    expect(schoolId).toBeString();

    const course = {
      _id: "legacy-course-1",
      courseId: "legacy-course-1",
      domain: "legacy-domain-products",
      title: "Legacy Course",
      slug: "legacy-course",
      type: "course",
      creatorId: world.owner.id,
      published: true,
      privacy: "public",
      description: JSON.stringify({
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "Hello" }] }],
      }),
      certificate: true,
      discussions: true,
      groups: [
        {
          _id: "legacy-group-2",
          name: "Second section",
          rank: 2,
          lessonsOrder: ["legacy-lesson-2"],
          drip: {
            type: "relative-date",
            status: true,
            delayInMillis: 86_400_000,
          },
        },
        {
          _id: "legacy-group-1",
          name: "First section",
          rank: 1,
          lessonsOrder: ["legacy-lesson-1"],
        },
      ],
      lessons: ["legacy-lesson-2", "legacy-lesson-1"],
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-02-01T00:00:00.000Z",
    };
    const lessons = [
      {
        lessonId: "legacy-lesson-1",
        courseId: "legacy-course-1",
        groupId: "legacy-group-1",
        title: "Rich text lesson",
        type: "text",
        content: {
          type: "doc",
          content: [{ type: "paragraph", content: [{ type: "text", text: "Lesson" }] }],
        },
        published: true,
        downloadable: false,
        requiresEnrollment: true,
      },
      {
        lessonId: "legacy-lesson-2",
        courseId: "legacy-course-1",
        groupId: "legacy-group-2",
        title: "Video lesson",
        type: "video",
        content: { type: "doc", content: [] },
        published: false,
        downloadable: true,
        requiresEnrollment: false,
      },
    ];

    const dryRun = await importLegacyProducts(runtime.db, {
      clock,
      courses: [course],
      lessons,
      mode: "dry_run",
    });
    expect(dryRun.counts).toMatchObject({
      seen: 1,
      ready: 1,
      imported: 0,
      rejected: 0,
      sectionsImported: 0,
      lessonsImported: 0,
    });
    expect(
      await runtime.db
        .select()
        .from(schema.products)
        .where(eq(schema.products.publicId, "legacy-course-1")),
    ).toHaveLength(0);

    const applied = await importLegacyProducts(runtime.db, {
      clock,
      courses: [course],
      lessons,
      mode: "apply",
    });
    expect(applied.counts).toMatchObject({
      seen: 1,
      ready: 1,
      imported: 1,
      rejected: 0,
      sectionsImported: 2,
      lessonsImported: 2,
    });
    const products = await runtime.db
      .select()
      .from(schema.products)
      .where(eq(schema.products.publicId, "legacy-course-1"));
    expect(products).toHaveLength(1);
    expect(products[0]).toMatchObject({
      schoolId,
      kind: "course",
      status: "published",
      description: course.description,
      certificate: true,
      discussions: true,
    });
    const sections = await runtime.db
      .select()
      .from(schema.productSections)
      .where(eq(schema.productSections.productId, products[0]!.id));
    expect(sections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          publicId: "legacy-group-1",
          position: 1,
          dripEnabled: false,
        }),
        expect.objectContaining({
          publicId: "legacy-group-2",
          position: 2,
          dripEnabled: true,
          dripType: "relative-date",
          dripDelaySeconds: 86_400,
        }),
      ]),
    );
    const importedLessons = await runtime.db
      .select()
      .from(schema.lessons)
      .where(eq(schema.lessons.productId, products[0]!.id));
    expect(importedLessons.map((lesson) => [lesson.publicId, lesson.position])).toEqual([
      ["legacy-lesson-1", 1],
      ["legacy-lesson-2", 2],
    ]);
    expect(importedLessons.map((lesson) => lesson.type)).toEqual(["page", "page"]);
    expect(importedLessons[0]!.content).toEqual(lessons[0]!.content);
    // A downloadable video becomes a Video block plus a File block.
    expect(importedLessons[1]!.content).toMatchObject({
      type: "doc",
      content: [
        { type: "video", attrs: { media: null } },
        { type: "file", attrs: { media: null } },
      ],
    });
    expect(applied.warnings).toEqual([]);

    const second = await importLegacyProducts(runtime.db, {
      clock,
      courses: [course],
      lessons,
      mode: "apply",
    });
    expect(second.counts).toMatchObject({
      seen: 1,
      ready: 0,
      imported: 0,
      alreadyMapped: 1,
      rejected: 0,
    });
    expect(
      await runtime.db
        .select()
        .from(schema.products)
        .where(eq(schema.products.publicId, "legacy-course-1")),
    ).toHaveLength(1);
    await runtime.close();
  });

  it("rejects unsupported or lossy source records instead of dropping content", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    await importLegacyDomains(runtime.db, {
      clock,
      mode: "apply",
      records: [
        {
          _id: "legacy-domain-rejections",
          name: "rejections-school",
          email: world.owner.email,
        },
      ],
    });
    const base = {
      _id: "legacy-course-rejection",
      courseId: "legacy-course-rejection",
      domain: "legacy-domain-rejections",
      title: "Rejected course",
      slug: "rejected-course",
      creatorId: world.owner.id,
      published: false,
      privacy: "unlisted",
      groups: [],
    };
    const result = await importLegacyProducts(runtime.db, {
      clock,
      courses: [
        { ...base, type: "blog" },
        { ...base, _id: "legacy-course-media", courseId: "legacy-course-media", slug: "media-course", type: "course", featuredImage: { url: "https://example.test/image" } },
        { ...base, _id: "legacy-course-missing", courseId: "legacy-course-missing", slug: "missing-course", type: "course", groups: [{ _id: "missing-group", name: "Section", rank: 1, lessonsOrder: ["missing-lesson"] }] },
      ],
      lessons: [],
      mode: "dry_run",
    });
    expect(result.counts).toMatchObject({ seen: 3, ready: 0, rejected: 3 });
    expect(result.rejectionByCode).toMatchObject({
      invalid_product_type: 1,
      media_requires_medialit: 1,
      missing_lesson: 1,
    });
    expect(
      await runtime.db
        .select()
        .from(schema.migrationRejections)
        .where(and(eq(schema.migrationRejections.runId, result.runId), eq(schema.migrationRejections.code, "missing_lesson"))),
    ).toHaveLength(1);
    await runtime.close();
  });
});

describe("main quiz content import", () => {
  const mainQuiz = (overrides: Record<string, unknown> = {}) => ({
    questions: [
      {
        text: "Which tier anchors the price?",
        type: "multiple",
        options: [
          { text: "The top tier", correctAnswer: true },
          { text: "The middle tier" },
          { text: "Both", correctAnswer: true },
        ],
      },
    ],
    requiresPassingGrade: true,
    passingGrade: 60,
    ...overrides,
  });

  it("maps to the quiz shape with generated IDs and the pass mark", () => {
    const result = quizFromMainContent(mainQuiz());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toMatchObject({
      passingGrade: 60,
      questions: [
        {
          text: "Which tier anchors the price?",
          options: [
            { text: "The top tier", correct: true },
            { text: "The middle tier", correct: false },
            { text: "Both", correct: true },
          ],
        },
      ],
    });
    const ids = [
      result.value.id,
      ...result.value.questions.flatMap((question) => [
        question.id,
        ...question.options.map((option) => option.id),
      ]),
    ];
    expect(new Set(ids).size).toBe(5);
    for (const id of ids) expect(id).toMatch(/^[A-Za-z0-9_-]{1,64}$/);
    expect(JSON.stringify(result.value)).not.toContain("correctAnswer");
    expect(result.value.questions[0]).not.toHaveProperty("type");
  });

  it("imports an ungraded quiz without a pass mark", () => {
    const result = quizFromMainContent(mainQuiz({ requiresPassingGrade: false }));
    expect(result).toMatchObject({ ok: true, value: { passingGrade: null } });
  });

  it("reports a quiz the rewrite can't hold", () => {
    expect(
      quizFromMainContent(
        mainQuiz({ questions: [{ text: "No answer", options: [{ text: "A" }, { text: "B" }] }] }),
      ),
    ).toMatchObject({ ok: false, reason: "quiz_correct_answer_required" });
  });
});
