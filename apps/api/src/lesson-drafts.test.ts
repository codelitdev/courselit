import { describe, expect, it } from "bun:test";
import { contract } from "@courselit/api-contract";
import {
  lessonHasUnpublishedChanges,
  lessonWorkingContent,
  preparePublishedLessonContent,
} from "./catalog.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { seedWorld } from "./seed.js";
import { dispatch } from "./test-learner-auth.js";

type Lesson = {
  id: string;
  status: "draft" | "published";
  content: Record<string, unknown>;
  markdown: string | null;
  contentVersion: number;
  hasUnpublishedChanges: boolean;
  contentPublishedAt: string | null;
};

const textDoc = (text: string) => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text }] }],
});
const halfQuiz = {
  type: "doc",
  content: [{ type: "quiz", attrs: { questions: [{ text: "Q", options: [] }] } }],
};

async function setup() {
  const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
  const runtime = await createPgliteRuntime({ clock });
  const world = await seedWorld(runtime, clock);
  const headers = {
    cookie: world.owner.sessionCookie,
    "x-school-id": world.schoolA.publicId,
  };
  const productId = world.noteA.publicId;
  const call = (method: string, path: string, body?: unknown) =>
    dispatch(runtime, { method, path, headers, body });
  await call("POST", `/v1/products/${productId}/plans`, {
    name: "Free access",
    kind: "free",
    amountMinor: 0,
  });
  expect(
    (await call("PATCH", `/v1/products/${productId}`, { status: "published" })).status,
  ).toBe(200);
  const create = async (body: Record<string, unknown>) => {
    const created = await call("POST", `/v1/products/${productId}/lessons`, {
      requiresEnrollment: false,
      ...body,
    });
    expect(created.status).toBe(201);
    return created.body as Lesson;
  };
  const update = (lessonId: string, body: Record<string, unknown>) =>
    call("PATCH", `/v1/lessons/${lessonId}`, body);
  const publish = (lessonId: string, body: Record<string, unknown> = {}) =>
    call("POST", `/v1/lessons/${lessonId}/publish-content`, body);
  const discard = (lessonId: string, body: Record<string, unknown> = {}) =>
    call("POST", `/v1/lessons/${lessonId}/discard-draft`, body);
  const read = async (lessonId: string) =>
    (await call("GET", `/v1/lessons/${lessonId}`)).body as Lesson;
  /** What the public (and so every learner) reads of the lesson. */
  const learnerContent = async (lessonId: string) => {
    const product = await dispatch(runtime, {
      method: "GET",
      path: `/v1/public/${world.schoolA.publicId}/products/${productId}`,
      headers: {},
    });
    expect(product.status).toBe(200);
    contract.getPublicProduct.responses[200].parse(product.body);
    return (
      product.body as { lessons: Array<{ id: string; content: unknown }> }
    ).lessons.find((lesson) => lesson.id === lessonId)?.content;
  };
  const previewContent = async (lessonId: string) => {
    const grant = await call("POST", `/v1/products/${productId}/preview`, {
      ttlSeconds: 300,
    });
    const product = await dispatch(runtime, {
      method: "GET",
      path: `/v1/preview/products/${productId}`,
      headers: { "x-preview-token": (grant.body as { token: string }).token },
    });
    expect(product.status).toBe(200);
    return (
      product.body as { lessons: Array<{ id: string; content: unknown }> }
    ).lessons.find((lesson) => lesson.id === lessonId)?.content;
  };
  return {
    clock,
    runtime,
    create,
    update,
    publish,
    discard,
    read,
    learnerContent,
    previewContent,
  };
}

