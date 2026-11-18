import { describe, expect, it } from "bun:test";
import { uuidv7 } from "@codelitdev/platform";
import { eq } from "drizzle-orm";
import { decodeAuditCursor, encodeAuditCursor } from "./audit-log.js";
import * as schema from "./db/schema/index.js";
import { dispatch } from "./dispatch.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { scormChangeNeedsPlan } from "./scorm-plan.js";
import { seedWorld } from "./seed.js";

async function setup(billingMode: "cloud" | "oss" = "cloud") {
  const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
  const runtime = await createPgliteRuntime({ clock, billingMode });
  const world = await seedWorld(runtime, clock);
  const owner = {
    cookie: world.owner.sessionCookie,
    "x-school-id": world.schoolA.publicId,
  };
  // A running trial includes SCORM and the audit log; School A is on Pro.
  const startTrial = async () => {
    const now = clock.now();
    await runtime.db.insert(schema.schoolTrials).values({
      id: uuidv7(clock),
      userId: "trial-user",
      normalizedEmail: "trial@example.com",
      schoolId: world.schoolA.id,
      startedAt: now,
      endsAt: new Date(now.getTime() + 14 * 86_400_000),
    });
  };
  const endTrial = () =>
    runtime.db
      .delete(schema.schoolTrials)
      .where(eq(schema.schoolTrials.schoolId, world.schoolA.id));
  return { clock, runtime, world, owner, startTrial, endTrial };
}

const reason = (body: unknown) =>
  (body as { details?: { reason?: string } }).details?.reason;

describe("scormChangeNeedsPlan", () => {
  it("covers new SCORM lessons and their packages, not other edits", () => {
    expect(scormChangeNeedsPlan({ kind: "create", type: "scorm" })).toBe(true);
    expect(scormChangeNeedsPlan({ kind: "create", type: "text" })).toBe(false);
    expect(scormChangeNeedsPlan({ kind: "process_package" })).toBe(true);
    expect(
      scormChangeNeedsPlan({ kind: "update", lessonType: "scorm", mediaId: "m" }),
    ).toBe(true);
    expect(
      scormChangeNeedsPlan({ kind: "update", lessonType: "scorm", content: {} }),
    ).toBe(true);
    expect(scormChangeNeedsPlan({ kind: "update", lessonType: "scorm" })).toBe(false);
    expect(
      scormChangeNeedsPlan({ kind: "update", lessonType: "video", mediaId: "m" }),
    ).toBe(false);
  });
});

describe("SCORM on the plan", () => {
  it("refuses new SCORM lessons and package changes without it, but existing ones keep working", async () => {
    const t = await setup();
    try {
      const create = (type: string) =>
        dispatch(t.runtime, {
          method: "POST",
          path: `/v1/products/${t.world.noteA.publicId}/lessons`,
          headers: t.owner,
          body: { title: `A ${type} lesson`, type },
        });
      const refused = await create("scorm");
      expect(refused.status).toBe(403);
      expect(reason(refused.body)).toBe("plan_required");
      expect((await create("text")).status).toBe(201);

      await t.startTrial();
      const made = await create("scorm");
      expect(made.status).toBe(201);
      const lessonId = (made.body as { id: string }).id;
      await t.endTrial();

      const patch = (body: Record<string, unknown>) =>
        dispatch(t.runtime, {
          method: "PATCH",
          path: `/v1/lessons/${lessonId}`,
          headers: t.owner,
          body,
        });
      expect((await patch({ title: "Renamed" })).status).toBe(200);
      const replace = await patch({ mediaId: "med_other" });
      expect(replace.status).toBe(403);
      expect(reason(replace.body)).toBe("plan_required");
      const process = await dispatch(t.runtime, {
        method: "POST",
        path: `/v1/lessons/${lessonId}/scorm/process`,
        headers: t.owner,
        body: { mediaId: "med_other" },
      });
      expect(process.status).toBe(403);
      expect(reason(process.body)).toBe("plan_required");
    } finally {
      await t.runtime.close();
    }
  });

  it("is always on in oss mode", async () => {
    const t = await setup("oss");
    try {
      const made = await dispatch(t.runtime, {
        method: "POST",
        path: `/v1/products/${t.world.noteA.publicId}/lessons`,
        headers: t.owner,
        body: { title: "SCORM", type: "scorm" },
      });
      expect(made.status).toBe(201);
    } finally {
      await t.runtime.close();
    }
  });
});

