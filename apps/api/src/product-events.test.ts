import { afterEach, describe, expect, it } from "bun:test";
import { recordActivity } from "./activities.js";
import { ActivityType } from "./activity-types.js";
import * as schema from "./db/schema/index.js";
import { eq } from "drizzle-orm";
import { dispatch } from "./dispatch.js";
import {
  identifySchoolGroup,
  onboardingTransitionEvents,
  ProductEvent,
  productEventForActivity,
  signUpMethod,
  subscriptionTransitionEvents,
  trackProductEvent,
} from "./product-events.js";
import { TELEMETRY_PROPERTY_ALLOWLIST } from "./permissions.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { seedWorld } from "./seed.js";
import type { CaptureClient } from "@codelitdev/observability";
import { requestLearnerEmailCode } from "./learner-sign-in.js";
import {
  createCourseLitObservability,
  reportError,
  setTelemetrySink,
  type TelemetrySink,
} from "./telemetry.js";

type Captured = Parameters<TelemetrySink["captureEvent"]>[0];
type Group = Parameters<TelemetrySink["identifyGroup"]>[0];

function fakeSink() {
  const events: Captured[] = [];
  const groups: Group[] = [];
  const errors: unknown[] = [];
  const sink: TelemetrySink = {
    captureEvent: (input) => events.push(input),
    identifyGroup: (input) => groups.push(input),
    captureException: (input) => errors.push(input),
  };
  return { sink, events, groups, errors };
}

afterEach(() => setTelemetrySink(null));

describe("trackProductEvent", () => {
  it("sends nothing without a sink", () => {
    trackProductEvent({ event: ProductEvent.SIGNED_UP, userId: "u1" });
  });

  it("sends user events with the school group, never deduped", () => {
    const { sink, events } = fakeSink();
    setTelemetrySink(sink);
    trackProductEvent({
      event: ProductEvent.PRODUCT_PUBLISHED,
      userId: "u1",
      schoolId: "sch_1",
      properties: { product_type: "course", missing: undefined, empty: null },
      personProperties: { role: "owner" },
    });
    expect(events).toEqual([
      {
        event: "product_published",
        source: "product",
        subjectId: "u1",
        properties: { product_type: "course" },
        groups: { school: "sch_1" },
        personProperties: { role: "owner" },
        dedupe: false,
      },
    ]);
  });

  it("sends learner and webhook events under the school's subject", () => {
    const { sink, events } = fakeSink();
    setTelemetrySink(sink);
    trackProductEvent({
      event: ProductEvent.LEARNER_ENROLLED,
      schoolId: "sch_1",
      personProperties: { role: "ignored" },
    });
    trackProductEvent({ event: ProductEvent.LEARNER_ENROLLED });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      subjectId: "school_sch_1",
      groups: { school: "sch_1" },
    });
    // Personless events never link to groups in PostHog.
    expect(events[0]!.processPerson).toBeUndefined();
    expect(events[0]!.personProperties).toBeUndefined();
  });

  it("identifies the school group and skips a missing id", () => {
    const { sink, groups } = fakeSink();
    setTelemetrySink(sink);
    identifySchoolGroup("sch_1", { name: "Acme", plan: undefined });
    identifySchoolGroup(null, { name: "Nobody" });
    expect(groups).toEqual([
      {
        groupType: "school",
        groupKey: "sch_1",
        source: "product",
        properties: { name: "Acme" },
      },
    ]);
  });

  it("allowlists every property the events send", () => {
    for (const key of [
      "step",
      "status",
      "plan",
      "previous_plan",
      "interval",
      "offer_key",
      "product_type",
      "provider",
      "action",
      "method",
      "billing_mode",
      "currency",
      "amount_minor",
      "product_id",
      "name",
    ]) {
      expect(TELEMETRY_PROPERTY_ALLOWLIST.has(key)).toBe(true);
    }
  });
});