describe.serial("lesson content drafts", () => {
  it("saves page writes as a draft that learners don't see until it is published", async () => {
    const t = await setup();
    try {
      const lesson = await t.create({
        title: "Live",
        content: textDoc("one"),
        status: "published",
      });
      expect(lesson).toMatchObject({
        hasUnpublishedChanges: false,
        contentPublishedAt: "2026-03-01T00:00:00.000Z",
      });

      const saved = await t.update(lesson.id, {
        content: textDoc("half-written"),
        expectedContentVersion: 1,
      });
      expect(saved).toMatchObject({
        status: 200,
        body: {
          content: textDoc("half-written"),
          contentVersion: 2,
          hasUnpublishedChanges: true,
        },
      });
      contract.updateLesson.responses[200].parse(saved.body);
      // Authors read their draft; learners still read the published page;
      // previews show the draft.
      expect(await t.read(lesson.id)).toMatchObject({
        content: textDoc("half-written"),
        markdown: "half-written\n",
        hasUnpublishedChanges: true,
      });
      expect(await t.learnerContent(lesson.id)).toEqual(textDoc("one"));
      expect(await t.previewContent(lesson.id)).toEqual(textDoc("half-written"));

      const published = await t.publish(lesson.id, { expectedContentVersion: 2 });
      expect(published).toMatchObject({
        status: 200,
        // The content authors edit is unchanged, so the version stays.
        body: {
          content: textDoc("half-written"),
          contentVersion: 2,
          hasUnpublishedChanges: false,
        },
      });
      contract.publishLessonContent.responses[200].parse(published.body);
      expect(await t.learnerContent(lesson.id)).toEqual(textDoc("half-written"));

      // Saving the published content again leaves nothing pending.
      const same = await t.update(lesson.id, {
        content: textDoc("half-written"),
        expectedContentVersion: 2,
      });
      expect(same).toMatchObject({
        status: 200,
        body: { hasUnpublishedChanges: false, contentVersion: 2 },
      });
      // Publishing with nothing pending changes nothing.
      expect(await t.publish(lesson.id)).toMatchObject({
        status: 200,
        body: { contentVersion: 2, hasUnpublishedChanges: false },
      });
    } finally {
      await t.runtime.close();
    }
  });

  it("discards a draft back to the published content and bumps the version", async () => {
    const t = await setup();
    try {
      const lesson = await t.create({
        title: "Live",
        content: textDoc("one"),
        status: "published",
      });
      await t.update(lesson.id, { content: textDoc("two"), expectedContentVersion: 1 });
      const discarded = await t.discard(lesson.id, { expectedContentVersion: 2 });
      expect(discarded).toMatchObject({
        status: 200,
        body: {
          content: textDoc("one"),
          contentVersion: 3,
          hasUnpublishedChanges: false,
        },
      });
      contract.discardLessonDraft.responses[200].parse(discarded.body);
      expect(await t.read(lesson.id)).toMatchObject({
        content: textDoc("one"),
        contentVersion: 3,
      });
      expect(await t.learnerContent(lesson.id)).toEqual(textDoc("one"));
      // Nothing to discard: unchanged.
      expect(await t.discard(lesson.id)).toMatchObject({
        status: 200,
        body: { contentVersion: 3 },
      });
    } finally {
      await t.runtime.close();
    }
  });

  it("refuses stale versions on draft writes, publish and discard", async () => {
    const t = await setup();
    try {
      const lesson = await t.create({
        title: "Live",
        content: textDoc("one"),
        status: "published",
      });
      await t.update(lesson.id, {
        content: textDoc("agent"),
        expectedContentVersion: 1,
      });
      const stale = {
        status: 409,
        body: { details: { reason: "content_version_mismatch", contentVersion: 2 } },
      };
      expect(
        await t.update(lesson.id, {
          content: textDoc("person"),
          expectedContentVersion: 1,
        }),
      ).toMatchObject(stale);
      expect(await t.publish(lesson.id, { expectedContentVersion: 1 })).toMatchObject(
        stale,
      );
      expect(await t.discard(lesson.id, { expectedContentVersion: 1 })).toMatchObject(
        stale,
      );
      expect(await t.read(lesson.id)).toMatchObject({
        content: textDoc("agent"),
        contentVersion: 2,
      });
      expect(await t.learnerContent(lesson.id)).toEqual(textDoc("one"));
    } finally {
      await t.runtime.close();
    }
  });

  it("saves an incomplete quiz as a draft but refuses to publish it", async () => {
    const t = await setup();
    try {
      const lesson = await t.create({
        title: "Live",
        content: textDoc("one"),
        status: "published",
        requiresEnrollment: true,
      });
      const saved = await t.update(lesson.id, {
        content: halfQuiz,
        expectedContentVersion: 1,
      });
      expect(saved).toMatchObject({
        status: 200,
        body: { hasUnpublishedChanges: true },
      });
      expect(await t.publish(lesson.id)).toMatchObject({
        status: 400,
        body: {
          details: { reason: "lesson_content_invalid", code: "incomplete_block" },
        },
      });
      expect(await t.read(lesson.id)).toMatchObject({ hasUnpublishedChanges: true });
    } finally {
      await t.runtime.close();
    }
  });

  it("publishes the draft when the lesson goes live, and keeps it when it goes offline", async () => {
    const t = await setup();
    try {
      const lesson = await t.create({
        title: "New",
        status: "draft",
        requiresEnrollment: true,
      });
      expect(lesson.content).toEqual({ type: "doc", content: [] });
      await t.update(lesson.id, { content: halfQuiz, expectedContentVersion: 1 });
      // Going live publishes the draft, so an incomplete one can't go live.
      expect(await t.update(lesson.id, { status: "published" })).toMatchObject({
        status: 400,
        body: {
          details: { reason: "lesson_content_invalid", code: "incomplete_block" },
        },
      });
      await t.update(lesson.id, {
        content: textDoc("ready"),
        expectedContentVersion: 2,
      });
      // (Free to read, so the public read below shows its content.)
      const live = await t.update(lesson.id, {
        status: "published",
        requiresEnrollment: false,
      });
      expect(live).toMatchObject({
        status: 200,
        body: { status: "published", hasUnpublishedChanges: false, contentVersion: 3 },
      });
      expect(await t.learnerContent(lesson.id)).toEqual(textDoc("ready"));

      // Taking it offline leaves a pending draft alone.
      await t.update(lesson.id, {
        content: textDoc("next"),
        expectedContentVersion: 3,
      });
      const offline = await t.update(lesson.id, { status: "draft" });
      expect(offline).toMatchObject({
        status: 200,
        body: {
          status: "draft",
          content: textDoc("next"),
          hasUnpublishedChanges: true,
        },
      });
      // Content and going live in one write publish that content.
      const both = await t.update(lesson.id, {
        content: textDoc("final"),
        expectedContentVersion: 4,
        status: "published",
      });
      expect(both).toMatchObject({
        status: 200,
        body: { hasUnpublishedChanges: false },
      });
      expect(await t.learnerContent(lesson.id)).toEqual(textDoc("final"));
    } finally {
      await t.runtime.close();
    }
  });

  it("refuses a quiz in a free preview, in the draft or the published content", async () => {
    const t = await setup();
    try {
      const quizPage = {
        type: "doc",
        content: [
          {
            type: "quiz",
            attrs: {
              questions: [
                { text: "Q", options: [{ text: "A", correct: true }, { text: "B" }] },
              ],
            },
          },
        ],
      };
      const lesson = await t.create({
        title: "Quiz",
        content: quizPage,
        status: "published",
        requiresEnrollment: true,
      });
      await t.update(lesson.id, {
        content: textDoc("no quiz"),
        expectedContentVersion: 1,
      });
      // The draft has no quiz, but learners would still get the published one.
      expect(await t.update(lesson.id, { requiresEnrollment: false })).toMatchObject({
        status: 400,
        body: { details: { reason: "quiz_cannot_be_previewed" } },
      });
    } finally {
      await t.runtime.close();
    }
  });
});