describe("plan features", () => {
  it("lists what the plan includes for anyone on the team", async () => {
    const t = await setup();
    try {
      const features = async () =>
        (
          (
            await dispatch(t.runtime, {
              method: "GET",
              path: "/v1/school/plan-features",
              headers: t.owner,
            })
          ).body as { features: string[] }
        ).features;
      expect((await features()).sort()).toEqual(["code_injection", "remove_branding"]);
      await t.startTrial();
      // A trial adds Business's features to what Pro already has.
      const trial = await features();
      expect(trial).toContain("scorm");
      expect(trial).toContain("audit_log");
      expect(trial).toContain("remove_branding");
    } finally {
      await t.runtime.close();
    }
  });
});

describe("the audit log", () => {
  it("is a Business feature", async () => {
    const t = await setup();
    try {
      const refused = await dispatch(t.runtime, {
        method: "GET",
        path: "/v1/school/audit-events",
        headers: t.owner,
      });
      expect(refused.status).toBe(403);
      expect(reason(refused.body)).toBe("plan_required");
    } finally {
      await t.runtime.close();
    }
  });

  it("lists events newest first, a page at a time, and shows billing events only to the owner's session", async () => {
    const t = await setup();
    try {
      await t.startTrial();
      await t.runtime.db.delete(schema.auditEvents);
      const at = (minutes: number) => new Date(Date.UTC(2026, 1, 1, 0, minutes));
      const event = (action: string, minutes: number, actorId = t.world.owner.id) => ({
        id: uuidv7(t.clock),
        schoolId: t.world.schoolA.id,
        actorId,
        action,
        resourceType: action.split(".")[0]!,
        resourceId: "res_1",
        requestId: "",
        createdAt: at(minutes),
      });
      await t.runtime.db
        .insert(schema.auditEvents)
        .values([
          event("product.created", 1),
          event("billing.checkout", 2),
          event("school.updated", 3, "system:billing"),
          { ...event("product.created", 4), schoolId: t.world.schoolB.id },
        ]);
      const list = (headers: Record<string, string>, query = "") =>
        dispatch(t.runtime, {
          method: "GET",
          path: `/v1/school/audit-events${query}`,
          headers,
        });
      type Page = {
        items: Array<{ action: string; actor: { kind: string; email: string | null } }>;
        nextCursor: string | null;
      };

      const owner = (await list(t.owner)).body as Page;
      expect(owner.items.map((item) => item.action)).toEqual([
        "school.updated",
        "billing.checkout",
        "product.created",
      ]);
      expect(owner.items[0]!.actor.kind).toBe("system");
      expect(owner.items[2]!.actor.email).toBe(t.world.owner.email);

      const apiKey = (await list({ "x-api-key": t.world.apiKeyA.raw })).body as Page;
      expect(apiKey.items.map((item) => item.action)).not.toContain("billing.checkout");

      const first = (await list(t.owner, "?limit=1")).body as Page;
      expect(first.items).toHaveLength(1);
      const second = (await list(t.owner, `?limit=1&cursor=${first.nextCursor}`))
        .body as Page;
      expect(second.items[0]!.action).toBe("billing.checkout");
      expect((await list(t.owner, "?cursor=nonsense")).status).toBe(400);
    } finally {
      await t.runtime.close();
    }
  });

  it("round-trips its cursor and rejects anything else", () => {
    const row = {
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      id: "01a1db30-506b-7fb2-9c24-fd7a969385c3",
    };
    expect(decodeAuditCursor(encodeAuditCursor(row))).toEqual(row);
    expect(decodeAuditCursor("bad")).toBeNull();
  });
});
