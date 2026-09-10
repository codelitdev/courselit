import { describe, expect, it } from "bun:test";
import { lessonUnlockAt } from "./catalog.js";
import { dispatch } from "./dispatch.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { seedWorld } from "./seed.js";
import { textDoc } from "./test-content.js";

describe.serial("lesson drip access", () => {
  it("uses the later of relative and fixed unlock times", () => {
    const enrollmentStartedAt = new Date("2026-03-01T00:00:00.000Z");
    expect(
      lessonUnlockAt(
        { dripDelaySeconds: 86_400, dripAt: new Date("2026-03-01T12:00:00.000Z") },
        enrollmentStartedAt,
      ),
    ).toEqual(new Date("2026-03-02T00:00:00.000Z"));
    expect(
      lessonUnlockAt(
        { dripDelaySeconds: 86_400, dripAt: new Date("2026-03-03T00:00:00.000Z") },
        enrollmentStartedAt,
      ),
    ).toEqual(new Date("2026-03-03T00:00:00.000Z"));
  });

  it("hides locked section content and rejects completion until the fixed date", async () => {
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
      body: { kind: "course", title: "Dripped course", description: "Timed access" },
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
    const productDetail = await dispatch(runtime, {
      method: "GET",
      path: `/v1/products/${productId}`,
      headers: adminHeaders,
    });
    const sectionId = (productDetail.body as { sections: Array<{ id: string }> })
      .sections[0]!.id;
    const scheduledSection = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/sections/${sectionId}`,
      headers: adminHeaders,
      body: {
        dripEnabled: true,
        dripType: "exact-date",
        dripDelaySeconds: null,
        dripAt: "2026-03-03T00:00:00.000Z",
      },
    });
    expect(scheduledSection.status).toBe(200);
    const lesson = await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${productId}/lessons`,
      headers: adminHeaders,
      body: {
        title: "Locked lesson",
        content: textDoc("Available later"),
        sectionId,
      },
    });
    expect(lesson.status).toBe(201);
    const lessonId = (lesson.body as { id: string }).id;
    await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/lessons/${lessonId}`,
      headers: adminHeaders,
      body: { status: "published" },
    });
    const immediateLesson = await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${productId}/lessons`,
      headers: adminHeaders,
      body: { title: "Available lesson", content: textDoc("Start now") },
    });
    expect(immediateLesson.status).toBe(201);
    const immediateLessonId = (immediateLesson.body as { id: string }).id;
    await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/lessons/${immediateLessonId}`,
      headers: adminHeaders,
      body: { status: "published" },
    });

    const signedUp = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/auth/sign-up",
      headers: { "x-school-id": world.schoolA.publicId },
      body: {
        schoolId: world.schoolA.publicId,
        email: "drip-learner@example.com",
        password: "learner-password-1",
        name: "Drip Learner",
      },
    });
    expect(signedUp.status).toBe(201);
    const learnerCookie = signedUp.headers?.["Set-Cookie"];
    expect(learnerCookie).toBeString();
    const learnerHeaders = {
      cookie: learnerCookie as string,
      "x-school-id": world.schoolA.publicId,
    };

    const enrollment = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/memberships",
      headers: learnerHeaders,
      body: { productId },
    });
    expect(enrollment.status).toBe(201);

    const locked = await dispatch(runtime, {
      method: "GET",
      path: `/v1/products/${productId}`,
      headers: learnerHeaders,
    });
    expect(locked.status).toBe(200);
    const lockedLessons = (locked.body as { lessons: Array<Record<string, unknown>> })
      .lessons;
    expect(lockedLessons.find((item) => item.id === lessonId)).toMatchObject({
      content: null,
      availableAt: "2026-03-03T00:00:00.000Z",
    });
    expect(lockedLessons.find((item) => item.id === immediateLessonId)).toMatchObject({
      content: textDoc("Start now"),
      availableAt: null,
    });

    const progress = await dispatch(runtime, {
      method: "GET",
      path: `/v1/learner/progress?productId=${encodeURIComponent(productId)}`,
      headers: learnerHeaders,
    });
    expect(progress.status).toBe(200);
    expect(progress.body).toEqual({ items: [] });

    const completion = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/lessons/${lessonId}/complete`,
      headers: learnerHeaders,
      body: {},
    });
    expect(completion.status).toBe(403);
    expect(completion.body).toMatchObject({
      code: "forbidden",
      details: {
        reason: "lesson_locked",
        availableAt: "2026-03-03T00:00:00.000Z",
      },
    });

    const previewGrant = await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${productId}/preview`,
      headers: adminHeaders,
      body: {},
    });
    expect(previewGrant.status).toBe(201);
    const preview = await dispatch(runtime, {
      method: "GET",
      path: `/v1/preview/products/${productId}`,
      headers: {
        "x-preview-token": (previewGrant.body as { token: string }).token,
      },
    });
    expect(preview.status).toBe(200);
    const previewLessons = (preview.body as { lessons: Array<Record<string, unknown>> })
      .lessons;
    expect(previewLessons.find((item) => item.id === lessonId)).toMatchObject({
      content: textDoc("Available later"),
    });
    await runtime.close();
  });
});
