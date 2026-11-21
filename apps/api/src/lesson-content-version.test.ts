import { describe, expect, it } from "bun:test";
import { prepareLessonWrite, sameJson } from "./catalog.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { seedWorld } from "./seed.js";
import { dispatch } from "./test-learner-auth.js";

type LessonBody = {
  id: string;
  title: string;
  content: Record<string, unknown>;
  contentVersion: number;
};

function textDoc(text: string) {
  return {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  };
}

async function setup() {
  const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
  const runtime = await createPgliteRuntime({ clock });
  const world = await seedWorld(runtime, clock);
  const headers = {
    cookie: world.owner.sessionCookie,
    "x-school-id": world.schoolA.publicId,
  };
  const create = (body: Record<string, unknown>) =>
    dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${world.noteA.publicId}/lessons`,
      headers,
      body,
    });
  const update = (lessonId: string, body: Record<string, unknown>) =>
    dispatch(runtime, {
      method: "PATCH",
      path: `/v1/lessons/${lessonId}`,
      headers,
      body,
    });
  const read = async (lessonId: string) => {
    const lesson = await dispatch(runtime, {
      method: "GET",
      path: `/v1/lessons/${lessonId}`,
      headers,
    });
    return lesson.body as LessonBody;
  };
  return { runtime, create, update, read };
}

describe.serial("lesson content version (L2)", () => {
  it("starts at 1 and increases only when content changes", async () => {
    const { runtime, create, update, read } = await setup();
    const created = await create({ title: "Intro", content: textDoc("one") });
    expect(created.status).toBe(201);
    const lesson = created.body as LessonBody;
    expect(lesson.contentVersion).toBe(1);

    const changed = await update(lesson.id, {
      content: textDoc("two"),
      expectedContentVersion: 1,
    });
    expect(changed).toMatchObject({ status: 200, body: { contentVersion: 2 } });

    // Same content, keys in another order: nothing changed.
    const same = await update(lesson.id, {
      content: { content: textDoc("two").content, type: "doc" },
      expectedContentVersion: 2,
    });
    expect(same).toMatchObject({ status: 200, body: { contentVersion: 2 } });

    // Changes without content need no version and don't bump it.
    const renamed = await update(lesson.id, { title: "Renamed" });
    expect(renamed).toMatchObject({
      status: 200,
      body: { title: "Renamed", contentVersion: 2 },
    });
    expect(await read(lesson.id)).toMatchObject({
      contentVersion: 2,
      content: textDoc("two"),
    });
    await runtime.close();
  });

  it("requires the expected version with content and refuses a stale one", async () => {
    const { runtime, create, update, read } = await setup();
    const lesson = (await create({ title: "Intro", content: textDoc("one") }))
      .body as LessonBody;

    const missing = await update(lesson.id, { content: textDoc("two") });
    expect(missing).toMatchObject({
      status: 400,
      body: { details: { reason: "expected_content_version_required" } },
    });

    await update(lesson.id, { content: textDoc("agent"), expectedContentVersion: 1 });
    const stale = await update(lesson.id, {
      title: "Person's title",
      content: textDoc("person"),
      expectedContentVersion: 1,
    });
    expect(stale).toMatchObject({
      status: 409,
      body: {
        code: "conflict",
        details: { reason: "content_version_mismatch", contentVersion: 2 },
      },
    });
    // Nothing of the refused write was kept.
    expect(await read(lesson.id)).toMatchObject({
      title: "Intro",
      content: textDoc("agent"),
      contentVersion: 2,
    });
    await runtime.close();
  });

  it("lets only one of two writes based on the same version through", async () => {
    const { runtime, create, update, read } = await setup();
    const lesson = (await create({ title: "Intro", content: textDoc("one") }))
      .body as LessonBody;
    const results = await Promise.all([
      update(lesson.id, { content: textDoc("first"), expectedContentVersion: 1 }),
      update(lesson.id, { content: textDoc("second"), expectedContentVersion: 1 }),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
    expect((await read(lesson.id)).contentVersion).toBe(2);
    await runtime.close();
  });
});

const quizPage = (attrs: Record<string, unknown>) => ({
  type: "doc",
  content: [{ type: "quiz", attrs }],
});
const quizOf = (lesson: LessonBody) =>
  (lesson.content as { content: Array<{ attrs: Record<string, unknown> }> }).content[0]!
    .attrs as {
    id: string;
    passingGrade: number | null;
    questions: Array<{ id: string; options: Array<{ id: string; correct: boolean }> }>;
  };

describe.serial("quiz block content on write", () => {
  it("fills missing IDs, returns the saved content and keeps given IDs", async () => {
    const { runtime, create, update } = await setup();
    const created = await create({
      title: "Check",
      content: quizPage({
        questions: [
          {
            id: "keep_me",
            text: "Pick one",
            options: [{ text: "Yes", correct: true }, { text: "No" }],
          },
        ],
      }),
    });
    expect(created.status).toBe(201);
    const lesson = created.body as LessonBody;
    const quiz = quizOf(lesson);
    expect(quiz.id).toMatch(/^[A-Za-z0-9_-]{1,64}$/);
    expect(quiz.passingGrade).toBeNull();
    expect(quiz.questions[0]!.id).toBe("keep_me");
    expect(quiz.questions[0]!.options.map((option) => option.correct)).toEqual([
      true,
      false,
    ]);
    expect(quiz.questions[0]!.options.every((option) => /^o_/.test(option.id))).toBe(
      true,
    );

    const resent = await update(lesson.id, {
      content: lesson.content,
      expectedContentVersion: lesson.contentVersion,
    });
    expect(resent).toMatchObject({
      status: 200,
      body: { content: lesson.content, contentVersion: lesson.contentVersion },
    });
    await runtime.close();
  });

  it("refuses duplicate and malformed IDs, too many questions and a second quiz", async () => {
    const { runtime, create } = await setup();
    const option = (id: string, correct = false) => ({ id, text: id, correct });
    const duplicate = await create({
      title: "Check",
      content: quizPage({
        questions: [
          { id: "q1", text: "A", options: [option("o1", true), option("o2")] },
          { id: "q2", text: "B", options: [option("o1", true), option("o3")] },
        ],
      }),
    });
    expect(duplicate).toMatchObject({
      status: 400,
      body: {
        details: {
          reason: "lesson_content_invalid",
          code: "invalid_document",
          fieldPath: "content.content[0].attrs.questions[1].options[0].id",
        },
      },
    });
    const malformed = await create({
      title: "Check",
      content: quizPage({
        id: "<script>",
        questions: [{ text: "A", options: [option("o1", true), option("o2")] }],
      }),
    });
    expect(malformed).toMatchObject({
      status: 400,
      body: {
        details: {
          reason: "lesson_content_invalid",
          fieldPath: "content.content[0].attrs.id",
        },
      },
    });
    const tooMany = await create({
      title: "Check",
      content: quizPage({
        questions: Array.from({ length: 101 }, () => ({
          text: "A",
          options: [{ text: "Y", correct: true }, { text: "N" }],
        })),
      }),
    });
    expect(tooMany).toMatchObject({
      status: 400,
      body: { details: { reason: "lesson_content_invalid" } },
    });
    const two = await create({
      title: "Check",
      content: {
        type: "doc",
        content: [
          { type: "quiz", attrs: { questions: [] } },
          { type: "quiz", attrs: { questions: [] } },
        ],
      },
    });
    expect(two).toMatchObject({
      status: 400,
      body: { details: { code: "quiz_limit", fieldPath: "content.content[1]" } },
    });
    await runtime.close();
  });
});

describe("prepareLessonWrite", () => {
  const doc = (...content: unknown[]) => ({ type: "doc", content });
  const quiz = {
    type: "quiz",
    attrs: {
      id: "qz",
      passingGrade: null,
      questions: [
        {
          id: "q",
          text: "Q",
          options: [
            { id: "a", text: "A", correct: true },
            { id: "b", text: "B", correct: false },
          ],
        },
      ],
    },
  };
  const base = {
    type: "page" as const,
    stored: null,
    status: "draft" as const,
    requiresEnrollment: true,
  };
  const reason = (result: ReturnType<typeof prepareLessonWrite>) =>
    result.ok ? null : result.error.safeDetails?.reason;

  it("starts a page empty and keeps the stored page when no content is sent", () => {
    expect(prepareLessonWrite({ ...base, write: {} })).toEqual({
      ok: true,
      content: { type: "doc", content: [] },
    });
    const stored = doc({ type: "paragraph" });
    expect(prepareLessonWrite({ ...base, stored, write: {} })).toEqual({
      ok: true,
      content: stored,
    });
  });

  it("takes Markdown or JSON and returns the canonical document", () => {
    const fromMarkdown = prepareLessonWrite({ ...base, write: { markdown: "## Hi" } });
    expect(fromMarkdown.ok && fromMarkdown.content).toEqual(
      doc({
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: "Hi" }],
      }),
    );
  });

  it("keeps SCORM package details as JSON and refuses other content", () => {
    expect(
      prepareLessonWrite({
        ...base,
        type: "scorm",
        write: { content: { launchUrl: "a.html" } },
      }),
    ).toEqual({ ok: true, content: { launchUrl: "a.html" } });
    expect(
      prepareLessonWrite({
        ...base,
        type: "scorm",
        stored: { packageInfo: {} },
        write: {},
      }),
    ).toEqual({ ok: true, content: { packageInfo: {} } });
    expect(
      reason(prepareLessonWrite({ ...base, type: "scorm", write: { markdown: "x" } })),
    ).toBe("lesson_content_not_allowed");
    expect(
      reason(prepareLessonWrite({ ...base, type: "file", write: { content: doc() } })),
    ).toBe("lesson_content_not_allowed");
    expect(
      reason(prepareLessonWrite({ ...base, type: "file", write: { markdown: "x" } })),
    ).toBe("lesson_content_not_allowed");
  });

  it("refuses publishing an incomplete page, sent or stored", () => {
    const incomplete = doc({ type: "quiz", attrs: { id: "qz", questions: [] } });
    expect(prepareLessonWrite({ ...base, write: { content: incomplete } }).ok).toBe(
      true,
    );
    expect(
      reason(
        prepareLessonWrite({
          ...base,
          status: "published",
          write: { content: incomplete },
        }),
      ),
    ).toBe("lesson_content_invalid");
    expect(
      reason(
        prepareLessonWrite({
          ...base,
          status: "published",
          stored: incomplete,
          write: {},
        }),
      ),
    ).toBe("lesson_content_invalid");
  });

  it("refuses a free preview page with a quiz", () => {
    expect(
      reason(
        prepareLessonWrite({
          ...base,
          requiresEnrollment: false,
          write: { content: doc(quiz) },
        }),
      ),
    ).toBe("quiz_cannot_be_previewed");
    expect(
      prepareLessonWrite({
        ...base,
        requiresEnrollment: false,
        write: { content: doc() },
      }).ok,
    ).toBe(true);
  });

  it("refuses adding an unavailable block with plan_required", () => {
    const embed = { type: "embed", attrs: { code: "<b>x</b>" } };
    const refused = prepareLessonWrite({
      ...base,
      write: { content: doc(embed) },
      unavailable: { embed: "trial" },
    });
    expect(refused.ok ? null : refused.error).toMatchObject({
      code: "forbidden",
      safeDetails: { reason: "plan_required", blockReason: "trial" },
    });
    expect(
      prepareLessonWrite({
        ...base,
        stored: doc(embed),
        write: { content: doc(embed, { type: "paragraph" }) },
        unavailable: { embed: "trial" },
      }).ok,
    ).toBe(true);
  });
});

describe("sameJson", () => {
  it("ignores key order but not values or array order", () => {
    expect(sameJson({ a: 1, b: { c: [1, 2] } }, { b: { c: [1, 2] }, a: 1 })).toBe(true);
    expect(sameJson({ a: [1, 2] }, { a: [2, 1] })).toBe(false);
    expect(sameJson({ a: 1 }, { a: 1, b: undefined })).toBe(true);
    expect(sameJson({ a: 1 }, { a: "1" })).toBe(false);
  });
});
