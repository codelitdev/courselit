import { describe, expect, it } from "bun:test";
import { contract } from "@courselit/api-contract";
import { and, eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { QUIZ_EVALUATION_RATE_LIMIT } from "./quiz.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { seedWorld } from "./seed.js";
import { dispatch } from "./test-learner-auth.js";

function quizContent() {
  return {
    id: "qz_check",
    passingGrade: 70,
    questions: [
      {
        id: "q1",
        text: "One correct answer",
        options: [
          { id: "q1a", text: "Correct", correct: true },
          { id: "q1b", text: "Wrong", correct: false },
        ],
      },
      {
        id: "q2",
        text: "Two correct answers",
        options: [
          { id: "q2a", text: "Correct one", correct: true },
          { id: "q2b", text: "Correct two", correct: true },
          { id: "q2c", text: "Wrong", correct: false },
        ],
      },
    ],
  };
}

async function setup(options: { enroll?: boolean } = {}) {
  const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
  const runtime = await createPgliteRuntime({ clock });
  const world = await seedWorld(runtime, clock);
  const adminHeaders = {
    cookie: world.owner.sessionCookie,
    "x-school-id": world.schoolA.publicId,
  };
  const product = await dispatch(runtime, {
    method: "POST",
    path: "/v1/products",
    headers: adminHeaders,
    body: { kind: "course", title: "Quiz course" },
  });
  expect(product.status).toBe(201);
  const productId = (product.body as { id: string }).id;
  await dispatch(runtime, {
    method: "POST",
    path: `/v1/products/${productId}/plans`,
    headers: adminHeaders,
    body: { name: "Free access", kind: "free", amountMinor: 0 },
  });
  await dispatch(runtime, {
    method: "PATCH",
    path: `/v1/products/${productId}`,
    headers: adminHeaders,
    body: { status: "published" },
  });
  const lesson = await dispatch(runtime, {
    method: "POST",
    path: `/v1/products/${productId}/lessons`,
    headers: adminHeaders,
    body: {
      title: "Knowledge check",
      type: "quiz",
      content: quizContent(),
      status: "published",
    },
  });
  expect(lesson.status).toBe(201);
  const lessonId = (lesson.body as { id: string }).id;

  const signedUp = await dispatch(runtime, {
    method: "POST",
    path: "/v1/learner/auth/sign-up",
    headers: { "x-school-id": world.schoolA.publicId },
    body: {
      schoolId: world.schoolA.publicId,
      email: "quiz-learner@example.com",
      password: "learner-password-1",
      name: "Quiz Learner",
    },
  });
  expect(signedUp.status).toBe(201);
  const learnerHeaders = {
    cookie: signedUp.headers?.["Set-Cookie"] as string,
    "x-school-id": world.schoolA.publicId,
  };
  if (options.enroll !== false) {
    const enrollment = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/memberships",
      headers: learnerHeaders,
      body: { productId },
    });
    expect(enrollment.status).toBe(201);
  }

  const evaluate = (body: unknown) =>
    dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/products/${productId}/lessons/${lessonId}/evaluation`,
      headers: learnerHeaders,
      body,
    });
  const complete = () =>
    dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/lessons/${lessonId}/complete`,
      headers: learnerHeaders,
      body: {},
    });
  const replaceQuiz = async (content: Record<string, unknown>) => {
    const current = await dispatch(runtime, {
      method: "GET",
      path: `/v1/products/${productId}`,
      headers: adminHeaders,
    });
    const version = (
      current.body as { lessons: Array<{ id: string; contentVersion: number }> }
    ).lessons.find((item) => item.id === lessonId)!.contentVersion;
    const updated = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/lessons/${lessonId}`,
      headers: adminHeaders,
      body: { content, expectedContentVersion: version },
    });
    expect(updated.status).toBe(200);
    return updated.body as { content: Record<string, unknown> };
  };
  return {
    runtime,
    world,
    clock,
    adminHeaders,
    learnerHeaders,
    productId,
    lessonId,
    evaluate,
    complete,
    replaceQuiz,
  };
}

describe.serial("quiz evaluation", () => {
  it("grades by question and option ID and keeps production scoring per attempt", async () => {
    const { runtime, world, lessonId, evaluate, complete } = await setup();

    const partial = await evaluate({ quizId: "qz_check", answers: { q1: ["q1a"], q2: [] } });
    expect(partial).toMatchObject({
      status: 200,
      body: { quizId: "qz_check", pass: false, score: (1 / 3) * 100, passingGrade: 70 },
    });
    expect(partial.body).not.toHaveProperty("requiresPassingGrade");

    const completionBeforePass = await complete();
    expect(completionBeforePass).toMatchObject({
      status: 400,
      body: { details: { reason: "need_to_pass" } },
    });

    // Choosing every option can't pass: a single-answer question takes one.
    const everyOption = await evaluate({
      quizId: "qz_check",
      answers: { q1: ["q1a", "q1b"], q2: ["q2a", "q2b", "q2c"] },
    });
    expect(everyOption).toMatchObject({
      status: 400,
      body: { details: { reason: "answers_missing_or_invalid" } },
    });

    const full = await evaluate({
      quizId: "qz_check",
      answers: { q1: ["q1a"], q2: ["q2a", "q2b"] },
    });
    expect(full).toMatchObject({ status: 200, body: { pass: true, score: 100 } });
    expect((await complete()).status).toBe(200);

    const lessonRow = await runtime.db
      .select({ id: schema.lessons.id })
      .from(schema.lessons)
      .where(
        and(
          eq(schema.lessons.schoolId, world.schoolA.id),
          eq(schema.lessons.publicId, lessonId),
        ),
      )
      .limit(1);
    const evaluations = await runtime.db
      .select()
      .from(schema.lessonEvaluations)
      .where(eq(schema.lessonEvaluations.lessonId, lessonRow[0]!.id));
    expect(evaluations).toHaveLength(2);
    expect(evaluations.map((row) => row.quizId)).toEqual(["qz_check", "qz_check"]);
    expect(evaluations[0]?.score).toBeCloseTo((1 / 3) * 100, 4);
    expect(evaluations[0]?.passingGrade).toBe(70);
    expect(evaluations[1]?.score).toBe(100);
    await runtime.close();
  });

  it("refuses an attempt before enrollment and answers in the old shape", async () => {
    const { runtime, evaluate } = await setup({ enroll: false });
    const beforeEnrollment = await evaluate({ quizId: "qz_check", answers: { q1: ["q1a"] } });
    expect(beforeEnrollment.status).toBe(403);
    const byIndex = await evaluate({ answers: [[0], [0, 1]] });
    expect(byIndex.status).toBe(400);
    await runtime.close();
  });

  it("refuses unknown questions or options and a quiz that is no longer there", async () => {
    const { runtime, evaluate, replaceQuiz } = await setup();
    expect(
      (await evaluate({ quizId: "qz_check", answers: { nope: ["q1a"] } })).body,
    ).toMatchObject({ details: { reason: "answers_missing_or_invalid" } });
    expect(
      (await evaluate({ quizId: "qz_check", answers: { q1: ["q2a"] } })).body,
    ).toMatchObject({ details: { reason: "answers_missing_or_invalid" } });

    await replaceQuiz({ ...quizContent(), id: "qz_new" });
    const stale = await evaluate({ quizId: "qz_check", answers: { q1: ["q1a"] } });
    expect(stale).toMatchObject({
      status: 409,
      body: { code: "conflict", details: { reason: "quiz_changed" } },
    });
    await runtime.close();
  });

  it("passes every attempt when the quiz has no pass mark", async () => {
    const { runtime, evaluate, replaceQuiz, complete } = await setup();
    await replaceQuiz({ ...quizContent(), passingGrade: null });
    const attempt = await evaluate({ quizId: "qz_check", answers: {} });
    expect(attempt).toMatchObject({
      status: 200,
      body: { pass: true, score: 0, passingGrade: null },
    });
    expect((await complete()).status).toBe(200);
    await runtime.close();
  });

  it("needs a pass at the current quiz to complete, and keeps a recorded completion", async () => {
    const { runtime, evaluate, complete, replaceQuiz } = await setup();
    const passAll = { q1: ["q1a"], q2: ["q2a", "q2b"] };
    expect((await evaluate({ quizId: "qz_check", answers: passAll })).body).toMatchObject({
      pass: true,
    });

    // Editing the quiz but keeping its ID keeps the pass.
    await replaceQuiz({ ...quizContent(), passingGrade: 90 });
    expect((await complete()).status).toBe(200);

    // A new quiz starts with no attempts, but the recorded completion stays.
    await replaceQuiz({ ...quizContent(), id: "qz_replacement" });
    expect((await complete()).status).toBe(200);
    await runtime.close();
  });

  it("does not count a pass at a replaced quiz towards the new one", async () => {
    const { runtime, evaluate, complete, replaceQuiz } = await setup();
    await evaluate({ quizId: "qz_check", answers: { q1: ["q1a"], q2: ["q2a", "q2b"] } });
    await replaceQuiz({ ...quizContent(), id: "qz_replacement" });
    expect(await complete()).toMatchObject({
      status: 400,
      body: { details: { reason: "need_to_pass" } },
    });
    await evaluate({
      quizId: "qz_replacement",
      answers: { q1: ["q1a"], q2: ["q2a", "q2b"] },
    });
    expect((await complete()).status).toBe(200);
    await runtime.close();
  });

  it("rate limits attempts per learner membership", async () => {
    const { runtime, evaluate } = await setup();
    for (let attempt = 0; attempt < QUIZ_EVALUATION_RATE_LIMIT.limit; attempt += 1) {
      expect((await evaluate({ quizId: "qz_check", answers: {} })).status).toBe(200);
    }
    const limited = await evaluate({ quizId: "qz_check", answers: {} });
    expect(limited).toMatchObject({ status: 429, body: { code: "rate_limited" } });
    await runtime.close();
  });
});

describe.serial("quiz answers never reach learners (L1)", () => {
  it("strips answers from learner, public and preview reads; authors keep them", async () => {
    const { runtime, world, adminHeaders, learnerHeaders, productId, lessonId } =
      await setup();

    const admin = await dispatch(runtime, {
      method: "GET",
      path: `/v1/products/${productId}`,
      headers: adminHeaders,
    });
    expect(admin.status).toBe(200);
    const adminLesson = (
      admin.body as { lessons: Array<{ id: string; content: unknown }> }
    ).lessons.find((item) => item.id === lessonId)!;
    expect(adminLesson.content).toEqual(quizContent());
    contract.getProduct.responses[200].parse(admin.body);

    const learner = await dispatch(runtime, {
      method: "GET",
      path: `/v1/public/${world.schoolA.publicId}/products/${productId}`,
      headers: learnerHeaders,
    });
    expect(learner.status).toBe(200);
    const learnerLesson = (
      learner.body as { lessons: Array<{ id: string; content: unknown }> }
    ).lessons.find((item) => item.id === lessonId)!;
    expect(learnerLesson.content).toEqual({
      id: "qz_check",
      passingGrade: 70,
      questions: [
        {
          id: "q1",
          text: "One correct answer",
          multiple: false,
          options: [
            { id: "q1a", text: "Correct" },
            { id: "q1b", text: "Wrong" },
          ],
        },
        {
          id: "q2",
          text: "Two correct answers",
          multiple: true,
          options: [
            { id: "q2a", text: "Correct one" },
            { id: "q2b", text: "Correct two" },
            { id: "q2c", text: "Wrong" },
          ],
        },
      ],
    });
    expect(JSON.stringify(learner.body)).not.toContain('"correct"');
    expect(learner.body).not.toHaveProperty("lessons.0.contentVersion");
    contract.getPublicProduct.responses[200].parse(learner.body);

    const anonymous = await dispatch(runtime, {
      method: "GET",
      path: `/v1/public/${world.schoolA.publicId}/products/${productId}`,
      headers: {},
    });
    expect(anonymous.status).toBe(200);
    expect(JSON.stringify(anonymous.body)).not.toContain('"correct"');
    contract.getPublicProduct.responses[200].parse(anonymous.body);

    const grant = await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${productId}/preview`,
      headers: adminHeaders,
      body: { ttlSeconds: 300 },
    });
    expect(grant.status).toBe(201);
    const preview = await dispatch(runtime, {
      method: "GET",
      path: `/v1/preview/products/${productId}`,
      headers: { "x-preview-token": (grant.body as { token: string }).token },
    });
    expect(preview.status).toBe(200);
    const previewLesson = (
      preview.body as { lessons: Array<{ id: string; content: unknown }> }
    ).lessons.find((item) => item.id === lessonId)!;
    expect(previewLesson.content).toEqual(learnerLesson.content);
    expect(JSON.stringify(preview.body)).not.toContain('"correct"');
    contract.readPreviewProduct.responses[200].parse(preview.body);
    await runtime.close();
  });

  it("makes the learner contract refuse content that carries answers", () => {
    const lesson = {
      id: "lsn_1",
      title: "Quiz",
      type: "quiz",
      mediaId: null,
      sectionId: null,
      position: 1,
      status: "published",
      downloadable: false,
      requiresEnrollment: true,
      dripDelaySeconds: null,
      dripAt: null,
      availableAt: null,
      publishedAt: null,
    } as const;
    const product = contract.getPublicProduct.responses[200];
    const base = {
      id: "prd_1",
      schoolId: "sch_1",
      kind: "course",
      status: "published",
      slug: "quiz",
      title: "Quiz",
      description: "",
      featuredImage: null,
      privacy: "public",
      leadMagnet: false,
      certificate: false,
      discussions: false,
      newLessonStatus: "draft",
      includedWithCommunity: false,
      discussionSpaceId: null,
      publishedAt: null,
      createdAt: "2026-03-01T00:00:00.000Z",
      updatedAt: "2026-03-01T00:00:00.000Z",
      enrolled: true,
      sections: [],
    };
    expect(
      product.safeParse({ ...base, lessons: [{ ...lesson, content: quizContent() }] })
        .success,
    ).toBe(false);
    expect(
      product.safeParse({
        ...base,
        lessons: [{ ...lesson, type: "text", content: { nested: [{ correct: true }] } }],
      }).success,
    ).toBe(false);
    expect(
      product.safeParse({
        ...base,
        lessons: [{ ...lesson, type: "text", content: { type: "doc", content: [] } }],
      }).success,
    ).toBe(true);
  });
});
