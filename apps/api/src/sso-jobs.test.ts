import { describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { cleanupSsoRequests } from "./learner-sso-sign-in.js";
import { freezeRuntimeClock } from "./runtime.js";
import { recheckSsoDomains, syncAllSsoPlanFeatures } from "./sso-jobs.js";
import { ssoSetup } from "./test-sso-flow.js";

const DAY = 24 * 60 * 60 * 1000;
const resolverFor = (records: Record<string, string[][]>) => ({
  resolveTxt: async (name: string) => records[name] ?? [],
  resolveCname: async () => [],
  resolve4: async () => [],
});
const domainRow = async (t: Awaited<ReturnType<typeof ssoSetup>>) =>
  (await t.runtime.db.select().from(schema.schoolSsoDomains))[0]!;

describe.serial("SSO background jobs", () => {
  it("clears a domain's verification only after three failed weekly checks in a row", async () => {
    const t = await ssoSetup();
    try {
      const resolver = resolverFor({});
      const runAt = async (days: number) => {
        const later = freezeRuntimeClock(new Date(t.clock.now().getTime() + days * DAY));
        return recheckSsoDomains(t.runtime.db, later, { resolver });
      };
      expect(await runAt(7)).toEqual({ checked: 1, unverified: 0 });
      expect((await domainRow(t)).consecutiveCheckFailures).toBe(1);
      expect((await domainRow(t)).verifiedAt).not.toBeNull();
      // Running again the same week doesn't count again.
      expect(await runAt(7.2)).toEqual({ checked: 0, unverified: 0 });
      expect((await domainRow(t)).consecutiveCheckFailures).toBe(1);
      expect(await runAt(14)).toEqual({ checked: 1, unverified: 0 });
      expect((await domainRow(t)).verifiedAt).not.toBeNull();
      expect(await runAt(21)).toEqual({ checked: 1, unverified: 1 });
      const lapsed = await domainRow(t);
      expect(lapsed.verifiedAt).toBeNull();
      expect(lapsed.consecutiveCheckFailures).toBe(3);
      const events = await t.runtime.db.select().from(schema.schoolSsoEvents);
      expect(events.some((event) => event.action === "domain.lapsed")).toBe(true);
      const mails = (await t.runtime.db.select().from(schema.integrationOutboxJobs)).filter(
        (job) => job.type === "send_system_email" || job.type === "send_school_email",
      );
      expect(mails.some((job) => (job.payload as { to: string }).to === "owner@example.com")).toBe(true);
      // A lapsed domain isn't checked again.
      expect(await runAt(28)).toEqual({ checked: 0, unverified: 0 });
    } finally {
      await t.close();
    }
  });

  it("a successful check resets the failure count", async () => {
    const t = await ssoSetup();
    try {
      const [row] = await t.runtime.db.select().from(schema.schoolSsoDomains);
      await t.runtime.db.update(schema.schoolSsoDomains).set({ consecutiveCheckFailures: 2 });
      const later = freezeRuntimeClock(new Date(t.clock.now().getTime() + 8 * DAY));
      const result = await recheckSsoDomains(t.runtime.db, later, {
        resolver: resolverFor({ "_courselit-verification.acme.com": [[row!.verificationToken]] }),
      });
      expect(result).toEqual({ checked: 1, unverified: 0 });
      const after = await domainRow(t);
      expect(after.consecutiveCheckFailures).toBe(0);
      expect(after.verifiedAt).not.toBeNull();
    } finally {
      await t.close();
    }
  });

  it("cleans up expired requests, test results and replay-cache rows only", async () => {
    const t = await ssoSetup();
    try {
      const now = t.clock.now();
      const base = {
        schoolId: t.world.schoolA.id,
        connectionId: t.connection.id,
        nonceDigest: "n",
        returnOrigin: "http://x",
        nextPath: "/",
        createdAt: now,
      };
      const ago = (ms: number) => new Date(now.getTime() - ms);
      await t.runtime.db.insert(schema.schoolSsoRequests).values([
        { ...base, id: crypto.randomUUID(), requestDigest: "expired", expiresAt: ago(1000) },
        { ...base, id: crypto.randomUUID(), requestDigest: "open", expiresAt: new Date(now.getTime() + 60_000) },
        { ...base, id: crypto.randomUUID(), requestDigest: "result-live", purpose: "test", expiresAt: ago(1000), testResult: { ok: true }, testResultExpiresAt: new Date(now.getTime() + 60_000) },
        { ...base, id: crypto.randomUUID(), requestDigest: "result-dead", purpose: "test", expiresAt: ago(1000), testResult: { ok: true }, testResultExpiresAt: ago(1000) },
      ]);
      await t.runtime.db.insert(schema.schoolSsoAssertionIds).values([
        { connectionId: t.connection.id, assertionId: "old", expiresAt: ago(1000) },
        { connectionId: t.connection.id, assertionId: "new", expiresAt: new Date(now.getTime() + 60_000) },
      ]);
      expect(await cleanupSsoRequests(t.runtime.db, t.clock)).toEqual({ requests: 2, assertionIds: 1 });
      const left = (await t.runtime.db.select().from(schema.schoolSsoRequests)).map((row) => row.requestDigest).sort();
      expect(left).toEqual(["open", "result-live"]);
      expect((await t.runtime.db.select().from(schema.schoolSsoAssertionIds)).map((row) => row.assertionId)).toEqual(["new"]);
    } finally {
      await t.close();
    }
  });

  it("the daily sync covers schools with active or suspended connections and survives a failing school", async () => {
    const t = await ssoSetup({ status: "suspended" });
    try {
      expect(await syncAllSsoPlanFeatures(t.runtime.db, t.runtime.billing.billing, t.clock)).toBe(1);
      expect((await t.runtime.db.select().from(schema.schoolSsoConnections))[0]!.status).toBe("active");
      // The real engine answers false when billing can't be read; a direct
      // state read throws.
      const failing = {
        hasFeature: async () => false,
        commercialState: async () => {
          throw new Error("billing down");
        },
      };
      const logged: unknown[] = [];
      expect(await syncAllSsoPlanFeatures(t.runtime.db, failing, t.clock, { warn: (...args: unknown[]) => logged.push(args) } as never)).toBe(0);
      expect(logged).toHaveLength(1);
      // The connection wasn't suspended by the failure.
      expect((await t.runtime.db.select().from(schema.schoolSsoConnections).where(eq(schema.schoolSsoConnections.id, t.connection.id)))[0]!.status).toBe("active");
      // Draft and disabled connections aren't synced.
      await t.runtime.db.update(schema.schoolSsoConnections).set({ status: "draft" });
      expect(await syncAllSsoPlanFeatures(t.runtime.db, t.runtime.billing.billing, t.clock)).toBe(0);
    } finally {
      await t.close();
    }
  });
});
