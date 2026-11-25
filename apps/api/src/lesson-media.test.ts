import { describe, expect, it } from "bun:test";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { seedWorld } from "./seed.js";
import { dispatch } from "./test-learner-auth.js";

function cookieFrom(headers?: Record<string, string>) {
  const header = headers?.["Set-Cookie"];
  if (!header) throw new Error("missing_set_cookie");
  return header.split(";", 1)[0]!;
}

function imageDoc(mediaId: string | null) {
  return {
    type: "doc",
    content: [
      { type: "paragraph", content: [{ type: "text", text: "Look" }] },
      ...(mediaId
        ? [{ type: "image", attrs: { media: mediaId, alt: "Diagram" } }]
        : []),
    ],
  };
}

function videoDoc(mediaId: string) {
  return { type: "doc", content: [{ type: "video", attrs: { media: mediaId } }] };
}

describe.serial("per-media lesson reads (L5)", () => {
  it("serves only media the lesson references, under the lesson's access rules", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    const headers = {
      cookie: world.owner.sessionCookie,
      "x-school-id": world.schoolA.publicId,
    };
    const productId = world.noteA.publicId;

    const upload = async (
      fileName: string,
      mimeType: string,
      purpose: string,
      accessPolicy: "public" | "private",
    ) => {
      const authorization = await dispatch(runtime, {
        method: "POST",
        path: "/v1/media/upload-authorizations",
        headers,
        body: { fileName, mimeType, byteSize: 2048, purpose, accessPolicy },
      });
      expect(authorization.status).toBe(201);
      const finalized = await dispatch(runtime, {
        method: "POST",
        path: "/v1/media",
        headers,
        body: {
          uploadId: (authorization.body as { uploadId: string }).uploadId,
          accessPolicy,
        },
      });
      expect(finalized.status).toBe(201);
      return finalized.body as { id: string; canonicalUrl: string };
    };
    const video = await upload("lesson.mp4", "video/mp4", "lesson_media", "private");
    const image = await upload("diagram.png", "image/png", "product_artwork", "public");
    const unused = await upload("other.png", "image/png", "product_artwork", "public");

    await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${productId}/plans`,
      headers,
      body: { name: "Free access", kind: "free", amountMinor: 0 },
    });
    await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/products/${productId}`,
      headers,
      body: { status: "published" },
    });
    const createLesson = async (body: Record<string, unknown>) => {
      const created = await dispatch(runtime, {
        method: "POST",
        path: `/v1/products/${productId}/lessons`,
        headers,
        body,
      });
      expect(created.status).toBe(201);
      return created.body as { id: string; contentVersion: number };
    };
    const videoLesson = await createLesson({
      title: "Enrolled video",
      content: videoDoc(video.id),
      status: "published",
    });
    const freeLesson = await createLesson({
      title: "Free reading",
      content: imageDoc(image.id),
      requiresEnrollment: false,
      status: "published",
    });
    const draftLesson = await createLesson({
      title: "Draft reading",
      content: imageDoc(image.id),
      requiresEnrollment: false,
      status: "draft",
    });

    const publicPath = (lessonId: string, mediaId: string) =>
      `/v1/public/${world.schoolA.publicId}/products/${productId}/lessons/${lessonId}/media/${mediaId}`;
    const read = (lessonId: string, mediaId: string, cookie?: string) =>
      dispatch(runtime, {
        method: "GET",
        path: publicPath(lessonId, mediaId),
        headers: cookie ? { cookie } : {},
      });

    // A free lesson's content image is public; nothing else is.
    expect(await read(freeLesson.id, image.id)).toMatchObject({
      status: 200,
      body: { id: image.id, fileName: "diagram.png" },
    });
    expect((await read(freeLesson.id, unused.id)).status).toBe(404);
    expect((await read(freeLesson.id, video.id)).status).toBe(404);
    // Unpublished lessons are not readable at all.
    expect((await read(draftLesson.id, image.id)).status).toBe(404);
    // The enrolled lesson's own media needs enrollment.
    expect((await read(videoLesson.id, video.id)).status).toBe(403);

    const signedUp = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/auth/sign-up",
      headers: {},
      body: {
        schoolId: world.schoolA.publicId,
        email: "media-item-learner@example.com",
        password: "learner-password-1",
        name: "Media Learner",
      },
    });
    const learnerCookie = cookieFrom(signedUp.headers);
    expect((await read(videoLesson.id, video.id, learnerCookie)).status).toBe(403);
    const enrolled = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/memberships",
      headers: { cookie: learnerCookie, "x-school-id": world.schoolA.publicId },
      body: { productId },
    });
    expect(enrolled.status).toBe(201);
    expect(await read(videoLesson.id, video.id, learnerCookie)).toMatchObject({
      status: 200,
      body: { id: video.id, mimeType: "video/mp4" },
    });
    // Enrollment doesn't widen what a lesson can serve.
    expect((await read(videoLesson.id, image.id, learnerCookie)).status).toBe(404);
    // The lesson-level endpoint serves SCORM and file lessons; a page has no
    // lesson-level media, only the media in its blocks.
    const single = await dispatch(runtime, {
      method: "GET",
      path: `/v1/public/${world.schoolA.publicId}/products/${productId}/lessons/${videoLesson.id}/media`,
      headers: { cookie: learnerCookie },
    });
    expect(single.status).toBe(404);

    // Content writes are drafts: learners keep the published image until
    // the draft is published, and only then does removing it revoke it.
    const removed = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/lessons/${freeLesson.id}`,
      headers,
      body: {
        content: imageDoc(null),
        expectedContentVersion: freeLesson.contentVersion,
      },
    });
    expect(removed.status).toBe(200);
    expect((await read(freeLesson.id, image.id)).status).toBe(200);
    const publishContent = (lessonId: string) =>
      dispatch(runtime, {
        method: "POST",
        path: `/v1/lessons/${lessonId}/publish-content`,
        headers,
        body: {},
      });
    expect((await publishContent(freeLesson.id)).status).toBe(200);
    expect((await read(freeLesson.id, image.id)).status).toBe(404);
    const swapped = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/lessons/${freeLesson.id}`,
      headers,
      body: {
        content: imageDoc(unused.id),
        expectedContentVersion: freeLesson.contentVersion + 1,
      },
    });
    expect(swapped.status).toBe(200);
    // Media only the draft uses is referenced, but learners can't reach it.
    expect((await read(freeLesson.id, unused.id)).status).toBe(404);

    // Previews: the grant's product only, drafts included, no enrollment.
    const grant = await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${productId}/preview`,
      headers,
      body: { ttlSeconds: 300 },
    });
    const token = (grant.body as { token: string }).token;
    const preview = (lessonId: string, mediaId: string, product = productId) =>
      dispatch(runtime, {
        method: "GET",
        path: `/v1/preview/products/${product}/lessons/${lessonId}/media/${mediaId}`,
        headers: { "x-preview-token": token },
      });
    expect(await preview(videoLesson.id, video.id)).toMatchObject({
      status: 200,
      body: { id: video.id },
    });
    expect((await preview(draftLesson.id, image.id)).status).toBe(200);
    expect((await preview(draftLesson.id, unused.id)).status).toBe(404);
    // Previews read the draft, so its media is served there.
    expect((await preview(freeLesson.id, unused.id)).status).toBe(200);
    expect((await publishContent(freeLesson.id)).status).toBe(200);
    expect((await read(freeLesson.id, unused.id)).status).toBe(200);
    const otherProduct = await dispatch(runtime, {
      method: "POST",
      path: "/v1/products",
      headers,
      body: { kind: "course", title: "Other course" },
    });
    const otherProductId = (otherProduct.body as { id: string }).id;
    // A grant for one product doesn't open another product's lessons.
    expect((await preview(videoLesson.id, video.id, otherProductId)).status).not.toBe(
      200,
    );
    const noToken = await dispatch(runtime, {
      method: "GET",
      path: `/v1/preview/products/${productId}/lessons/${videoLesson.id}/media/${video.id}`,
      headers: {},
    });
    expect(noToken.status).toBe(401);
    await runtime.close();
  });
});
