import { describe, expect, it } from "bun:test";
import { uuidv7 } from "@codelitdev/platform";
import { and, eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { dispatch } from "./dispatch.js";
import { isLearnerCommunityMime, MemoryMediaLitClient } from "./media.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { seedWorld } from "./seed.js";
import { signInLearner } from "./test-learner-auth.js";
import {
  LEARNER_UPLOADS_PER_HOUR,
  pruneReservations,
  storageGate,
  storageRefusal,
  storageUsed,
  sweepUnusedLearnerUploads,
  UNUSED_LEARNER_UPLOAD_MS,
} from "./storage.js";
import { planLimits } from "./plan-limits-config.js";

const MB = 1024 * 1024;
/** A share of the trial's storage, in bytes. */
const trialShare = (share: number) => Math.round(planLimits().trial.storage_bytes! * share);

describe("storageRefusal", () => {
  const usage = (schoolBytes: number, learnerBytes = 0, accountBytes = 0) => ({
    schoolBytes,
    learnerBytes,
    accountBytes,
  });
  const staff = { kind: "staff" as const };
  const learner = { kind: "learner" as const, schoolAccountId: "acc" };
  const base = { limit: 1000 * MB, learnerBudget: 100 * MB };

  it("holds staff to the plan's storage, with no limit on oss", () => {
    expect(storageRefusal({ ...base, uploader: staff, bytes: 10 * MB, usage: usage(990 * MB) })).toBeNull();
    const refused = storageRefusal({ ...base, uploader: staff, bytes: 11 * MB, usage: usage(990 * MB) });
    expect(refused?.safeDetails).toMatchObject({ reason: "plan_limit_reached" });
    expect(
      storageRefusal({ ...base, limit: null, uploader: staff, bytes: 10_000 * MB, usage: usage(0) }),
    ).toBeNull();
  });

  it("gives each learner a budget, all learners 25%, and nothing past 90%", () => {
    const check = (bytes: number, used: ReturnType<typeof usage>) =>
      storageRefusal({ ...base, uploader: learner, bytes, usage: used });
    expect(check(50 * MB, usage(0, 0, 40 * MB))).toBeNull();
    expect(check(61 * MB, usage(0, 0, 40 * MB))).not.toBeNull();
    // All learners together: 25% of 1000 MB is 250 MB.
    expect(check(10 * MB, usage(300 * MB, 240 * MB))).toBeNull();
    expect(check(10 * MB, usage(300 * MB, 241 * MB))).not.toBeNull();
    expect(check(1 * MB, usage(900 * MB))).not.toBeNull();
    // Learners never see numbers.
    expect(check(1 * MB, usage(900 * MB))?.safeDetails).toEqual({
      reason: "upload_not_allowed",
    });
  });
});

describe("isLearnerCommunityMime", () => {
  it("allows images, video, audio and PDFs only (S24)", () => {
    for (const type of ["image/png", "video/mp4", "audio/mpeg", "application/pdf"]) {
      expect(isLearnerCommunityMime(type)).toBe(true);
    }
    for (const type of ["text/html", "application/zip", "application/x-msdownload"]) {
      expect(isLearnerCommunityMime(type)).toBe(false);
    }
  });
});

type ConvertOnSeal = ConstructorParameters<typeof MemoryMediaLitClient>[1];

async function setup(mediaLitOptions?: ConvertOnSeal) {
  const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
  const mediaLit = new MemoryMediaLitClient(() => clock.now(), mediaLitOptions);
  const runtime = await createPgliteRuntime({ clock, billingMode: "cloud", mediaLit });
  const world = await seedWorld(runtime, clock);
  // School B gets a trial, with the trial's storage (PLAN_TRIAL_STORAGE).
  await runtime.db.insert(schema.schoolTrials).values({
    id: uuidv7(clock),
    userId: "trial-user",
    normalizedEmail: "trial@example.com",
    schoolId: world.schoolB.id,
    startedAt: clock.now(),
    endsAt: new Date(clock.now().getTime() + 14 * 86_400_000),
  });
  const ownerB = { cookie: world.owner.sessionCookie, "x-school-id": world.schoolB.publicId };
  return { clock, runtime, world, mediaLit, ownerB };
}

type Setup = Awaited<ReturnType<typeof setup>>;

const authorize = (t: Setup, headers: Record<string, string>, byteSize: number) =>
  dispatch(t.runtime, {
    method: "POST",
    path: "/v1/media/upload-authorizations",
    headers,
    body: {
      fileName: "big.mp4",
      mimeType: "video/mp4",
      byteSize,
      purpose: "product_content",
      accessPolicy: "private",
    },
  });

const finalize = (t: Setup, headers: Record<string, string>, uploadId: string) =>
  dispatch(t.runtime, {
    method: "POST",
    path: "/v1/media",
    headers,
    body: { uploadId, altText: "", caption: "", accessPolicy: "private" },
  });

const reason = (body: unknown) => (body as { details?: { reason?: string } }).details?.reason;
const uploadIdOf = (body: unknown) => (body as { uploadId: string }).uploadId;

describe("storage on courselit.app (S1)", () => {
  it("reserves the declared size, so two uploads can't share the last space", async () => {
    const t = await setup();
    try {
      const first = await authorize(t, t.ownerB, trialShare(0.8));
      expect(first.status).toBe(201);
      const second = await authorize(t, t.ownerB, trialShare(0.4));
      expect(second.status).toBe(403);
      expect(reason(second.body)).toBe("plan_limit_reached");
      expect((await finalize(t, t.ownerB, uploadIdOf(first.body))).status).toBe(201);
    } finally {
      await t.runtime.close();
    }
  });

  it("checks the real size at finalize and deletes what doesn't fit", async () => {
    const t = await setup();
    try {
      const upload = await authorize(t, t.ownerB, trialShare(0.6));
      expect(upload.status).toBe(201);
      // Something else filled the school meanwhile.
      await t.runtime.db.insert(schema.media).values({
        id: uuidv7(t.clock),
        publicId: "med_filler",
        schoolId: t.world.schoolB.id,
        mediaLitId: "asset_filler",
        canonicalUrl: "https://media.test/assets/filler",
        fileName: "filler.mp4",
        mimeType: "video/mp4",
        byteSize: trialShare(0.6),
        kind: "video",
        createdAt: t.clock.now(),
        updatedAt: t.clock.now(),
      });
      const refused = await finalize(t, t.ownerB, uploadIdOf(upload.body));
      expect(refused.status).toBe(403);
      expect(reason(refused.body)).toBe("plan_limit_reached");
      // The upload was discarded, so it can't be finalized later.
      const again = await finalize(t, t.ownerB, uploadIdOf(upload.body));
      expect(reason(again.body)).toBe("upload_not_ready");
    } finally {
      await t.runtime.close();
    }
  });

  it("checks the school before sealing, so one school can't finalize another's upload", async () => {
    const t = await setup();
    try {
      const upload = await authorize(t, t.ownerB, 1 * MB);
      const ownerA = { cookie: t.world.owner.sessionCookie, "x-school-id": t.world.schoolA.publicId };
      const stolen = await finalize(t, ownerA, uploadIdOf(upload.body));
      expect(reason(stolen.body)).toBe("media_school_mismatch");
      // Neither sealed nor deleted: the right school still finalizes it.
      expect((await finalize(t, t.ownerB, uploadIdOf(upload.body))).status).toBe(201);
    } finally {
      await t.runtime.close();
    }
  });
});

async function learnerWithCommunity(t: Setup, email: string, member = true) {
  const signedIn = await signInLearner(
    t.runtime.db,
    { email, schoolPublicId: t.world.schoolA.publicId },
    t.clock,
    "req_test",
  );
  if (!signedIn.ok) throw new Error("sign-in failed");
  const cookie = `courselit.learner.session=${signedIn.token}`;
  const [account] = await t.runtime.db
    .select({ id: schema.schoolAccounts.id })
    .from(schema.schoolAccounts)
    .where(
      and(
        eq(schema.schoolAccounts.schoolId, t.world.schoolA.id),
        eq(schema.schoolAccounts.email, email),
      ),
    );
  if (member) {
    await t.runtime.db.insert(schema.learnerMemberships).values({
      id: uuidv7(t.clock),
      publicId: `mbr_${email}`,
      schoolId: t.world.schoolA.id,
      schoolAccountId: account!.id,
      entityType: "community",
      entityId: "cmt_test",
      status: "active",
      role: "post",
      createdAt: t.clock.now(),
      updatedAt: t.clock.now(),
    });
  }
  return { headers: { cookie, "x-school-id": t.world.schoolA.publicId }, accountId: account!.id };
}

const ownerA = (t: Setup) => ({
  cookie: t.world.owner.sessionCookie,
  "x-school-id": t.world.schoolA.publicId,
});

const learnerAuthorize = (
  t: Setup,
  headers: Record<string, string>,
  byteSize: number,
  mimeType = "image/png",
) =>
  dispatch(t.runtime, {
    method: "POST",
    path: "/v1/learner/community-media/upload-authorizations",
    headers,
    body: { fileName: "a.png", mimeType, byteSize, accessPolicy: "public" },
  });

/** MediaLit v0.8.0 with WebP on: the seal turns a PNG into a WebP of `bytes(original)`. */
const webpOnSeal = (bytes: (original: number) => number): ConvertOnSeal => ({
  convertOnSeal: (original) =>
    original.mimeType === "image/png"
      ? { fileName: "main.webp", mimeType: "image/webp", byteSize: bytes(original.byteSize) }
      : null,
});

const authorizePng = (t: Setup, headers: Record<string, string>, byteSize: number) =>
  dispatch(t.runtime, {
    method: "POST",
    path: "/v1/media/upload-authorizations",
    headers,
    body: {
      fileName: "photo.png",
      mimeType: "image/png",
      byteSize,
      purpose: "product_content",
      accessPolicy: "public",
    },
  });

const fillSchoolB = (t: Setup, byteSize: number) =>
  t.runtime.db.insert(schema.media).values({
    id: uuidv7(t.clock),
    publicId: "med_filler",
    schoolId: t.world.schoolB.id,
    mediaLitId: "asset_filler",
    canonicalUrl: "https://media.test/assets/filler",
    fileName: "filler.mp4",
    mimeType: "video/mp4",
    byteSize,
    kind: "video",
    createdAt: t.clock.now(),
    updatedAt: t.clock.now(),
  });

const schoolBRows = (t: Setup) =>
  t.runtime.db
    .select({
      mediaLitId: schema.media.mediaLitId,
      fileName: schema.media.fileName,
      mimeType: schema.media.mimeType,
      byteSize: schema.media.byteSize,
    })
    .from(schema.media)
    .where(eq(schema.media.schoolId, t.world.schoolB.id));

describe("storage counts the sealed size (MediaLit converts to WebP at seal)", () => {
  it("stores and counts the smaller WebP, not the original", async () => {
    const t = await setup(webpOnSeal((bytes) => Math.round(bytes / 4)));
    try {
      const upload = await authorizePng(t, t.ownerB, 8 * MB);
      expect(upload.status).toBe(201);
      const saved = await finalize(t, t.ownerB, uploadIdOf(upload.body));
      expect(saved.status).toBe(201);
      expect(saved.body).toMatchObject({
        fileName: "main.webp",
        mimeType: "image/webp",
        byteSize: 2 * MB,
        kind: "image",
      });
      const rows = await schoolBRows(t);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        fileName: "main.webp",
        mimeType: "image/webp",
        byteSize: 2 * MB,
      });
      // The reservation and the finalize hold are gone; only the WebP counts.
      expect((await storageUsed(t.runtime.db, t.world.schoolB.id, t.clock.now())).total).toBe(
        2 * MB,
      );
    } finally {
      await t.runtime.close();
    }
  });

  it("keeps a WebP larger than the original when it still fits, and counts it", async () => {
    const t = await setup(webpOnSeal((bytes) => bytes * 2));
    try {
      const upload = await authorizePng(t, t.ownerB, 4 * MB);
      const saved = await finalize(t, t.ownerB, uploadIdOf(upload.body));
      expect(saved.status).toBe(201);
      expect(saved.body).toMatchObject({ mimeType: "image/webp", byteSize: 8 * MB });
      expect((await schoolBRows(t))[0]?.byteSize).toBe(8 * MB);
      expect((await storageUsed(t.runtime.db, t.world.schoolB.id, t.clock.now())).total).toBe(
        8 * MB,
      );
    } finally {
      await t.runtime.close();
    }
  });

  it("refuses and deletes a sealed WebP that grew past the limit", async () => {
    const t = await setup(webpOnSeal(() => trialShare(0.7)));
    try {
      await fillSchoolB(t, trialShare(0.4));
      // The original fits (0.4 + 0.5), so it is admitted and sealed.
      const upload = await authorizePng(t, t.ownerB, trialShare(0.5));
      expect(upload.status).toBe(201);
      const refused = await finalize(t, t.ownerB, uploadIdOf(upload.body));
      expect(refused.status).toBe(403);
      expect(reason(refused.body)).toBe("plan_limit_reached");
      // No row for it, and MediaLit no longer has the sealed asset.
      const rows = await schoolBRows(t);
      expect(rows.map((row) => row.mediaLitId)).toEqual(["asset_filler"]);
      expect(t.mediaLit.assetCount()).toBe(0);
      // The hold is released: only the filler counts.
      expect((await storageUsed(t.runtime.db, t.world.schoolB.id, t.clock.now())).total).toBe(
        trialShare(0.4),
      );
    } finally {
      await t.runtime.close();
    }
  });

  it("holds learners to their budget against the sealed size", async () => {
    const t = await setup(webpOnSeal((bytes) => bytes * 2));
    try {
      const member = await learnerWithCommunity(t, "webp-l@example.com");
      // 60 MB fits the 100 MB learner budget; the 120 MB WebP doesn't.
      const upload = await learnerAuthorize(t, member.headers, 60 * MB);
      expect(upload.status).toBe(201);
      const refused = await dispatch(t.runtime, {
        method: "POST",
        path: "/v1/learner/community-media",
        headers: member.headers,
        body: { uploadId: uploadIdOf(upload.body), altText: "", caption: "", accessPolicy: "public" },
      });
      expect(refused.status).toBe(403);
      expect(reason(refused.body)).toBe("upload_not_allowed");
      expect(t.mediaLit.assetCount()).toBe(0);
    } finally {
      await t.runtime.close();
    }
  });
});

