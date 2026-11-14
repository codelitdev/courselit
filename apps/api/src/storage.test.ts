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
  storageRefusal,
  sweepUnusedLearnerUploads,
  UNUSED_LEARNER_UPLOAD_MS,
} from "./storage.js";

const MB = 1024 * 1024;

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

async function setup() {
  const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
  const mediaLit = new MemoryMediaLitClient(() => clock.now());
  const runtime = await createPgliteRuntime({ clock, billingMode: "cloud", mediaLit });
  const world = await seedWorld(runtime, clock);
  // School B gets a trial: 500 MB of storage.
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
      const first = await authorize(t, t.ownerB, 400 * MB);
      expect(first.status).toBe(201);
      const second = await authorize(t, t.ownerB, 200 * MB);
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
      const upload = await authorize(t, t.ownerB, 300 * MB);
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
        byteSize: 300 * MB,
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
        expect((await learnerAuthorize(t, member.headers, 1024)).status).toBe(201);
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
