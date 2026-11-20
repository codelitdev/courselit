import { describe, expect, it } from "bun:test";
import { prepareLessonContent, sameJson } from "./catalog.js";
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
    dispatch(runtime, { method: "PATCH", path: `/v1/lessons/${lessonId}`, headers, body });
  const read = async (lessonId: string) => {
    const product = await dispatch(runtime, {
      method: "GET",
      path: `/v1/products/${world.noteA.publicId}`,
      headers,
    });
    return (product.body as { lessons: LessonBody[] }).lessons.find(
      (lesson) => lesson.id === lessonId,
    )!;
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

describe.serial("quiz lesson content on write", () => {
  it("fills missing IDs, returns the saved content and keeps given IDs", async () => {
    const { runtime, create, update } = await setup();
    const created = await create({
      title: "Check",
      type: "quiz",
      content: {
        requiresPassingGrade: true,
        questions: [
          {
            id: "keep_me",
            text: "Pick one",
            options: [
              { text: "Yes", correct: true },
              { text: "No", correctAnswer: true },
            ],
          },
        ],
      },
    });
    expect(created.status).toBe(201);
    const lesson = created.body as LessonBody;
    const quiz = lesson.content as {
      id: string;
      passingGrade: number | null;
      questions: Array<{ id: string; options: Array<{ id: string; correct: boolean }> }>;
    };
    expect(quiz.id).toMatch(/^[A-Za-z0-9_-]{1,64}$/);
    expect(quiz.passingGrade).toBeNull();
    expect(quiz.questions[0]!.id).toBe("keep_me");
    expect(quiz.questions[0]!.options.map((option) => option.correct)).toEqual([
      true,
      false,
    ]);
    expect(Object.keys(lesson.content).sort()).toEqual(["id", "passingGrade", "questions"]);

    const resent = await update(lesson.id, {
      content: lesson.content,
      expectedContentVersion: lesson.contentVersion,
    });
    expect(resent).toMatchObject({ status: 200, body: { content: lesson.content } });
    await runtime.close();
  });

  it("refuses duplicate and malformed IDs and too many questions", async () => {
    const { runtime, create } = await setup();
    const option = (id: string, correct = false) => ({ id, text: id, correct });
    const duplicate = await create({
      title: "Check",
      type: "quiz",
      content: {
        questions: [
          { id: "q1", text: "A", options: [option("o1", true), option("o2")] },
          { id: "q2", text: "B", options: [option("o1", true), option("o3")] },
        ],
      },
    });
    expect(duplicate).toMatchObject({
      status: 400,
      body: { details: { reason: "quiz_id_duplicate", path: "questions.1.options.0.id" } },
    });
    const malformed = await create({
      title: "Check",
      type: "quiz",
      content: {
        id: "<script>",
        questions: [{ text: "A", options: [option("o1", true), option("o2")] }],
      },
    });
    expect(malformed).toMatchObject({
      status: 400,
      body: { details: { reason: "quiz_id_invalid" } },
    });
    const tooMany = await create({
      title: "Check",
      type: "quiz",
      content: {
        questions: Array.from({ length: 101 }, () => ({
          text: "A",
          options: [{ text: "Y", correct: true }, { text: "N" }],
        })),
      },
    });
    expect(tooMany).toMatchObject({
      status: 400,
      body: { details: { reason: "quiz_too_many_questions" } },
    });
    await runtime.close();
  });
});

describe("prepareLessonContent", () => {
  it("normalizes quizzes and leaves other content alone", () => {
    const doc = textDoc("x");
    expect(prepareLessonContent({ type: "text", content: doc })).toEqual({
      ok: true,
      content: doc,
    });
    expect(prepareLessonContent({ type: "embed", content: { value: " " } })).toMatchObject({
      ok: false,
    });
    expect(
      prepareLessonContent({
        type: "quiz",
        requiresEnrollment: false,
        content: { questions: [] },
      }),
    ).toMatchObject({ ok: false });
    const quiz = prepareLessonContent({
      type: "quiz",
      content: {
        questions: [{ text: "Q", options: [{ text: "A", correct: true }, { text: "B" }] }],
      },
    });
    expect(quiz.ok && Object.keys(quiz.content).sort()).toEqual([
      "id",
      "passingGrade",
      "questions",
    ]);
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