describe("onboardingTransitionEvents", () => {
  it("reports each step passed when moving forward", () => {
    expect(
      onboardingTransitionEvents(
        { step: "school", status: "in_progress" },
        { step: "build", status: "in_progress" },
      ),
    ).toEqual([
      { event: ProductEvent.ONBOARDING_STEP_COMPLETED, step: "school" },
      { event: ProductEvent.ONBOARDING_STEP_COMPLETED, step: "offer" },
    ]);
  });

  it("reports nothing for going back or staying put", () => {
    expect(
      onboardingTransitionEvents(
        { step: "email", status: "in_progress" },
        { step: "offer", status: "in_progress" },
      ),
    ).toEqual([]);
    expect(
      onboardingTransitionEvents(
        { step: "email", status: "in_progress" },
        { step: "email", status: "in_progress" },
      ),
    ).toEqual([]);
  });

  it("reports completion once", () => {
    expect(
      onboardingTransitionEvents(
        { step: "live", status: "in_progress" },
        { step: "live", status: "complete" },
      ),
    ).toEqual([{ event: ProductEvent.ONBOARDING_COMPLETED, step: "live" }]);
    expect(
      onboardingTransitionEvents(
        { step: "live", status: "complete" },
        { step: "live", status: "complete" },
      ),
    ).toEqual([]);
  });
});

describe("subscriptionTransitionEvents", () => {
  const base = {
    plan: "pro",
    interval: "month",
    offerKey: "pro_month",
    provider: "dodo",
    status: "active",
    cancelAtPeriodEnd: false,
  };

  it("starts and ends", () => {
    expect(subscriptionTransitionEvents(null, base)).toEqual([
      ProductEvent.SUBSCRIPTION_STARTED,
    ]);
    expect(subscriptionTransitionEvents({ ...base, status: "pending" }, base)).toEqual([
      ProductEvent.SUBSCRIPTION_STARTED,
    ]);
    expect(subscriptionTransitionEvents(base, { ...base, status: "expired" })).toEqual([
      ProductEvent.SUBSCRIPTION_ENDED,
    ]);
    expect(subscriptionTransitionEvents(null, { ...base, status: "pending" })).toEqual(
      [],
    );
  });

  it("switches, cancels and resumes", () => {
    expect(
      subscriptionTransitionEvents(base, {
        ...base,
        plan: "business",
        offerKey: "business_month",
      }),
    ).toEqual([ProductEvent.SUBSCRIPTION_SWITCHED]);
    expect(
      subscriptionTransitionEvents(base, { ...base, cancelAtPeriodEnd: true }),
    ).toEqual([ProductEvent.SUBSCRIPTION_CANCELLED]);
    expect(
      subscriptionTransitionEvents({ ...base, cancelAtPeriodEnd: true }, base),
    ).toEqual([ProductEvent.SUBSCRIPTION_RESUMED]);
  });

  it("is silent when a projection repeats", () => {
    expect(subscriptionTransitionEvents(base, { ...base })).toEqual([]);
  });
});

describe("mapping helpers", () => {
  it("forwards activation activity and skips high-volume activity", () => {
    expect(productEventForActivity(ActivityType.PURCHASED)).toBe(
      ProductEvent.LEARNER_PURCHASED,
    );
    expect(productEventForActivity(ActivityType.ENROLLED)).toBe(
      ProductEvent.LEARNER_ENROLLED,
    );
    expect(productEventForActivity(ActivityType.LESSON_COMPLETED)).toBeNull();
    expect(productEventForActivity(ActivityType.COMMUNITY_POST_LIKED)).toBeNull();
  });

  it("names the sign-up method from the auth path", () => {
    expect(signUpMethod("/sign-in/email-otp")).toBe("email_otp");
    expect(signUpMethod("/callback/google")).toBe("google");
    expect(signUpMethod(undefined)).toBe("other");
  });
});

