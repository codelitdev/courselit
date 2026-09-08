import { describe, expect, it } from "bun:test";
import { and, eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { dispatch } from "./dispatch.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { seedWorld } from "./seed.js";

function cookieFrom(headers?: Record<string, string>) {
  const header = headers?.["Set-Cookie"];
  if (!header) throw new Error("missing_set_cookie");
  return header.split(";", 1)[0]!;
}

describe.serial("media library", () => {
  it("authorizes, finalizes, searches, updates, and reconciles media references", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    const headers = {
      cookie: world.owner.sessionCookie,
      "x-school-id": world.schoolA.publicId,
      "x-request-id": "req_media",
    };

    const authorization = await dispatch(runtime, {
      method: "POST",
      path: "/v1/media/upload-authorizations",
      headers,
      body: {
        fileName: "cover.png",
        mimeType: "image/png",
        byteSize: 2048,
        purpose: "product_artwork",
      },
    });
    expect(authorization.status).toBe(201);
    const uploadId = (authorization.body as { uploadId: string }).uploadId;
    expect(uploadId).toStartWith("upload_");

    const finalized = await dispatch(runtime, {
      method: "POST",
      path: "/v1/media",
      headers,
      body: { uploadId, altText: "Course cover", accessPolicy: "public" },
    });
    expect(finalized.status).toBe(201);
    const media = finalized.body as {
      id: string;
      schoolId: string;
      usageCount: number;
      canonicalUrl: string;
    };
    const canonicalUrl = media.canonicalUrl;
    expect(media).toMatchObject({
      schoolId: world.schoolA.publicId,
      usageCount: 0,
      canonicalUrl: expect.any(String),
    });
    expect(finalized.body).not.toHaveProperty("mediaLitId");

    const invalidLesson = await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${world.noteA.publicId}/lessons`,
      headers,
      body: {
        title: "PDF with image",
        type: "pdf",
        content: { value: "" },
        mediaId: media.id,
      },
    });
    expect(invalidLesson.status).toBe(400);
    expect(invalidLesson.body).toMatchObject({
      code: "validation_failed",
      details: { reason: "lesson_media_type_mismatch" },
    });

    const videoAuthorization = await dispatch(runtime, {
      method: "POST",
      path: "/v1/media/upload-authorizations",
      headers,
      body: {
        fileName: "course-video.mp4",
        mimeType: "video/mp4",
        byteSize: 4096,
        purpose: "lesson_media",
        accessPolicy: "private",
      },
    });
    expect(videoAuthorization.status).toBe(201);
    const videoFinalized = await dispatch(runtime, {
      method: "POST",
      path: "/v1/media",
      headers,
      body: {
        uploadId: (videoAuthorization.body as { uploadId: string }).uploadId,
        accessPolicy: "private",
      },
    });
    expect(videoFinalized.status).toBe(201);
    const videoMediaId = (videoFinalized.body as { id: string }).id;

    const lesson = await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${world.noteA.publicId}/lessons`,
      headers,
      body: {
        title: "Course video",
        type: "video",
        content: { value: "" },
        mediaId: videoMediaId,
      },
    });
    expect(lesson.status).toBe(201);
    expect(lesson.body).toMatchObject({ type: "video", mediaId: videoMediaId });

    const invalidUpdate = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/lessons/${(lesson.body as { id: string }).id}`,
      headers,
      body: { mediaId: media.id },
    });
    expect(invalidUpdate.status).toBe(400);
    expect(invalidUpdate.body).toMatchObject({
      code: "validation_failed",
      details: { reason: "lesson_media_type_mismatch" },
    });

    const product = await dispatch(runtime, {
      method: "GET",
      path: `/v1/products/${world.noteA.publicId}`,
      headers,
    });
    expect(product.body).toMatchObject({
      lessons: [{ title: "Course video", mediaId: videoMediaId }],
    });

    const detached = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/lessons/${(lesson.body as { id: string }).id}`,
      headers,
      body: { mediaId: null },
    });
    expect(detached.status).toBe(200);
    expect(detached.body).toMatchObject({ mediaId: null });

    const listed = await dispatch(runtime, {
      method: "GET",
      path: "/v1/media?search=cover&limit=1",
      headers,
    });
    expect(listed.status).toBe(200);
    expect(listed.body).toMatchObject({ items: [{ id: media.id, usageCount: 0 }] });

    const featured = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/products/${world.noteA.publicId}`,
      headers,
      body: { featuredMediaId: media.id },
    });
    expect(featured.status).toBe(200);
    expect(featured.body).toMatchObject({
      featuredMedia: { id: media.id, fileName: "cover.png" },
    });
    const productWithArtwork = await dispatch(runtime, {
      method: "GET",
      path: `/v1/products/${world.noteA.publicId}`,
      headers,
    });
    expect(productWithArtwork.body).toMatchObject({
      featuredMedia: { id: media.id },
    });
    const removedArtwork = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/products/${world.noteA.publicId}`,
      headers,
      body: { featuredMediaId: null },
    });
    expect(removedArtwork.status).toBe(200);
    expect(removedArtwork.body).toMatchObject({ featuredMedia: null });

    const richDescription = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "image",
              attrs: { src: canonicalUrl, alt: "Course cover" },
            },
          ],
        },
      ],
    });
    const savedRichDescription = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/products/${world.noteA.publicId}`,
      headers,
      body: { description: richDescription },
    });
    expect(savedRichDescription.status).toBe(200);
    const richTextReferences = await dispatch(runtime, {
      method: "GET",
      path: `/v1/media/${media.id}/references`,
      headers,
    });
    expect(richTextReferences.body).toMatchObject({
      items: [{ resourceType: "product_content", resourceId: world.noteA.publicId }],
    });

    const clearedRichDescription = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/products/${world.noteA.publicId}`,
      headers,
      body: { description: JSON.stringify({ type: "doc", content: [] }) },
    });
    expect(clearedRichDescription.status).toBe(200);
    const clearedRichTextReferences = await dispatch(runtime, {
      method: "GET",
      path: `/v1/media/${media.id}/references`,
      headers,
    });
    expect(clearedRichTextReferences.body).toMatchObject({ items: [] });

    const updated = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/media/${media.id}`,
      headers,
      body: { caption: "Updated caption" },
    });
    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({
      caption: "Updated caption",
      accessPolicy: "public",
      schoolId: world.schoolA.publicId,
    });

    const references = await dispatch(runtime, {
      method: "PUT",
      path: `/v1/media/${media.id}/references`,
      headers,
      body: {
        references: [
          {
            resourceType: "product_artwork",
            resourceId: world.noteA.publicId,
          },
        ],
      },
    });
    expect(references.status).toBe(200);
    expect(references.body).toMatchObject({
      items: [{ resourceType: "product_artwork", resourceId: world.noteA.publicId }],
    });

    const fetched = await dispatch(runtime, {
      method: "GET",
      path: `/v1/media/${media.id}`,
      headers,
    });
    expect(fetched.body).toMatchObject({ usageCount: 1 });
    const located = await dispatch(runtime, {
      method: "GET",
      path: `/v1/media/${media.id}/references`,
      headers,
    });
    expect(located.body).toMatchObject({
      items: [{ resourceType: "product_artwork", resourceId: world.noteA.publicId }],
    });

    const inUseDelete = await dispatch(runtime, {
      method: "DELETE",
      path: `/v1/media/${media.id}`,
      headers,
    });
    expect(inUseDelete.status).toBe(409);
    expect(inUseDelete.body).toMatchObject({
      code: "conflict",
      details: { reason: "media_in_use" },
    });

    const mediaRows = await runtime.db
      .select({ mediaLitId: schema.media.mediaLitId })
      .from(schema.media)
      .where(eq(schema.media.publicId, media.id));
    expect(mediaRows).toHaveLength(1);
    await runtime.close();
  });

  it("delivers private lesson media only after learner access is granted", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    const adminHeaders = {
      cookie: world.owner.sessionCookie,
      "x-school-id": world.schoolA.publicId,
    };

    const authorization = await dispatch(runtime, {
      method: "POST",
      path: "/v1/media/upload-authorizations",
      headers: adminHeaders,
      body: {
        fileName: "course-video.mp4",
        mimeType: "video/mp4",
        byteSize: 2048,
        purpose: "lesson_media",
        accessPolicy: "private",
      },
    });
    const finalized = await dispatch(runtime, {
      method: "POST",
      path: "/v1/media",
      headers: adminHeaders,
      body: {
        uploadId: (authorization.body as { uploadId: string }).uploadId,
        accessPolicy: "private",
      },
    });
    expect(finalized.status).toBe(201);
    const mediaId = (finalized.body as { id: string }).id;

    await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/products/${world.noteA.publicId}`,
      headers: adminHeaders,
      body: { status: "published" },
    });
    const lesson = await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${world.noteA.publicId}/lessons`,
      headers: adminHeaders,
      body: {
        title: "Private video",
        type: "video",
        content: {},
        mediaId,
        status: "published",
      },
    });
    const lessonId = (lesson.body as { id: string }).id;

    const publicRead = await dispatch(runtime, {
      method: "GET",
      path: `/v1/products/${world.noteA.publicId}/lessons/${lessonId}/media`,
      headers: { "x-school-id": world.schoolA.publicId },
    });
    expect(publicRead.status).toBe(403);

    const signedUp = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/auth/sign-up",
      headers: { "x-forwarded-host": "school-a.localhost:3001" },
      body: {
        email: "private-media-learner@example.com",
        password: "learner-password-1",
        name: "Media Learner",
      },
    });
    const learnerCookie = cookieFrom(signedUp.headers);
    const beforeEnrollment = await dispatch(runtime, {
      method: "GET",
      path: `/v1/products/${world.noteA.publicId}/lessons/${lessonId}/media`,
      headers: { cookie: learnerCookie, "x-school-id": world.schoolA.publicId },
    });
    expect(beforeEnrollment.status).toBe(403);

    const enrolled = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/enrollments",
      headers: { cookie: learnerCookie, "x-school-id": world.schoolA.publicId },
      body: { productId: world.noteA.publicId },
    });
    expect(enrolled.status).toBe(201);

    const delivered = await dispatch(runtime, {
      method: "GET",
      path: `/v1/products/${world.noteA.publicId}/lessons/${lessonId}/media`,
      headers: { cookie: learnerCookie, "x-school-id": world.schoolA.publicId },
    });
    expect(delivered.status).toBe(200);
    expect(delivered.body).toMatchObject({
      id: mediaId,
      fileName: "course-video.mp4",
      mimeType: "video/mp4",
      url: expect.stringContaining("media.test/assets/"),
    });
    expect(delivered.body).not.toHaveProperty("mediaLitId");
    await runtime.close();
  });

  it("enforces media permissions and tenant isolation, then deletes unused media", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    const ownerHeaders = {
      cookie: world.owner.sessionCookie,
      "x-school-id": world.schoolA.publicId,
    };
    const memberHeaders = {
      cookie: world.member.sessionCookie,
      "x-school-id": world.schoolA.publicId,
    };
    const authorization = await dispatch(runtime, {
      method: "POST",
      path: "/v1/media/upload-authorizations",
      headers: ownerHeaders,
      body: {
        fileName: "manual.pdf",
        mimeType: "application/pdf",
        byteSize: 512,
        purpose: "downloadable_file",
      },
    });
    const media = await dispatch(runtime, {
      method: "POST",
      path: "/v1/media",
      headers: ownerHeaders,
      body: { uploadId: (authorization.body as { uploadId: string }).uploadId },
    });
    const mediaId = (media.body as { id: string }).id;

    const memberDelete = await dispatch(runtime, {
      method: "DELETE",
      path: `/v1/media/${mediaId}`,
      headers: memberHeaders,
    });
    expect(memberDelete.status).toBe(403);

    const otherSchool = await dispatch(runtime, {
      method: "GET",
      path: `/v1/media/${mediaId}`,
      headers: { ...ownerHeaders, "x-school-id": world.schoolB.publicId },
    });
    expect(otherSchool.status).toBe(404);

    const deleted = await dispatch(runtime, {
      method: "DELETE",
      path: `/v1/media/${mediaId}`,
      headers: ownerHeaders,
    });
    expect(deleted.status).toBe(204);
    expect(
      await runtime.db
        .select()
        .from(schema.media)
        .where(eq(schema.media.publicId, mediaId)),
    ).toHaveLength(0);
    const audit = await runtime.db
      .select({ action: schema.auditEvents.action })
      .from(schema.auditEvents)
      .where(eq(schema.auditEvents.resourceId, mediaId));
    expect(audit.map((event) => event.action)).toEqual(
      expect.arrayContaining(["media.created", "media.deleted"]),
    );
    await runtime.close();
  });

  it("keeps legacy owner memberships able to manage MediaLit assets", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    await runtime.db
      .update(schema.memberships)
      .set({
        permissions:
          "products:read,products:write,products:delete,learners:write,school:admin,billing:read",
      })
      .where(
        and(
          eq(schema.memberships.schoolId, world.schoolA.id),
          eq(schema.memberships.userId, world.owner.id),
        ),
      );

    const response = await dispatch(runtime, {
      method: "POST",
      path: "/v1/media/upload-authorizations",
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
      body: {
        fileName: "legacy-owner.png",
        mimeType: "image/png",
        byteSize: 1024,
        purpose: "product_artwork",
      },
    });

    expect(response.status).toBe(201);
    await runtime.close();
  });

  it("proxies authenticated Unsplash searches without exposing the access key", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const queries: Array<string | undefined> = [];
    const runtime = await createPgliteRuntime({
      clock,
      unsplash: {
        search: async (query) => {
          queries.push(query);
          return {
            configured: true,
            items: [
              {
                id: "photo_1",
                url: "https://images.unsplash.com/photo_1",
                thumbUrl: "https://images.unsplash.com/photo_1?w=200",
                alt: "A course workspace",
                photographer: "CourseLit Test",
              },
            ],
          };
        },
      },
    });
    const world = await seedWorld(runtime, clock);
    const response = await dispatch(runtime, {
      method: "GET",
      path: "/v1/media/unsplash?q=workspace",
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      configured: true,
      items: [{ id: "photo_1", photographer: "CourseLit Test" }],
    });
    expect(queries).toEqual(["workspace"]);
    await runtime.close();
  });
});
