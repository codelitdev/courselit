import { describe, expect, it } from "bun:test";
import { createHash } from "node:crypto";
import { unzipSync } from "fflate";
import { createPublicId, uuidv7 } from "@codelitdev/platform";
import { eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { dispatch } from "./dispatch.js";
import { authenticateLearner } from "./learners.js";
import type { MediaLitClient } from "./media.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { seedWorld } from "./seed.js";
import { serveLearnerDownload } from "./downloads.js";

function cookieFrom(headers?: Record<string, string>) {
  const header = headers?.["Set-Cookie"];
  if (!header) throw new Error("missing_set_cookie");
  return header.split(";", 1)[0]!;
}

describe.serial("digital downloads", () => {
  it("creates a scoped one-use link and bundles private MediaLit files", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-06T00:00:00.000Z"));
    const assetReads: string[] = [];
    const mediaLit: MediaLitClient = {
      authorizeUpload: async () => {
        throw new Error("not_used");
      },
      finalizeUpload: async () => {
        throw new Error("not_used");
      },
      getAsset: async ({ schoolId, mediaLitId }) => ({
        mediaLitId,
        group: schoolId,
        canonicalUrl: `https://media.test/private/${mediaLitId}`,
        thumbnailUrl: null,
        fileName: "handout.txt",
        mimeType: "text/plain",
        byteSize: 12,
        width: null,
        height: null,
      }),
      deleteAsset: async () => undefined,
    };
    const runtime = await createPgliteRuntime({ clock, mediaLit });
    const world = await seedWorld(runtime, clock);
    const adminHeaders = {
      cookie: world.owner.sessionCookie,
      "x-school-id": world.schoolA.publicId,
    };

    const product = await dispatch(runtime, {
      method: "POST",
      path: "/v1/products",
      headers: adminHeaders,
      body: { kind: "download", title: "Private handouts" },
    });
    expect(product.status).toBe(201);
    const productId = (product.body as { id: string }).id;
    await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${productId}/plans`,
      headers: adminHeaders,
      body: { name: "Free access", kind: "free", amountMinor: 0 },
    });
    const mediaId = createPublicId("med", clock);
    await runtime.db.insert(schema.media).values({
      id: uuidv7(clock),
      publicId: mediaId,
      schoolId: world.schoolA.id,
      mediaLitId: "asset_private_handout",
      canonicalUrl: "https://media.test/unused",
      thumbnailUrl: null,
      fileName: "handout.txt",
      mimeType: "text/plain",
      byteSize: 12,
      width: null,
      height: null,
      kind: "document",
      altText: "",
      caption: "",
      accessPolicy: "private",
      status: "active",
      createdBy: world.owner.id,
      createdAt: clock.now(),
      updatedAt: clock.now(),
    });
    const lesson = await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${productId}/lessons`,
      headers: adminHeaders,
      body: {
        title: "Handout",
        type: "file",
        content: {},
        mediaId,
        status: "published",
      },
    });
    expect(lesson.status).toBe(201);
    const published = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/products/${productId}`,
      headers: adminHeaders,
      body: { status: "published" },
    });
    expect(published.status).toBe(200);

    const signedUp = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/auth/sign-up",
      headers: { "x-forwarded-host": "school-a.localhost:3001" },
      body: {
        email: "download-learner@example.com",
        password: "learner-password-1",
        name: "Download Learner",
      },
    });
    const learnerCookie = cookieFrom(signedUp.headers);
    const notEnrolled = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/products/${productId}/download`,
      headers: { cookie: learnerCookie, "x-school-id": world.schoolA.publicId },
      body: {},
    });
    expect(notEnrolled.status).toBe(403);

    const enrolled = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/memberships",
      headers: { cookie: learnerCookie, "x-school-id": world.schoolA.publicId },
      body: { productId },
    });
    expect(enrolled.status).toBe(201);
    const session = await authenticateLearner(
      runtime.db,
      { cookie: learnerCookie },
      clock,
    );
    expect(session.kind).toBe("authenticated");
    if (session.kind !== "authenticated") throw new Error("learner_session_missing");

    const link = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/products/${productId}/download`,
      headers: { cookie: learnerCookie, "x-school-id": world.schoolA.publicId },
      body: {},
    });
    expect(link.status).toBe(201);
    const token = (link.body as { token: string }).token;
    expect(token).toMatch(/^[a-f0-9]{128}$/);
    const storedLink = await runtime.db.select().from(schema.downloadLinks).limit(1);
    expect(storedLink).toHaveLength(1);
    expect(storedLink[0]!.tokenDigest).not.toBe(token);

    const served = await serveLearnerDownload(
      runtime.db,
      mediaLit,
      {
        schoolId: world.schoolA.id,
        learnerId: session.value.learner.id,
        token,
        requestId: "download-test",
        fetchAsset: async (url) => {
          assetReads.push(url);
          return new TextEncoder().encode("hello world\n");
        },
      },
      clock,
    );
    expect(served.ok).toBe(true);
    if (!served.ok || served.value.kind !== "zip") {
      throw new Error("download_archive_missing");
    }
    expect(served.value.fileName).toBe("Private handouts.zip");
    const archive = unzipSync(served.value.bytes);
    expect(new TextDecoder().decode(archive["files/handout.txt"])).toBe(
      "hello world\n",
    );
    expect(assetReads).toEqual(["https://media.test/private/asset_private_handout"]);

    const membershipRows = await runtime.db
      .select({ consumed: schema.downloadLinks.consumed })
      .from(schema.downloadLinks)
      .where(eq(schema.downloadLinks.schoolAccountId, session.value.schoolAccount.id));
    expect(membershipRows).toEqual([{ consumed: true }]);
    const completedEvents = await runtime.db
      .select({ action: schema.auditEvents.action })
      .from(schema.auditEvents)
      .where(eq(schema.auditEvents.action, "download.completed"));
    expect(completedEvents).toHaveLength(1);
    const analytics = await dispatch(runtime, {
      method: "GET",
      path: `/v1/products/${productId}/analytics?range=7d`,
      headers: adminHeaders,
    });
    expect(analytics.body).toMatchObject({ downloads: { count: 1, growth: 100 } });

    const replay = await serveLearnerDownload(
      runtime.db,
      mediaLit,
      {
        schoolId: world.schoolA.id,
        learnerId: session.value.learner.id,
        token,
        requestId: "download-replay",
        fetchAsset: async () => new TextEncoder().encode("should not read"),
      },
      clock,
    );
    expect(replay.ok).toBe(false);
    if (replay.ok) throw new Error("download_link_replayed");
    expect(replay.error.code).toBe("not_found");
    await runtime.close();
  });

  it("does not serve expired download links", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-06T00:00:00.000Z"));
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
      body: { kind: "download", title: "Expiring download" },
    });
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
    const signedUp = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/auth/sign-up",
      headers: { "x-forwarded-host": "school-a.localhost:3001" },
      body: {
        email: "expired-download@example.com",
        password: "learner-password-1",
        name: "Expired Download",
      },
    });
    const learnerCookie = cookieFrom(signedUp.headers);
    await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/memberships",
      headers: { cookie: learnerCookie, "x-school-id": world.schoolA.publicId },
      body: { productId },
    });
    const link = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/products/${productId}/download`,
      headers: { cookie: learnerCookie, "x-school-id": world.schoolA.publicId },
      body: {},
    });
    const token = (link.body as { token: string }).token;
    await runtime.db
      .update(schema.downloadLinks)
      .set({ expiresAt: new Date(clock.now().getTime() - 1) })
      .where(eq(schema.downloadLinks.tokenDigest, digestForTest(token)));
    const session = await authenticateLearner(
      runtime.db,
      { cookie: learnerCookie },
      clock,
    );
    if (session.kind !== "authenticated") throw new Error("learner_session_missing");
    const served = await serveLearnerDownload(
      runtime.db,
      runtime.mediaLit,
      {
        schoolId: world.schoolA.id,
        learnerId: session.value.learner.id,
        token,
        requestId: "expired-download",
      },
      clock,
    );
    expect(served.ok).toBe(false);
    await runtime.close();
  });
});

function digestForTest(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}
