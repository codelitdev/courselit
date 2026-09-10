import { describe, expect, it } from "bun:test";
import { and, eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { dispatch } from "./dispatch.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { seedWorld } from "./seed.js";

function quizContent() {
  return {
    questions: [
      {
        text: "One correct answer",
        options: [
          { text: "Correct", correctAnswer: true },
          { text: "Wrong", correctAnswer: false },
        ],
      },
      {
        text: "Two correct answers",
        options: [
          { text: "Correct one", correctAnswer: true },
          { text: "Correct two", correctAnswer: true },
          { text: "Wrong", correctAnswer: false },
        ],
      },
    ],
    requiresPassingGrade: true,
    passingGrade: 70,
  };
}

describe.serial("quiz evaluation", () => {
  it("redacts answers for learners and preserves production scoring per attempt", async () => {
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
      body: { title: "Knowledge check", type: "quiz", content: quizContent() },
    });
    expect(lesson.status).toBe(201);
    const lessonId = (lesson.body as { id: string }).id;
    await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/lessons/${lessonId}`,
      headers: adminHeaders,
      body: { status: "published" },
    });

    const signedUp = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/auth/sign-up",
      headers: { "x-school-id": world.schoolA.publicId },
      body: {
        email: "quiz-learner@example.com",
        password: "learner-password-1",
        name: "Quiz Learner",
      },
    });
    expect(signedUp.status).toBe(201);
    const learnerCookie = signedUp.headers?.["Set-Cookie"];
    expect(learnerCookie).toBeString();
    const learnerHeaders = {
      cookie: learnerCookie as string,
      "x-school-id": world.schoolA.publicId,
    };

    const beforeEnrollment = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/products/${productId}/lessons/${lessonId}/evaluation`,
      headers: learnerHeaders,
      body: { answers: [[0], [0, 1]] },
    });
    expect(beforeEnrollment.status).toBe(403);

    const enrollment = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/memberships",
      headers: learnerHeaders,
      body: { productId },
    });
    expect(enrollment.status).toBe(201);

    const productDetail = await dispatch(runtime, {
      method: "GET",
      path: `/v1/products/${productId}`,
      headers: learnerHeaders,
    });
    expect(productDetail.status).toBe(200);
    const learnerLesson = (
      productDetail.body as {
        lessons: Array<{ id: string; content: Record<string, unknown> }>;
      }
    ).lessons.find((item) => item.id === lessonId)!;
    expect(learnerLesson.content).toMatchObject({
      questions: [
        {
          type: "single",
          options: [{ text: "Correct" }, { text: "Wrong" }],
        },
        { type: "multiple" },
      ],
    });
    expect(JSON.stringify(learnerLesson.content)).not.toContain("correctAnswer");

    const partial = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/products/${productId}/lessons/${lessonId}/evaluation`,
      headers: learnerHeaders,
      body: { answers: [[0], []] },
    });
    expect(partial).toMatchObject({
      status: 200,
      body: {
        pass: false,
        score: (1 / 3) * 100,
        requiresPassingGrade: true,
        passingGrade: 70,
      },
    });

    const completionBeforePass = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/lessons/${lessonId}/complete`,
      headers: learnerHeaders,
      body: {},
    });
    expect(completionBeforePass).toMatchObject({
      status: 400,
      body: { details: { reason: "need_to_pass" } },
    });

    const fullWithWrongOption = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/products/${productId}/lessons/${lessonId}/evaluation`,
      headers: learnerHeaders,
      body: {
        answers: [
          [0, 1],
          [0, 1, 2],
        ],
      },
    });
    expect(fullWithWrongOption).toMatchObject({
      status: 200,
      body: { pass: true, score: 100 },
    });

    const completed = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/lessons/${lessonId}/complete`,
      headers: learnerHeaders,
      body: {},
    });
    expect(completed.status).toBe(200);

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
    expect(evaluations[0]?.score).toBeCloseTo((1 / 3) * 100, 4);
    expect(evaluations[1]?.score).toBe(100);
    await runtime.close();
  });
});