describe("product events through the API", () => {
  it("tracks sign-up, school creation, onboarding and product publishing", async () => {
    const { sink, events, groups } = fakeSink();
    setTelemetrySink(sink);
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);

    const signUps = events.filter((event) => event.event === ProductEvent.SIGNED_UP);
    expect(signUps.map((event) => event.subjectId)).toContain(world.owner.id);
    expect(signUps[0]!.properties).toEqual({ method: "email_otp" });

    events.length = 0;
    const created = await dispatch(runtime, {
      method: "POST",
      path: "/v1/schools",
      headers: { cookie: world.owner.sessionCookie },
      body: { name: "Fresh School", subdomain: "fresh-school" },
    });
    expect(created.status).toBe(201);
    const schoolId = (created.body as { id: string }).id;
    expect(events).toContainEqual(
      expect.objectContaining({
        event: ProductEvent.SCHOOL_CREATED,
        subjectId: world.owner.id,
        groups: { school: schoolId },
      }),
    );
    expect(groups).toContainEqual(
      expect.objectContaining({
        groupKey: schoolId,
        properties: expect.objectContaining({ name: "Fresh School" }),
      }),
    );

    const headers = { cookie: world.owner.sessionCookie, "x-school-id": schoolId };
    events.length = 0;
    for (const body of [
      { step: "build" },
      { step: "offer" },
      { step: "live", status: "complete" },
    ]) {
      const response = await dispatch(runtime, {
        method: "PATCH",
        path: "/v1/school/onboarding",
        headers,
        body,
      });
      expect(response.status).toBe(200);
    }
    expect(events.map((event) => [event.event, event.properties?.step])).toEqual([
      [ProductEvent.ONBOARDING_STEP_COMPLETED, "school"],
      [ProductEvent.ONBOARDING_STEP_COMPLETED, "offer"],
      // Back from build to offer reports nothing; then offer to live.
      [ProductEvent.ONBOARDING_STEP_COMPLETED, "offer"],
      [ProductEvent.ONBOARDING_STEP_COMPLETED, "build"],
      [ProductEvent.ONBOARDING_STEP_COMPLETED, "brand"],
      [ProductEvent.ONBOARDING_STEP_COMPLETED, "email"],
      [ProductEvent.ONBOARDING_STEP_COMPLETED, "plan"],
      [ProductEvent.ONBOARDING_COMPLETED, "live"],
    ]);

    events.length = 0;
    const product = await dispatch(runtime, {
      method: "POST",
      path: "/v1/products",
      headers,
      body: { kind: "course", title: "First course", description: "" },
    });
    expect(product.status).toBe(201);
    const productId = (product.body as { id: string }).id;
    const plan = await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${productId}/plans`,
      headers,
      body: { name: "Free access", kind: "free" },
    });
    expect(plan.status).toBe(201);
    const published = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/products/${productId}`,
      headers,
      body: { status: "published" },
    });
    expect(published.status).toBe(200);
    expect(events.map((event) => event.event)).toEqual([
      ProductEvent.PRODUCT_CREATED,
      ProductEvent.PRODUCT_PUBLISHED,
    ]);
    expect(events[1]).toMatchObject({
      subjectId: world.owner.id,
      groups: { school: schoolId },
      properties: { product_type: "course", product_id: productId },
    });
  });
});

