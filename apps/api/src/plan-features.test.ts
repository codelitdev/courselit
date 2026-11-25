import { describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { uuidv7 } from "@codelitdev/platform";
import * as schema from "./db/schema/index.js";
import {
  enqueuePlanFeatureSync,
  planIncludesFeatureOrThrow,
  schoolHasFeature,
  syncPlanFeatures,
} from "./plan-features.js";
import { processPlatformJobs } from "./sso-jobs.js";
import { buyPlan, changePlan, changeSubscription } from "./test-billing-plan.js";
import { ssoSetup, type SsoSetup } from "./test-sso-flow.js";
import { dispatch } from "./dispatch.js";
import { ownerHeaders, ticketFrom } from "./test-sso-flow.js";
import { seedRealLearner } from "./test-sso.js";

const platformJobs = (t: SsoSetup) =>
  t.runtime.db.select().from(schema.integrationOutboxJobs).where(eq(schema.integrationOutboxJobs.provider, "platform"));
const statusOf = async (t: SsoSetup) =>
  (await t.runtime.db.select().from(schema.schoolSsoConnections))[0]!.status;
const quietLogger = { warn() {}, error() {}, info() {} } as never;

describe.serial("plan gating for learner SSO", () => {
  it("is available on Business, not on Pro or unpaid schools in cloud mode, and always in oss mode", async () => {
    const t = await ssoSetup({ billingMode: "cloud", noConnection: true });
    try {
      const billing = t.runtime.billing.billing;
      expect(await schoolHasFeature(billing, t.world.schoolA.id, "learner_sso")).toBe(false); // Pro
      expect(await schoolHasFeature(billing, t.world.schoolB.id, "learner_sso")).toBe(false); // no plan
      await buyPlan(t.runtime, t.world, t.world.schoolB.id, "business_month");
      expect(await schoolHasFeature(billing, t.world.schoolB.id, "learner_sso")).toBe(true);
      expect(await schoolHasFeature(billing, t.world.schoolB.id, "something_else")).toBe(false);
    } finally {
      await t.close();
    }
    const oss = await ssoSetup({ billingMode: "oss", noConnection: true });
    try {
      expect(await schoolHasFeature(oss.runtime.billing.billing, oss.world.schoolA.id, "learner_sso")).toBe(true);
    } finally {
      await oss.close();
    }
  });

  it("fails closed when billing can't answer and no last plan is known", async () => {
    const throwing = {
      hasFeature: async () => {
        throw new Error("down");
      },
      commercialState: async () => {
        throw new Error("down");
      },
    };
    expect(await schoolHasFeature(throwing, "x", "learner_sso")).toBe(false);
  });

  it("answers from the last confirmed plan while billing is down, so SSO keeps working (S10)", async () => {
    const t = await ssoSetup({ billingMode: "cloud", noConnection: true });
    try {
      const throwing = {
        hasFeature: async () => false,
        commercialState: async () => {
          throw new Error("down");
        },
      };
      const schoolId = t.world.schoolB.id;
      expect(await schoolHasFeature(throwing, schoolId, "learner_sso", t.runtime.db)).toBe(false);
      await t.runtime.db
        .update(schema.schools)
        .set({ lastPlan: { kind: "paid", plan: "business", status: "active" } })
        .where(eq(schema.schools.id, schoolId));
      expect(await schoolHasFeature(throwing, schoolId, "learner_sso", t.runtime.db)).toBe(true);
    } finally {
      await t.close();
    }
  });

  it("gives a running trial the Business features (S11)", async () => {
    const t = await ssoSetup({ billingMode: "cloud", noConnection: true });
    try {
      const schoolId = t.world.schoolB.id;
      const billing = t.runtime.billing.billing;
      const now = t.clock.now();
      expect(await schoolHasFeature(billing, schoolId, "learner_sso", t.runtime.db, now)).toBe(false);
      await t.runtime.db.insert(schema.schoolTrials).values({
        id: uuidv7(t.clock),
        userId: "trial-user",
        normalizedEmail: "trial@example.com",
        schoolId,
        startedAt: now,
        endsAt: new Date(now.getTime() + 14 * 86_400_000),
      });
      expect(await schoolHasFeature(billing, schoolId, "learner_sso", t.runtime.db, now)).toBe(true);
      expect(await schoolHasFeature(billing, schoolId, "remove_branding", t.runtime.db, now)).toBe(false);
      expect(
        await planIncludesFeatureOrThrow(billing, schoolId, "learner_sso", t.runtime.db, now),
      ).toBe(true);
    } finally {
      await t.close();
    }
  });

  it("only falls back to oss mode when BILLING_MODE=oss is set explicitly", async () => {
    const source = await Bun.file(new URL("./runtime.ts", import.meta.url)).text();
    expect(source).toContain('process.env.BILLING_MODE === "oss" ? "oss" : ("cloud" as const)');
  });

  it("queues a sync_plan_features job in the billing transaction on every projection", async () => {
    const t = await ssoSetup({ billingMode: "cloud", noConnection: true });
    try {
      const before = (await platformJobs(t)).length;
      const subscription = await buyPlan(t.runtime, t.world, t.world.schoolB.id, "business_month");
      const afterBuy = await platformJobs(t);
      expect(afterBuy.length).toBeGreaterThan(before);
      expect(afterBuy.every((job) => job.type === "sync_plan_features" && job.status === "pending")).toBe(true);
      expect(afterBuy.some((job) => job.schoolId === t.world.schoolB.id)).toBe(true);
      // Even a projection that changes nothing material queues one.
      const count = afterBuy.length;
      await changeSubscription(t.runtime, subscription, {});
      expect((await platformJobs(t)).length).toBeGreaterThan(count);
    } finally {
      await t.close();
    }
  });

  it("a failing sync never rolls back a billing write, and is retried", async () => {
    const t = await ssoSetup({ billingMode: "cloud", noConnection: true });
    try {
      const subscription = await buyPlan(t.runtime, t.world, t.world.schoolB.id, "business_month");
      // The billing write committed and the plan is Business.
      expect(await schoolHasFeature(t.runtime.billing.billing, t.world.schoolB.id, "learner_sso")).toBe(true);
      // The real engine answers false when it can't read state; only a direct
      // state read throws.
      const failing = {
        hasFeature: async () => false,
        commercialState: async () => {
          throw new Error("billing read failed");
        },
      };
      const jobs = await platformJobs(t);
      expect(jobs.length).toBeGreaterThan(0);
      // Run the job with a broken sync: it fails and goes back to pending.
      const { processNextPlatformJob } = await import("./integration-provisioning.js");
      await processNextPlatformJob(t.runtime.db, t.clock, quietLogger, async (job) => {
        await syncPlanFeatures(t.runtime.db, failing, job.schoolId, t.clock);
      });
      const retried = (await platformJobs(t)).filter((job) => job.attempts > 0);
      expect(retried).toHaveLength(1);
      expect(retried[0]!.status).toBe("pending");
      expect(retried[0]!.lastError).toContain("billing read failed");
      expect(await schoolHasFeature(t.runtime.billing.billing, t.world.schoolB.id, "learner_sso")).toBe(true);
      expect(subscription).toBeTruthy();
    } finally {
      await t.close();
    }
  });

  it("a hook insert for a billable entity that isn't a school does nothing and doesn't fail", async () => {
    const t = await ssoSetup({ billingMode: "cloud", noConnection: true });
    try {
      const before = (await platformJobs(t)).length;
      await enqueuePlanFeatureSync(t.runtime.db, crypto.randomUUID(), t.clock);
      expect((await platformJobs(t)).length).toBe(before);
    } finally {
      await t.close();
    }
  });

  it("suspends on downgrade, kills sessions, keeps enforcement from locking learners out, then restores", async () => {
    const t = await ssoSetup({ billingMode: "cloud", enforcement: "required_for_domains", status: "draft" });
    try {
      // School A: Pro -> Business, then activate the connection.
      await changePlan(t.runtime, t.world, t.world.schoolA.id, "business_month");
      expect(await schoolHasFeature(t.runtime.billing.billing, t.world.schoolA.id, "learner_sso")).toBe(true);
      const activate = await dispatch(t.runtime, {
        method: "POST",
        path: `/v1/sso/connections/${t.connection.publicId}/activate`,
        headers: ownerHeaders(t.world),
        body: {},
      });
      expect(activate.status).toBe(200);
      await processPlatformJobs(t.runtime.db, t.runtime.billing.billing, t.clock, quietLogger);
      expect(await statusOf(t)).toBe("active");

      // An SSO sign-in works, and its session exists.
      const { token, requestId } = await t.startSignIn();
      const ticket = ticketFrom((await t.acs(t.response(requestId!), token!)).headers.get("location"))!;
      expect((await t.redeem(ticket)).status).toBe(200);
      // A mid-flight sign-in that will outlive the downgrade.
      const midFlight = await t.startSignIn();

      // Downgrade: Pro again.
      await changePlan(t.runtime, t.world, t.world.schoolA.id, "pro_month");
      expect(await schoolHasFeature(t.runtime.billing.billing, t.world.schoolA.id, "learner_sso")).toBe(false);
      // The billing hook queued the sync; the connection is still active until it runs.
      expect(await statusOf(t)).toBe("active");
      // The plan check at the ACS refuses a ticket even before the sync.
      const refused = await t.acs(t.response(midFlight.requestId!), midFlight.token!);
      expect(ticketFrom(refused.headers.get("location"))).toBeNull();

      await processPlatformJobs(t.runtime.db, t.runtime.billing.billing, t.clock, quietLogger);
      expect(await statusOf(t)).toBe("suspended");
      expect(await t.runtime.db.select().from(schema.schoolSessions)).toHaveLength(0);
      const events = await t.runtime.db.select().from(schema.schoolSsoEvents);
      expect(events.some((event) => event.action === "connection.suspended")).toBe(true);
      const emails = (await t.runtime.db.select().from(schema.integrationOutboxJobs)).filter((job) => job.type === "send_system_email");
      expect(emails.some((job) => (job.payload as { subject: string }).subject.includes("suspended"))).toBe(true);
      // Enforcement is ignored while suspended: email-code sign-in for the SSO domain works.
      const learner = await seedRealLearner(t.runtime.db, t.clock, t.world.schoolA.publicId, "someone@acme.com");
      expect(learner.token).toBeTruthy();
      // Sign-in and the public methods don't offer SSO.
      expect((await t.startSignIn()).started.status).toBe(403);
      const methods = await dispatch(t.runtime, { method: "GET", path: `/v1/public/${t.world.schoolA.publicId}/login-methods`, headers: {} });
      expect((methods.body as { loginMethods: string[] }).loginMethods).not.toContain("sso");

      // Syncing again changes nothing (idempotent).
      expect(await syncPlanFeatures(t.runtime.db, t.runtime.billing.billing, t.world.schoolA.id, t.clock)).toEqual({ suspended: 0, restored: 0, drafted: 0 });

      // Back to Business: restored, and enforcement ends non-SSO sessions in its domains.
      await changePlan(t.runtime, t.world, t.world.schoolA.id, "business_month");
      await processPlatformJobs(t.runtime.db, t.runtime.billing.billing, t.clock, quietLogger);
      expect(await statusOf(t)).toBe("active");
      expect(await t.runtime.db.select().from(schema.schoolSessions)).toHaveLength(0);
    } finally {
      await t.close();
    }
  });

  it("goes to draft instead of active when a domain lapsed or the settings changed while suspended", async () => {
    const t = await ssoSetup({ billingMode: "oss", status: "suspended" });
    try {
      // oss mode has the feature, so the sync tries to restore it.
      await t.runtime.db.update(schema.schoolSsoDomains).set({ verifiedAt: null });
      const result = await syncPlanFeatures(t.runtime.db, t.runtime.billing.billing, t.world.schoolA.id, t.clock);
      expect(result).toEqual({ suspended: 0, restored: 0, drafted: 1 });
      expect(await statusOf(t)).toBe("draft");
      const emails = (await t.runtime.db.select().from(schema.integrationOutboxJobs)).filter((job) => job.type === "send_system_email");
      expect(emails.some((job) => (job.payload as { subject: string }).subject.includes("needs attention"))).toBe(true);
    } finally {
      await t.close();
    }
  });

  it("restores a suspended connection whose settings didn't change", async () => {
    const t = await ssoSetup({ billingMode: "oss", status: "suspended" });
    try {
      const result = await syncPlanFeatures(t.runtime.db, t.runtime.billing.billing, t.world.schoolA.id, t.clock);
      expect(result.restored).toBe(1);
      expect(await statusOf(t)).toBe("active");
    } finally {
      await t.close();
    }
  });

  it("a billing read failure in the sync throws instead of suspending anyone", async () => {
    const t = await ssoSetup({ billingMode: "oss" });
    try {
      await expect(
        syncPlanFeatures(
          t.runtime.db,
          {
            // What the real engine does when billing can't be read: hasFeature
            // fails closed, a direct state read throws.
            hasFeature: async () => false,
            commercialState: async () => {
              throw new Error("nope");
            },
          },
          t.world.schoolA.id,
          t.clock,
        ),
      ).rejects.toThrow("nope");
      expect(await statusOf(t)).toBe("active");
    } finally {
      await t.close();
    }
  });
});
