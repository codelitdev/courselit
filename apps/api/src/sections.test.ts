import { describe, expect, it } from "bun:test";
import { dispatch } from "./dispatch.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { seedWorld } from "./seed.js";
import { textDoc } from "./test-content.js";

describe.serial("product sections", () => {
  it("creates the first authoring section when a product is created", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    const headers = {
      cookie: world.owner.sessionCookie,
      "x-school-id": world.schoolA.publicId,
    };

    for (const [kind, title] of [
      ["course", "New course"],
      ["download", "New download"],
    ] as const) {
      const created = await dispatch(runtime, {
        method: "POST",
        path: "/v1/products",
        headers,
        body: { kind, title, description: "" },
      });
      expect(created.status).toBe(201);
      const productId = (created.body as { id: string }).id;
      const detail = await dispatch(runtime, {
        method: "GET",
        path: `/v1/products/${productId}`,
        headers,
      });
      expect(detail.status).toBe(200);
      expect(detail.body).toMatchObject({
        id: productId,
        kind,
        sections: [{ title: "First section", position: 1 }],
        lessons: [],
      });
    }

    await runtime.close();
  });

  it("creates, assigns, updates, and reorders sections without changing tenant scope", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    const ownerHeaders = {
      cookie: world.owner.sessionCookie,
      "x-school-id": world.schoolA.publicId,
    };

    const first = await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${world.noteA.publicId}/sections`,
      headers: ownerHeaders,
      body: { title: "Foundations" },
    });
    const second = await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${world.noteA.publicId}/sections`,
      headers: ownerHeaders,
      body: { title: "Advanced" },
    });
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    const firstId = (first.body as { id: string }).id;
    const secondId = (second.body as { id: string }).id;

    const scheduled = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/sections/${firstId}`,
      headers: ownerHeaders,
      body: {
        dripEnabled: true,
        dripType: "relative-date",
        dripDelaySeconds: 172_800,
      },
    });
    expect(scheduled.status).toBe(200);
    expect(scheduled.body).toMatchObject({
      id: firstId,
      dripEnabled: true,
      dripType: "relative-date",
      dripDelaySeconds: 172_800,
      dripAt: null,
    });

    const invalidDrip = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/sections/${secondId}`,
      headers: ownerHeaders,
      body: { dripEnabled: true, dripType: "exact-date" },
    });
    expect(invalidDrip.status).toBe(400);

    const lesson = await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${world.noteA.publicId}/lessons`,
      headers: ownerHeaders,
      body: {
        title: "Introduction",
        content: textDoc("Start here"),
        sectionId: firstId,
        downloadable: true,
      },
    });
    expect(lesson.status).toBe(201);
    expect(lesson.body).toMatchObject({
      type: "text",
      content: textDoc("Start here"),
      sectionId: firstId,
      position: 1,
      downloadable: true,
    });

    const madeNonDownloadable = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/lessons/${(lesson.body as { id: string }).id}`,
      headers: ownerHeaders,
      body: { downloadable: false },
    });
    expect(madeNonDownloadable.status).toBe(200);
    expect(madeNonDownloadable.body).toMatchObject({ downloadable: false });

    const invalidSection = await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${world.noteA.publicId}/lessons`,
      headers: ownerHeaders,
      body: { title: "Broken", sectionId: secondId.slice(0, 4) },
    });
    expect(invalidSection.status).toBe(404);

    const reordered = await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${world.noteA.publicId}/sections/reorder`,
      headers: ownerHeaders,
      body: { sectionIds: [secondId, firstId] },
    });
    expect(reordered.status).toBe(200);
    expect(reordered.body).toMatchObject({
      items: [
        { id: secondId, position: 1 },
        { id: firstId, position: 2 },
      ],
    });

    const renamed = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/sections/${secondId}`,
      headers: ownerHeaders,
      body: { title: "Advanced topics" },
    });
    expect(renamed.status).toBe(200);
    expect(renamed.body).toMatchObject({ id: secondId, title: "Advanced topics" });

    const detail = await dispatch(runtime, {
      method: "GET",
      path: `/v1/products/${world.noteA.publicId}`,
      headers: ownerHeaders,
    });
    expect(detail.status).toBe(200);
    expect(detail.body).toMatchObject({
      sections: [
        {
          id: secondId,
          position: 1,
          title: "Advanced topics",
          dripEnabled: false,
          dripType: null,
          dripDelaySeconds: null,
          dripAt: null,
        },
        {
          id: firstId,
          position: 2,
          title: "Foundations",
          dripEnabled: true,
          dripType: "relative-date",
          dripDelaySeconds: 172_800,
          dripAt: null,
        },
      ],
      lessons: [{ sectionId: firstId }],
    });

    const incompleteOrder = await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${world.noteA.publicId}/sections/reorder`,
      headers: ownerHeaders,
      body: { sectionIds: [firstId] },
    });
    expect(incompleteOrder.status).toBe(400);

    const lesson2 = await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${world.noteA.publicId}/lessons`,
      headers: ownerHeaders,
      body: {
        title: "Second lesson",
        content: textDoc("Second step"),
        sectionId: firstId,
      },
    });
    expect(lesson2.status).toBe(201);
    const lesson1Id = (lesson.body as { id: string }).id;
    const lesson2Id = (lesson2.body as { id: string }).id;

    const reorderedLessons = await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${world.noteA.publicId}/lessons/reorder`,
      headers: ownerHeaders,
      body: { lessonIds: [lesson2Id, lesson1Id] },
    });
    expect(reorderedLessons.status).toBe(200);
    expect(reorderedLessons.body).toMatchObject({
      items: [
        { id: lesson2Id, position: 1 },
        { id: lesson1Id, position: 2 },
      ],
    });

    const movedLesson = await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${world.noteA.publicId}/lessons/reorder`,
      headers: ownerHeaders,
      body: {
        lessonIds: [lesson1Id, lesson2Id],
        sectionAssignments: [{ lessonId: lesson2Id, sectionId: secondId }],
      },
    });
    expect(movedLesson.status).toBe(200);
    expect(movedLesson.body).toMatchObject({
      items: [
        { id: lesson1Id, position: 1, sectionId: firstId },
        { id: lesson2Id, position: 2, sectionId: secondId },
      ],
    });

    const incompleteLessons = await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${world.noteA.publicId}/lessons/reorder`,
      headers: ownerHeaders,
      body: { lessonIds: [lesson1Id] },
    });
    expect(incompleteLessons.status).toBe(400);

    await runtime.close();
  });

  it("does not expose or mutate another school's sections", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    const created = await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${world.noteA.publicId}/sections`,
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
      body: { title: "Private section" },
    });
    const sectionId = (created.body as { id: string }).id;
    const wrongSchool = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/sections/${sectionId}`,
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolB.publicId,
      },
      body: { title: "Hijacked" },
    });
    expect(wrongSchool.status).toBe(404);
    const hidden = await dispatch(runtime, {
      method: "GET",
      path: `/v1/products/${world.noteA.publicId}/sections`,
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolB.publicId,
      },
    });
    expect(hidden.status).toBe(404);
    await runtime.close();
  });

  it("deletes only empty sections and keeps the download section invariant", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    const ownerHeaders = {
      cookie: world.owner.sessionCookie,
      "x-school-id": world.schoolA.publicId,
    };

    const first = await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${world.noteA.publicId}/sections`,
      headers: ownerHeaders,
      body: { title: "Empty section" },
    });
    const firstId = (first.body as { id: string }).id;
    const lesson = await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${world.noteA.publicId}/lessons`,
      headers: ownerHeaders,
      body: { title: "Keep me", content: textDoc("Content"), sectionId: firstId },
    });
    expect(lesson.status).toBe(201);

    const nonEmpty = await dispatch(runtime, {
      method: "DELETE",
      path: `/v1/sections/${firstId}`,
      headers: ownerHeaders,
    });
    expect(nonEmpty.status).toBe(400);
    expect((nonEmpty.body as { details?: { reason?: string } }).details?.reason).toBe(
      "section_not_empty",
    );

    const second = await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${world.noteA.publicId}/sections`,
      headers: ownerHeaders,
      body: { title: "Delete me" },
    });
    const secondId = (second.body as { id: string }).id;
    const deleted = await dispatch(runtime, {
      method: "DELETE",
      path: `/v1/sections/${secondId}`,
      headers: ownerHeaders,
    });
    expect(deleted.status).toBe(200);

    const downloadProduct = await dispatch(runtime, {
      method: "POST",
      path: "/v1/products",
      headers: ownerHeaders,
      body: { kind: "download", title: "Download product", description: "" },
    });
    expect(downloadProduct.status).toBe(201);
    const downloadProductId = (downloadProduct.body as { id: string }).id;
    const downloadDetail = await dispatch(runtime, {
      method: "GET",
      path: `/v1/products/${downloadProductId}`,
      headers: ownerHeaders,
    });
    const downloadSectionId = (
      downloadDetail.body as { sections: Array<{ id: string }> }
    ).sections[0]!.id;
    const download = await dispatch(runtime, {
      method: "DELETE",
      path: `/v1/sections/${downloadSectionId}`,
      headers: ownerHeaders,
    });
    expect(download.status).toBe(400);
    expect((download.body as { details?: { reason?: string } }).details?.reason).toBe(
      "download_last_section",
    );
    await runtime.close();
  });

  it("rejects invalid embed and quiz lesson content at the API boundary", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    const ownerHeaders = {
      cookie: world.owner.sessionCookie,
      "x-school-id": world.schoolA.publicId,
    };

    const invalidEmbed = await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${world.noteA.publicId}/lessons`,
      headers: ownerHeaders,
      body: { title: "Missing embed", type: "embed", content: {} },
    });
    expect(invalidEmbed.status).toBe(400);

    const invalidQuiz = await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${world.noteA.publicId}/lessons`,
      headers: ownerHeaders,
      body: {
        title: "Incomplete quiz",
        type: "quiz",
        content: {
          questions: [
            {
              text: "Which answer is correct?",
              options: [{ text: "Only option", correctAnswer: true }],
            },
          ],
        },
      },
    });
    expect(invalidQuiz.status).toBe(400);

    const previewQuiz = await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${world.noteA.publicId}/lessons`,
      headers: ownerHeaders,
      body: {
        title: "Preview quiz",
        type: "quiz",
        requiresEnrollment: false,
        content: {
          questions: [
            {
              text: "Which answer is correct?",
              options: [
                { text: "Correct", correctAnswer: true },
                { text: "Incorrect", correctAnswer: false },
              ],
            },
          ],
        },
      },
    });
    expect(previewQuiz.status).toBe(400);

    await runtime.close();
  });
});