describe("learner activity and handled errors", () => {
  it("forwards new learner activity once, under the school", async () => {
    const { sink, events } = fakeSink();
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    const [school] = await runtime.db
      .select({ id: schema.schools.id })
      .from(schema.schools)
      .where(eq(schema.schools.publicId, world.schoolA.publicId));
    setTelemetrySink(sink);
    const purchase = {
      schoolId: school!.id,
      actorId: "acct_1",
      type: ActivityType.PURCHASED,
      entityId: "prd_1",
      metadata: { amountMinor: 4900, currency: "USD", email: "ada@example.com" },
    };
    await recordActivity(runtime.db, purchase, clock);
    await recordActivity(runtime.db, purchase, clock);
    await recordActivity(
      runtime.db,
      {
        schoolId: school!.id,
        actorId: "acct_1",
        type: ActivityType.LESSON_COMPLETED,
        entityId: "l1",
      },
      clock,
    );
    expect(events).toEqual([
      {
        event: ProductEvent.LEARNER_PURCHASED,
        source: "product",
        subjectId: `school_${world.schoolA.publicId}`,
        properties: { currency: "USD", amount_minor: 4900 },
        groups: { school: world.schoolA.publicId },
        dedupe: false,
      },
    ]);
  });

  it("reports handled errors and never throws", () => {
    const { sink, errors } = fakeSink();
    reportError(new Error("before sink"), "test");
    setTelemetrySink(sink);
    reportError(new Error("boom"), "worker.integration_job", { kind: "provision" });
    expect(errors).toEqual([
      {
        error: expect.any(Error),
        source: "worker.integration_job",
        context: { kind: "provision" },
      },
    ]);
    setTelemetrySink({
      ...sink,
      captureException: () => {
        throw new Error("sink down");
      },
    });
    expect(() => reportError(new Error("x"), "test")).not.toThrow();
  });
});

describe("people in PostHog", () => {
  it("counts a learner's requests under the school, not as their own person", async () => {
    const captured: Array<{
      event: string;
      distinctId: string;
      properties: Record<string, unknown>;
    }> = [];
    const client: CaptureClient = {
      capture: (input) => captured.push(input),
      captureException: () => {},
      shutdown: async () => {},
    };
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({
      clock,
      observability: createCourseLitObservability(
        "courselit-api",
        { POSTHOG_API_KEY: "phc_test", LOG_LEVEL: "silent" },
        { client },
      ),
    });
    const world = await seedWorld(runtime, clock);
    const sent: string[] = [];
    const email = "learner-telemetry@example.com";
    await requestLearnerEmailCode(
      runtime.db,
      { schoolPublicId: world.schoolA.publicId, email },
      clock,
      async (message) => {
        sent.push(message.otp);
      },
    );
    captured.length = 0;
    const signedIn = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/auth/email-code/verify",
      headers: { "x-school-id": world.schoolA.publicId },
      body: { email, code: sent[0] },
    });
    expect(signedIn.status).toBe(200);
    const context = captured.filter((event) => event.event === "request.context");
    expect(context).toHaveLength(1);
    expect(context[0]).toMatchObject({
      distinctId: `school_${world.schoolA.publicId}`,
      properties: { $groups: { school: world.schoolA.publicId } },
    });
    // Personless events never link to groups in PostHog.
    expect(context[0]!.properties.$process_person_profile).toBeUndefined();
    await runtime.close();
  });

  it("reports a product published once when two publishes race", async () => {
    const { sink, events } = fakeSink();
    setTelemetrySink(sink);
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    const headers = {
      cookie: world.owner.sessionCookie,
      "x-school-id": world.schoolA.publicId,
    };
    const product = await dispatch(runtime, {
      method: "POST",
      path: "/v1/products",
      headers,
      body: { kind: "course", title: "Raced course" },
    });
    const productId = (product.body as { id: string }).id;
    await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${productId}/plans`,
      headers,
      body: { name: "Free access", kind: "free" },
    });
    events.length = 0;
    const publish = () =>
      dispatch(runtime, {
        method: "PATCH",
        path: `/v1/products/${productId}`,
        headers,
        body: { status: "published" },
      });
    const results = await Promise.all([publish(), publish()]);
    expect(results.map((result) => result.status)).toEqual([200, 200]);
    expect(
      events.filter((event) => event.event === ProductEvent.PRODUCT_PUBLISHED),
    ).toHaveLength(1);
    await runtime.close();
  });
});