describe("resizing a finalize hold", () => {
  const SEAL_OUTLASTS_HOLD_MS = 16 * 60 * 1000;
  const gateFor = (t: Setup, clock = t.clock) =>
    storageGate({
      db: t.runtime.db,
      billing: t.runtime.billing.billing,
      mode: t.runtime.billingMode,
      clock,
    });
  // The clock when a seal that outlasted the hold returns.
  const afterSlowSeal = (t: Setup) =>
    freezeRuntimeClock(new Date(t.clock.now().getTime() + SEAL_OUTLASTS_HOLD_MS));
  const staff = { kind: "staff" as const };

  it("renews a hold that a slow seal outlasted", async () => {
    const t = await setup();
    try {
      const admitted = await gateFor(t).admit(t.world.schoolB.id, staff, 6 * MB);
      if (!admitted.ok) throw new Error("not admitted");
      const later = afterSlowSeal(t);
      // The expired hold no longer counts.
      expect((await storageUsed(t.runtime.db, t.world.schoolB.id, later.now())).total).toBe(0);
      expect(
        await gateFor(t, later).resize(t.world.schoolB.id, staff, admitted.holdId, 5 * MB),
      ).toEqual({ ok: true });
      expect((await storageUsed(t.runtime.db, t.world.schoolB.id, later.now())).total).toBe(
        5 * MB,
      );
    } finally {
      await t.runtime.close();
    }
  });

  it("recreates a hold the worker already pruned", async () => {
    const t = await setup();
    try {
      const admitted = await gateFor(t).admit(t.world.schoolB.id, staff, 6 * MB);
      if (!admitted.ok) throw new Error("not admitted");
      const later = afterSlowSeal(t);
      expect(await pruneReservations(t.runtime.db, later.now())).toBe(1);
      const gate = gateFor(t, later);
      expect(await gate.resize(t.world.schoolB.id, staff, admitted.holdId, 5 * MB)).toEqual({
        ok: true,
      });
      expect((await storageUsed(t.runtime.db, t.world.schoolB.id, later.now())).total).toBe(
        5 * MB,
      );
      await gate.release(admitted.holdId);
      expect((await storageUsed(t.runtime.db, t.world.schoolB.id, later.now())).total).toBe(0);
    } finally {
      await t.runtime.close();
    }
  });

  it("refuses a renewal when other uploads took the space meanwhile", async () => {
    const t = await setup();
    try {
      const admitted = await gateFor(t).admit(t.world.schoolB.id, staff, trialShare(0.5));
      if (!admitted.ok) throw new Error("not admitted");
      // Once the hold expired, another upload took the space it held.
      await fillSchoolB(t, trialShare(0.7));
      const resized = await gateFor(t, afterSlowSeal(t)).resize(
        t.world.schoolB.id,
        staff,
        admitted.holdId,
        trialShare(0.4),
      );
      expect(resized.ok).toBe(false);
    } finally {
      await t.runtime.close();
    }
  });
});