describe("lesson draft helpers", () => {
  it("derives unpublished changes and the content authors edit", () => {
    const published = textDoc("one");
    expect(
      lessonHasUnpublishedChanges({ content: published, draftContent: null }),
    ).toBe(false);
    expect(
      lessonHasUnpublishedChanges({
        content: published,
        draftContent: { content: published.content, type: "doc" },
      }),
    ).toBe(false);
    expect(
      lessonHasUnpublishedChanges({ content: published, draftContent: textDoc("two") }),
    ).toBe(true);
    expect(lessonWorkingContent({ content: published, draftContent: null })).toBe(
      published,
    );
    expect(
      lessonWorkingContent({ content: published, draftContent: textDoc("two") }),
    ).toEqual(textDoc("two"));
  });

  it("checks a draft with the publish rules", () => {
    const reason = (result: ReturnType<typeof preparePublishedLessonContent>) =>
      result.ok ? null : result.error.safeDetails?.reason;
    const base = { published: textDoc("one"), requiresEnrollment: true };
    expect(preparePublishedLessonContent({ ...base, draft: textDoc("two") })).toEqual({
      ok: true,
      content: textDoc("two"),
    });
    expect(reason(preparePublishedLessonContent({ ...base, draft: halfQuiz }))).toBe(
      "lesson_content_invalid",
    );
    const embed = { type: "embed", attrs: { code: "<b>x</b>" } };
    const withEmbed = { type: "doc", content: [embed] };
    // A block the plan lost may stay if it is already published, not be added.
    const added = preparePublishedLessonContent({
      ...base,
      draft: withEmbed,
      unavailable: { embed: "trial" },
    });
    expect(added.ok ? null : added.error).toMatchObject({
      code: "forbidden",
      safeDetails: { reason: "plan_required" },
    });
    expect(
      preparePublishedLessonContent({
        ...base,
        published: withEmbed,
        draft: { type: "doc", content: [embed, ...textDoc("more").content] },
        unavailable: { embed: "trial" },
      }).ok,
    ).toBe(true);
  });
});
