import { describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { zipSync } from "fflate";
import * as schema from "./db/schema/index.js";
import { dispatch } from "./dispatch.js";
import { LEARNER_SESSION_COOKIE } from "./learners.js";
import { type MediaLitClient, MemoryMediaLitClient } from "./media.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { parseScormManifest } from "./scorm.js";
import { seedWorld } from "./seed.js";

function cookieFrom(headers?: Record<string, string>) {
  const header = headers?.["Set-Cookie"];
  if (!header) throw new Error("missing_set_cookie");
  return header.split(";", 1)[0]!;
}

describe.serial("SCORM runtime", () => {
  it("ports manifest-derived launch metadata from the production extractor", () => {
    const manifest = `<?xml version="1.0"?>
      <manifest xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_v1p3" identifier="course">
        <organizations default="org-1">
          <organization identifier="org-1"><title>Onboarding</title>
            <item identifier="item-1" identifierref="resource-1"><title>Launch</title></item>
          </organization>
        </organizations>
        <resources>
          <resource identifier="resource-1" adlcp:scormType="sco" href="content/start.html" />
        </resources>
      </manifest>`;
    const packageInfo = parseScormManifest(
      zipSync({
        "imsmanifest.xml": new TextEncoder().encode(manifest),
        "content/": new Uint8Array(),
        "content/start.html": new TextEncoder().encode("<h1>Start</h1>"),
      }),
    );
    expect(packageInfo).toEqual({
      version: "2004",
      title: "Onboarding",
      entryPoint: "content/start.html",
      scoCount: 1,
      fileCount: 2,
    });
  });

  it("returns the missing entry-point detail used by the production validator", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const manifest = `<?xml version="1.0"?>
      <manifest xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_v1p3" identifier="course">
        <organizations default="org-1">
          <organization identifier="org-1"><title>Broken package</title>
            <item identifier="item-1" identifierref="resource-1"><title>Launch</title></item>
          </organization>
        </organizations>
        <resources>
          <resource identifier="resource-1" adlcp:scormType="sco" href="shared/launchpage.html?content=playing" />
        </resources>
      </manifest>`;
    const packageBytes = zipSync({
      "imsmanifest.xml": new TextEncoder().encode(manifest),
      "shared/launchpage.html": new TextEncoder().encode("<h1>Launch</h1>"),
    });
    const memoryMediaLit = new MemoryMediaLitClient(() => clock.now());
    const mediaLit: MediaLitClient = {
      authorizeUpload: (input) => memoryMediaLit.authorizeUpload(input),
      finalizeUpload: (input) => memoryMediaLit.finalizeUpload(input),
      getAsset: async (input) => ({
        ...(await memoryMediaLit.getAsset(input)),
        canonicalUrl: `data:application/zip;base64,${Buffer.from(packageBytes).toString("base64")}`,
      }),
      deleteAsset: (input) => memoryMediaLit.deleteAsset(input),
    };
    const runtime = await createPgliteRuntime({ clock, mediaLit });
    try {
      const world = await seedWorld(runtime, clock);
      const headers = {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      };
      const authorization = await dispatch(runtime, {
        method: "POST",
        path: "/v1/media/upload-authorizations",
        headers,
        body: {
          fileName: "broken-scorm.zip",
          mimeType: "application/zip",
          byteSize: packageBytes.byteLength,
          purpose: "lesson_media",
          accessPolicy: "private",
        },
      });
      expect(authorization.status).toBe(201);
      const finalized = await dispatch(runtime, {
        method: "POST",
        path: "/v1/media",
        headers,
        body: {
          uploadId: (authorization.body as { uploadId: string }).uploadId,
          accessPolicy: "private",
        },
      });
      expect(finalized.status).toBe(201);
      const mediaId = (finalized.body as { id: string }).id;
      const lesson = await dispatch(runtime, {
        method: "POST",
        path: `/v1/products/${world.noteA.publicId}/lessons`,
        headers,
        body: {
          title: "Broken SCORM",
          type: "scorm",
          content: {},
          mediaId,
        },
      });
      expect(lesson.status).toBe(201);
      const processed = await dispatch(runtime, {
        method: "POST",
        path: `/v1/lessons/${(lesson.body as { id: string }).id}/scorm/process`,
        headers,
        body: { mediaId },
      });
      expect(processed).toMatchObject({
        status: 400,
        body: {
          code: "validation_failed",
          details: {
            reason: "scorm_entry_point_not_found",
            entryPoint: "shared/launchpage.html?content=playing",
          },
        },
      });
    } finally {
      await runtime.close();
    }
  });

  it("persists production-compatible runtime state per learner enrollment", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);

    const product = await dispatch(runtime, {
      method: "POST",
      path: "/v1/products",
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
      body: { kind: "course", title: "SCORM course" },
    });
    const productId = (product.body as { id: string }).id;
    await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/products/${productId}`,
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
      body: { status: "published" },
    });
    const lesson = await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${productId}/lessons`,
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
      body: {
        title: "SCORM lesson",
        type: "scorm",
        content: { mediaId: "asset_private", launchUrl: "index.html" },
      },
    });
    const lessonId = (lesson.body as { id: string }).id;
    await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/lessons/${lessonId}`,
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
      body: { status: "published" },
    });

    const signedUp = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/auth/sign-up",
      headers: { "x-forwarded-host": "school-a.localhost:3001" },
      body: {
        email: "scorm-learner@example.com",
        password: "learner-password-1",
        name: "SCORM Learner",
      },
    });
    expect(signedUp.status).toBe(201);
    const learnerCookie = cookieFrom(signedUp.headers);
    expect(learnerCookie.startsWith(`${LEARNER_SESSION_COOKIE}=`)).toBe(true);

    const beforeEnrollment = await dispatch(runtime, {
      method: "GET",
      path: `/v1/learner/products/${productId}/lessons/${lessonId}/scorm/runtime`,
      headers: {
        cookie: learnerCookie,
        "x-school-id": world.schoolA.publicId,
      },
    });
    expect(beforeEnrollment.status).toBe(403);

    const enrolled = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/enrollments",
      headers: {
        cookie: learnerCookie,
        "x-school-id": world.schoolA.publicId,
      },
      body: { productId },
    });
    expect(enrolled.status).toBe(201);

    const initial = await dispatch(runtime, {
      method: "GET",
      path: `/v1/learner/products/${productId}/lessons/${lessonId}/scorm/runtime`,
      headers: {
        cookie: learnerCookie,
        "x-school-id": world.schoolA.publicId,
      },
    });
    expect(initial).toMatchObject({ status: 200, body: { cmi: {} } });

    const completionBeforeRuntime = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/lessons/${lessonId}/complete`,
      headers: {
        cookie: learnerCookie,
        "x-school-id": world.schoolA.publicId,
      },
      body: {},
    });
    expect(completionBeforeRuntime).toMatchObject({
      status: 400,
      body: { details: { reason: "scorm_content_incomplete" } },
    });

    const updated = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/products/${productId}/lessons/${lessonId}/scorm/runtime`,
      headers: {
        cookie: learnerCookie,
        "x-school-id": world.schoolA.publicId,
      },
      body: {
        updates: {
          "cmi.core.lesson_status": "incomplete",
          "cmi.suspend_data": "chapter-1",
        },
      },
    });
    expect(updated).toMatchObject({
      status: 200,
      body: {
        cmi: { core: { lesson_status: "incomplete" }, suspend_data: "chapter-1" },
      },
    });

    const compatibilityUpdate = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/products/${productId}/lessons/${lessonId}/scorm/runtime`,
      headers: {
        cookie: learnerCookie,
        "x-school-id": world.schoolA.publicId,
      },
      body: { element: "cmi.core.lesson_status", value: "completed" },
    });
    expect(compatibilityUpdate.status).toBe(200);

    const completed = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/lessons/${lessonId}/complete`,
      headers: {
        cookie: learnerCookie,
        "x-school-id": world.schoolA.publicId,
      },
      body: {},
    });
    expect(completed.status).toBe(200);

    const persisted = await dispatch(runtime, {
      method: "GET",
      path: `/v1/learner/products/${productId}/lessons/${lessonId}/scorm/runtime`,
      headers: {
        cookie: learnerCookie,
        "x-school-id": world.schoolA.publicId,
      },
    });
    expect(persisted).toMatchObject({
      status: 200,
      body: {
        cmi: { core: { lesson_status: "completed" }, suspend_data: "chapter-1" },
      },
    });

    const unsafe = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/products/${productId}/lessons/${lessonId}/scorm/runtime`,
      headers: {
        cookie: learnerCookie,
        "x-school-id": world.schoolA.publicId,
      },
      body: { element: "cmi.__proto__.polluted", value: "yes" },
    });
    expect(unsafe.status).toBe(400);

    const states = await runtime.db
      .select()
      .from(schema.scormRuntimeStates)
      .where(
        eq(
          schema.scormRuntimeStates.lessonId,
          (
            await runtime.db
              .select({ id: schema.lessons.id })
              .from(schema.lessons)
              .where(eq(schema.lessons.publicId, lessonId))
              .limit(1)
          )[0]!.id,
        ),
      );
    expect(states).toHaveLength(1);
    expect(states[0]?.state).toMatchObject({ cmi: { suspend_data: "chapter-1" } });
    await runtime.close();
  });
});