describe("learner uploads (S2, S24)", () => {
  it("need a community membership that can post", async () => {
    const t = await setup();
    try {
      const outsider = await learnerWithCommunity(t, "outsider-l@example.com", false);
      expect((await learnerAuthorize(t, outsider.headers, MB)).status).toBe(403);
      const member = await learnerWithCommunity(t, "member-l@example.com");
      expect((await learnerAuthorize(t, member.headers, MB)).status).toBe(201);
    } finally {
      await t.runtime.close();
    }
  });

  it("are allowed for a course learner who can post in the course's discussion", async () => {
    const t = await setup();
    try {
      const course = await dispatch(t.runtime, {
        method: "POST",
        path: "/v1/products",
        headers: ownerA(t),
        body: { kind: "course", title: "Discussed course" },
      });
      expect(course.status).toBe(201);
      const productId = (course.body as { id: string }).id;
      const discussions = await dispatch(t.runtime, {
        method: "PATCH",
        path: `/v1/products/${productId}`,
        headers: ownerA(t),
        body: { discussions: true },
      });
      expect(discussions.status).toBe(200);

      const learner = await learnerWithCommunity(t, "course-l@example.com", false);
      expect((await learnerAuthorize(t, learner.headers, MB)).status).toBe(403);
      await t.runtime.db.insert(schema.learnerMemberships).values({
        id: uuidv7(t.clock),
        publicId: "mbr_course_learner",
        schoolId: t.world.schoolA.id,
        schoolAccountId: learner.accountId,
        entityType: "product",
        entityId: productId,
        status: "active",
        createdAt: t.clock.now(),
        updatedAt: t.clock.now(),
      });
      expect((await learnerAuthorize(t, learner.headers, MB)).status).toBe(201);
    } finally {
      await t.runtime.close();
    }
  });

  it("are refused to a comment-only member who can see spaces but not post in them", async () => {
    const t = await setup();
    try {
      const [community] = await t.runtime.db
        .update(schema.communities)
        .set({ enabled: true })
        .where(eq(schema.communities.schoolId, t.world.schoolA.id))
        .returning();
      const learner = await learnerWithCommunity(t, "commenter-l@example.com", false);
      await t.runtime.db.insert(schema.learnerMemberships).values({
        id: uuidv7(t.clock),
        publicId: "mbr_commenter",
        schoolId: t.world.schoolA.id,
        schoolAccountId: learner.accountId,
        entityType: "community",
        entityId: community!.publicId,
        status: "active",
        role: "comment",
        createdAt: t.clock.now(),
        updatedAt: t.clock.now(),
      });
      const spaces = await dispatch(t.runtime, {
        method: "GET",
        path: "/v1/learner/spaces",
        headers: learner.headers,
      });
      const items = (spaces.body as { items: Array<{ canPost?: boolean }> }).items;
      expect(items.length).toBeGreaterThan(0);
      expect(items.every((item) => item.canPost === false)).toBe(true);
      expect((await learnerAuthorize(t, learner.headers, MB)).status).toBe(403);
    } finally {
      await t.runtime.close();
    }
  });

  it("are private, limited to safe types, and held to the learner's budget", async () => {
    const t = await setup();
    try {
      const member = await learnerWithCommunity(t, "budget-l@example.com");
      expect((await learnerAuthorize(t, member.headers, MB, "text/html")).status).toBe(400);
      const ok = await learnerAuthorize(t, member.headers, 60 * MB);
      expect(ok.status).toBe(201);
      const over = await learnerAuthorize(t, member.headers, 60 * MB);
      expect(over.status).toBe(403);
      expect(reason(over.body)).toBe("upload_not_allowed");
      const saved = await dispatch(t.runtime, {
        method: "POST",
        path: "/v1/learner/community-media",
        headers: member.headers,
        body: { uploadId: uploadIdOf(ok.body), altText: "", caption: "", accessPolicy: "public" },
      });
      expect(saved.status).toBe(201);
      expect((saved.body as { accessPolicy: string }).accessPolicy).toBe("private");

      // The owner raises the budget in settings.
      const raised = await dispatch(t.runtime, {
        method: "PATCH",
        path: `/v1/schools/${t.world.schoolA.publicId}`,
        headers: ownerA(t),
        body: { learnerUploadLimitBytes: 200 * MB },
      });
      expect(raised.status).toBe(200);
      expect((await learnerAuthorize(t, member.headers, 60 * MB)).status).toBe(201);
      const tooHigh = await dispatch(t.runtime, {
        method: "PATCH",
        path: `/v1/schools/${t.world.schoolA.publicId}`,
        headers: ownerA(t),
        body: { learnerUploadLimitBytes: 2048 * MB },
      });
      expect(tooHigh.status).toBe(400);
    } finally {
      await t.runtime.close();
    }
  });

  it(`are limited to ${LEARNER_UPLOADS_PER_HOUR} an hour`, async () => {
    const t = await setup();
    try {
      const member = await learnerWithCommunity(t, "rate-l@example.com");
      for (let index = 0; index < LEARNER_UPLOADS_PER_HOUR; index += 1) {
        const upload = await learnerAuthorize(t, member.headers, 1024);
        expect(upload.status).toBe(201);
        // Finished uploads still count toward the hour.
        if (index === 0) {
          const saved = await dispatch(t.runtime, {
            method: "POST",
            path: "/v1/learner/community-media",
            headers: member.headers,
            body: { uploadId: uploadIdOf(upload.body), altText: "", caption: "", accessPolicy: "private" },
          });
          expect(saved.status).toBe(201);
        }
      }
      expect((await learnerAuthorize(t, member.headers, 1024)).status).toBe(429);
    } finally {
      await t.runtime.close();
    }
  });

  it("are deleted a day later when no post uses them", async () => {
    const t = await setup();
    try {
      const member = await learnerWithCommunity(t, "sweep-l@example.com");
      const upload = await learnerAuthorize(t, member.headers, 1024);
      const saved = await dispatch(t.runtime, {
        method: "POST",
        path: "/v1/learner/community-media",
        headers: member.headers,
        body: { uploadId: uploadIdOf(upload.body), altText: "", caption: "", accessPolicy: "private" },
      });
      expect(saved.status).toBe(201);
      expect(await sweepUnusedLearnerUploads(t.runtime.db, t.mediaLit, t.clock)).toBe(0);
      const dayLater = freezeRuntimeClock(
        new Date(t.clock.now().getTime() + UNUSED_LEARNER_UPLOAD_MS + 60_000),
      );
      expect(await sweepUnusedLearnerUploads(t.runtime.db, t.mediaLit, dayLater)).toBe(1);
      const left = await t.runtime.db
        .select()
        .from(schema.media)
        .where(eq(schema.media.createdBySchoolAccountId, member.accountId));
      expect(left).toHaveLength(0);
    } finally {
      await t.runtime.close();
    }
  });
});
