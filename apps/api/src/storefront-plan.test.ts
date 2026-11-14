import { describe, expect, it } from "bun:test";
import { uuidv7 } from "@codelitdev/platform";
import { eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { dispatch } from "./dispatch.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { emailShowsCourseLitBadge, withCourseLitBadge } from "./school-emails.js";
import { seedWorld } from "./seed.js";
import { courseLitBadgeUrl } from "./storefront-plan.js";
import { signInLearner } from "./test-learner-auth.js";

async function setup() {
  const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
  const runtime = await createPgliteRuntime({ clock, billingMode: "cloud" });
  const world = await seedWorld(runtime, clock);
  return { clock, runtime, world };
}

type Setup = Awaited<ReturnType<typeof setup>>;

const settingsOf = async (t: Setup, publicId: string) =>
  (
    await dispatch(t.runtime, {
      method: "GET",
      path: `/v1/public/${publicId}/site/settings`,
      headers: {},
    })
  ).body as {
    codeInjectionHead: string;
    codeInjectionBody: string;
    ownerOnlyCodeInjection: boolean;
    courseLitBadgeUrl: string | null;
  };

const ownerOf = (t: Setup, publicId: string) => ({
  cookie: t.world.owner.sessionCookie,
  "x-school-id": publicId,
});

async function startTrial(t: Setup, schoolId: string) {
  const now = t.clock.now();
  await t.runtime.db.insert(schema.schoolTrials).values({
    id: uuidv7(t.clock),
    userId: "trial-user",
    normalizedEmail: "trial@example.com",
    schoolId,
    startedAt: now,
    endsAt: new Date(now.getTime() + 14 * 86_400_000),
  });
}

async function setCode(t: Setup, schoolId: string) {
  await t.runtime.db
    .update(schema.schools)
    .set({ codeInjectionHead: "<script>window.x=1</script>", codeInjectionBody: "" })
    .where(eq(schema.schools.id, schoolId));
}

async function learnerCookie(t: Setup, email: string, schoolPublicId: string) {
  const signedIn = await signInLearner(
    t.runtime.db,
    { email, schoolPublicId },
    t.clock,
    "req_test",
  );
  if (!signedIn.ok) throw new Error("sign-in failed");
  return `courselit.learner.session=${signedIn.token}`;
}

describe("the CourseLit badge", () => {
  it("links with nofollow-worthy attribution for the school", () => {
    const url = new URL(courseLitBadgeUrl("school-a"));
    expect(url.origin).toBe("https://courselit.app");
    expect(url.searchParams.get("utm_source")).toBe("school-a");
    expect(url.searchParams.get("utm_medium")).toBe("badge");
    expect(url.searchParams.get("utm_campaign")).toBe("powered_by");
  });

  it("shows on a paid school until the owner hides it", async () => {
    const t = await setup();
    try {
      // School A is on Pro in the seed.
      expect(
        (await settingsOf(t, t.world.schoolA.publicId)).courseLitBadgeUrl,
      ).toContain("utm_source=school-a");
      const hidden = await dispatch(t.runtime, {
        method: "PATCH",
        path: `/v1/schools/${t.world.schoolA.publicId}`,
        headers: ownerOf(t, t.world.schoolA.publicId),
        body: { hideCourseLitBranding: true },
      });
      expect(hidden.status).toBe(200);
      expect(
        (hidden.body as { hideCourseLitBranding: boolean }).hideCourseLitBranding,
      ).toBe(true);
      expect(
        (await settingsOf(t, t.world.schoolA.publicId)).courseLitBadgeUrl,
      ).toBeNull();
    } finally {
      await t.runtime.close();
    }
  });

  it("can't be hidden during a trial, and a hidden badge comes back when the plan lapses", async () => {
    const t = await setup();
    try {
      await startTrial(t, t.world.schoolB.id);
      const refused = await dispatch(t.runtime, {
        method: "PATCH",
        path: `/v1/schools/${t.world.schoolB.publicId}`,
        headers: ownerOf(t, t.world.schoolB.publicId),
        body: { hideCourseLitBranding: true },
      });
      expect(refused.status).toBe(403);
      expect((refused.body as { details?: { reason?: string } }).details?.reason).toBe(
        "plan_required",
      );
      // A setting saved earlier, on a plan that allowed it, is ignored now.
      await t.runtime.db
        .update(schema.schools)
        .set({ hideCourseLitBranding: true })
        .where(eq(schema.schools.id, t.world.schoolB.id));
      expect(
        (await settingsOf(t, t.world.schoolB.publicId)).courseLitBadgeUrl,
      ).not.toBeNull();
    } finally {
      await t.runtime.close();
    }
  });
});

describe("code injection during a trial (S25)", () => {
  it("is public on a paid plan", async () => {
    const t = await setup();
    try {
      await setCode(t, t.world.schoolA.id);
      const settings = await settingsOf(t, t.world.schoolA.publicId);
      expect(settings.codeInjectionHead).toContain("window.x");
      expect(settings.ownerOnlyCodeInjection).toBe(false);
    } finally {
      await t.runtime.close();
    }
  });

  it("stays off the public settings and reaches only the owner's own session", async () => {
    const t = await setup();
    try {
      await startTrial(t, t.world.schoolB.id);
      await setCode(t, t.world.schoolB.id);
      const settings = await settingsOf(t, t.world.schoolB.publicId);
      expect(settings.codeInjectionHead).toBe("");
      expect(settings.codeInjectionBody).toBe("");
      expect(settings.ownerOnlyCodeInjection).toBe(true);

      const fetchAs = async (cookie: string | null) =>
        dispatch(t.runtime, {
          method: "GET",
          path: "/v1/learner/site/code-injection",
          headers: {
            "x-school-id": t.world.schoolB.publicId,
            ...(cookie ? { cookie } : {}),
          },
        });
      const owner = await fetchAs(
        await learnerCookie(t, t.world.owner.email, t.world.schoolB.publicId),
      );
      expect(owner.status).toBe(200);
      expect((owner.body as { codeInjectionHead: string }).codeInjectionHead).toContain(
        "window.x",
      );
      const member = await fetchAs(
        await learnerCookie(t, t.world.member.email, t.world.schoolB.publicId),
      );
      expect(member.status).toBe(403);
      const learner = await fetchAs(
        await learnerCookie(t, "someone@example.com", t.world.schoolB.publicId),
      );
      expect(learner.status).toBe(403);
      expect((await fetchAs(null)).status).toBe(401);
    } finally {
      await t.runtime.close();
    }
  });

  it("says nothing is waiting when the trial school has no code", async () => {
    const t = await setup();
    try {
      await startTrial(t, t.world.schoolB.id);
      expect(
        (await settingsOf(t, t.world.schoolB.publicId)).ownerOnlyCodeInjection,
      ).toBe(false);
    } finally {
      await t.runtime.close();
    }
  });
});

describe("the badge on learner email", () => {
  it("shows unless the school hid it on a plan with remove_branding", () => {
    const paid = { kind: "paid", plan: "pro", status: "active" };
    const trial = { kind: "trial", endsAt: "2026-12-01T00:00:00.000Z" };
    expect(
      emailShowsCourseLitBadge({ hideCourseLitBranding: false, lastPlan: paid }),
    ).toBe(true);
    expect(
      emailShowsCourseLitBadge({ hideCourseLitBranding: true, lastPlan: paid }),
    ).toBe(false);
    expect(
      emailShowsCourseLitBadge({ hideCourseLitBranding: true, lastPlan: trial }),
    ).toBe(true);
    expect(
      emailShowsCourseLitBadge({ hideCourseLitBranding: true, lastPlan: null }),
    ).toBe(true);
  });

  it("goes at the end of the message with a nofollow link", () => {
    const email = withCourseLitBadge(
      {
        html: "<!doctype html><html><body><div><p>Hi</p></div></body></html>",
        text: "Hi",
      },
      "school-a",
    );
    expect(email.html).toContain('rel="nofollow"');
    expect(email.html).toContain("utm_source=school-a");
    expect(email.html.indexOf("Powered by")).toBeGreaterThan(email.html.indexOf("Hi"));
    expect(email.html).toEndWith("</div></body></html>");
    expect(email.text).toContain("Powered by CourseLit");
  });
});
