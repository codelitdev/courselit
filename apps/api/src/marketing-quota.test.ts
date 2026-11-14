import { describe, expect, it } from "bun:test";
import { uuidv7 } from "@codelitdev/platform";
import { eq } from "drizzle-orm";
import { z } from "zod";
import * as schema from "./db/schema/index.js";
import { marketingQuotaFor, syncMarketingQuota } from "./marketing-quota.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { seedWorld } from "./seed.js";
import { provisionSendLitTeam, updateSendLitTeamQuota } from "./sendlit-client.js";

const config = { server: "http://sendlit.test", provisioningApiKey: "sl_org_key" };

describe("marketingQuotaFor", () => {
  it("follows the plan limits", () => {
    expect(marketingQuotaFor({ kind: "paid", plan: "pro", status: "active" })).toBe(10_000);
    expect(marketingQuotaFor({ kind: "paid", plan: "business", status: "active" })).toBe(50_000);
    expect(marketingQuotaFor({ kind: "trial", endsAt: new Date() })).toBe(0);
    expect(marketingQuotaFor({ kind: "none", reason: "expired" })).toBe(0);
    expect(marketingQuotaFor({ kind: "oss" })).toBeNull();
  });

  it("gives nothing to act on when billing can't be read", () => {
    expect(marketingQuotaFor({ kind: "unknown" })).toBeUndefined();
  });
});

async function setup(billingMode: "cloud" | "oss" = "cloud") {
  const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
  const runtime = await createPgliteRuntime({ clock, billingMode });
  const world = await seedWorld(runtime, clock);
  const now = clock.now();
  for (const [schoolId, teamId] of [
    [world.schoolA.id, "team_a"],
    [world.schoolB.id, "team_b"],
  ] as const) {
    await runtime.db
      .delete(schema.schoolIntegrations)
      .where(
        // Replace whatever the seed made with a ready team.
        eq(schema.schoolIntegrations.schoolId, schoolId),
      );
    await runtime.db.insert(schema.schoolIntegrations).values({
      id: uuidv7(clock),
      schoolId,
      provider: "sendlit",
      server: config.server,
      externalId: `ext_${teamId}`,
      remoteTeamId: teamId,
      status: "ready",
      createdAt: now,
      updatedAt: now,
    });
  }
  const calls: Array<{ teamId: string; monthlyLimit: number | null }> = [];
  const deps = {
    db: runtime.db,
    billing: runtime.billing.billing,
    mode: billingMode,
    clock,
    config,
    updateTeamQuota: (async (teamId: string, quota: { monthlyLimit: number | null }) => {
      calls.push({ teamId, monthlyLimit: quota.monthlyLimit });
    }) as typeof updateSendLitTeamQuota,
  };
  return { runtime, world, deps, calls };
}

describe("syncMarketingQuota", () => {
  it("sets a paid school's team to its plan's allowance and a school with no plan to 0", async () => {
    const { runtime, world, deps, calls } = await setup();
    expect(await syncMarketingQuota(deps, world.schoolA.id)).toBe("updated");
    expect(await syncMarketingQuota(deps, world.schoolB.id)).toBe("updated");
    expect(calls).toEqual([
      { teamId: "team_a", monthlyLimit: 10_000 },
      { teamId: "team_b", monthlyLimit: 0 },
    ]);
    await runtime.close();
  });

  it("sets unlimited in oss mode", async () => {
    const { runtime, world, deps, calls } = await setup("oss");
    await syncMarketingQuota(deps, world.schoolA.id);
    expect(calls).toEqual([{ teamId: "team_a", monthlyLimit: null }]);
    await runtime.close();
  });

  it("changes nothing and throws, so the job retries, when billing can't be read", async () => {
    const { runtime, world, deps, calls } = await setup();
    const failing = {
      ...deps,
      billing: {
        commercialState: async () => {
          throw new Error("billing down");
        },
      },
    };
    await expect(syncMarketingQuota(failing, world.schoolA.id)).rejects.toThrow(
      "billing_unavailable",
    );
    expect(calls).toEqual([]);
    await runtime.close();
  });

  it("skips a school whose SendLit team isn't ready, and skips when SendLit isn't configured", async () => {
    const { runtime, world, deps, calls } = await setup();
    await runtime.db
      .update(schema.schoolIntegrations)
      .set({ status: "provisioning" })
      .where(eq(schema.schoolIntegrations.schoolId, world.schoolA.id));
    expect(await syncMarketingQuota(deps, world.schoolA.id)).toBe("skipped");
    expect(
      await syncMarketingQuota({ ...deps, config: { server: "", provisioningApiKey: "" } }, world.schoolB.id),
    ).toBe("skipped");
    expect(calls).toEqual([]);
    await runtime.close();
  });
});

/**
 * A pinned copy of SendLit's quota schemas (sendlit
 * `packages/api-contract/src/schemas/teams.ts`), which is a private package.
 * SendLit's zod objects drop unknown keys, so a wrong field name is silently
 * ignored and the team ends up unlimited (S20). Update both sides together.
 */
const provisionQuota = z
  .object({
    dailyLimit: z.number().int().positive().nullable().optional(),
    monthlyLimit: z.number().int().positive().nullable().optional(),
  })
  .strict();
const updateQuota = z
  .object({
    dailyLimit: z.number().int().nonnegative().nullable().optional(),
    monthlyLimit: z.number().int().nonnegative().nullable().optional(),
  })
  .strict();

function capture() {
  const bodies: Array<{ method: string; path: string; body: Record<string, unknown> }> = [];
  const fetcher = (async (url: string | URL, init?: RequestInit) => {
    bodies.push({
      method: init?.method ?? "GET",
      path: new URL(String(url)).pathname,
      body: init?.body ? JSON.parse(String(init.body)) : {},
    });
    return new Response(
      JSON.stringify({ teamId: "t1", externalId: "e1", name: "n", created: true, apiKey: "k" }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }) as typeof fetch;
  return { bodies, fetcher };
}

describe("SendLit quota contract", () => {
  it("provisions with a quota SendLit accepts and understands", async () => {
    const { bodies, fetcher } = capture();
    await provisionSendLitTeam(
      { externalId: "e1", name: "School", quota: { monthlyLimit: 1 } },
      { config, fetcher },
    );
    expect(bodies[0]!.method).toBe("POST");
    expect(provisionQuota.parse(bodies[0]!.body.quota)).toEqual({ monthlyLimit: 1 });
    // 0 is refused at provisioning; it must be set with PATCH.
    expect(provisionQuota.safeParse({ monthlyLimit: 0 }).success).toBe(false);
  });

  it("sets 0 and unlimited with PATCH, using SendLit's field names", async () => {
    const { bodies, fetcher } = capture();
    await updateSendLitTeamQuota("t1", { monthlyLimit: 0 }, { config, fetcher });
    await updateSendLitTeamQuota("t1", { monthlyLimit: null }, { config, fetcher });
    expect(bodies.map((call) => `${call.method} ${call.path}`)).toEqual([
      "PATCH /provisioning/teams/t1",
      "PATCH /provisioning/teams/t1",
    ]);
    expect(updateQuota.parse(bodies[0]!.body.quota)).toEqual({ monthlyLimit: 0 });
    expect(updateQuota.parse(bodies[1]!.body.quota)).toEqual({ monthlyLimit: null });
  });
});
