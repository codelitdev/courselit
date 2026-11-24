/**
 * Community plans' included products ("All products" or "Selected products").
 * A central offering: every scenario is named by its number in the owner's
 * checklist, so a failure says which promise broke. Each scenario checks
 * access (active product memberships, and the learner's product list) and
 * the mailing side (product-purchased events queued or not).
 */
import { describe, expect, it } from "bun:test";
import { uuidv7 } from "@codelitdev/platform";
import { and, eq } from "drizzle-orm";
import { includedProductsChanged, normalizeIncludedProducts } from "./community-plans.js";
import * as schema from "./db/schema/index.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { seedWorld } from "./seed.js";
import { processPlatformJobs } from "./sso-jobs.js";
import { dispatch } from "./test-learner-auth.js";
import { MemoryPaymentProvider } from "./test-payment-provider.js";
import { encryptIntegrationSecret } from "./utils/integration-secrets.js";

const quietLogger = { warn() {}, error() {}, info() {} } as never;

function learnerCookie(response: { headers?: Record<string, string> }) {
  const value = response.headers?.["Set-Cookie"];
  if (!value) throw new Error("missing_learner_cookie");
  return value.split(";", 1)[0]!;
}

describe("normalizeIncludedProducts (unit)", () => {
  it("[2] keeps no list for an all-products plan", () => {
    expect(
      normalizeIncludedProducts({ includesAllProducts: true, includedProducts: ["prd_a"] }),
    ).toEqual({ includesAllProducts: true, includedProducts: [] });
  });

  it("keeps a de-duplicated list otherwise", () => {
    expect(
      normalizeIncludedProducts({ includedProducts: ["prd_a", "prd_b", "prd_a"] }),
    ).toEqual({ includesAllProducts: false, includedProducts: ["prd_a", "prd_b"] });
    expect(normalizeIncludedProducts({})).toEqual({
      includesAllProducts: false,
      includedProducts: [],
    });
  });
});

describe("removal of the product-level includedWithCommunity flag", () => {
  it("[28] is gone from the contract and the products table", async () => {
    const { productSchema, updateProductBodySchema } = await import("@courselit/api-contract");
    expect(Object.keys(productSchema.shape)).not.toContain("includedWithCommunity");
    expect(Object.keys(updateProductBodySchema.shape)).not.toContain("includedWithCommunity");
    expect(Object.keys(schema.products)).not.toContain("includedWithCommunity");
    expect(Object.keys(schema.storefrontPlans)).toContain("includesAllProducts");
  });
});

describe("includedProductsChanged (unit)", () => {
  const list = (ids: string[]) => ({ includesAllProducts: false, includedProducts: ids });
  const all = { includesAllProducts: true, includedProducts: [] };
  it("spots switches between all and selected products", () => {
    expect(includedProductsChanged(list([]), all)).toBe(true);
    expect(includedProductsChanged(all, list([]))).toBe(true);
    expect(includedProductsChanged(all, all)).toBe(false);
  });
  it("compares lists as sets", () => {
    expect(includedProductsChanged(list(["a", "b"]), list(["b", "a"]))).toBe(false);
    expect(includedProductsChanged(list(["a"]), list(["a", "b"]))).toBe(true);
    expect(includedProductsChanged(list(["a", "b"]), list(["a"]))).toBe(true);
  });
});

type School = { id: string; publicId: string };
type Member = {
  school: School;
  headers: Record<string, string>;
  accountId: string;
  checkoutId: string;
};

async function setup() {
  const clock = freezeRuntimeClock(new Date("2026-03-10T00:00:00.000Z"));
  const runtime = await createPgliteRuntime({
    clock,
    paymentProvider: new MemoryPaymentProvider(),
  });
  const world = await seedWorld(runtime, clock);
  const now = clock.now();
  const communities = new Map<string, string>();
  for (const school of [world.schoolA, world.schoolB]) {
    // A mailing integration, so membership events are queued at all.
    await runtime.db.insert(schema.schoolIntegrations).values({
      id: uuidv7(clock),
      schoolId: school.id,
      provider: "sendlit",
      server: "http://mail.test",
      externalId: school.publicId,
      remoteTeamId: `team_${school.publicId}`,
      encryptedTeamKey: encryptIntegrationSecret("team_key"),
      status: "ready",
      createdAt: now,
      updatedAt: now,
    });
    const [community] = await runtime.db
      .select()
      .from(schema.communities)
      .where(eq(schema.communities.schoolId, school.id));
    await runtime.db
      .update(schema.communities)
      .set({ enabled: true, autoAcceptMembers: true })
      .where(eq(schema.communities.id, community!.id));
    communities.set(school.id, community!.publicId);
  }
  const A = world.schoolA;
  const adminHeaders = (school: School = A) => ({
    cookie: world.owner.sessionCookie,
    "x-school-id": school.publicId,
  });
  const communityId = (school: School = A) => communities.get(school.id)!;

  const setAutoAccept = (autoAcceptMembers: boolean, school: School = A) =>
    runtime.db
      .update(schema.communities)
      .set({ autoAcceptMembers })
      .where(eq(schema.communities.publicId, communityId(school)));

  const createProduct = async (title: string, published: boolean, school: School = A) => {
    const created = await dispatch(runtime, {
      method: "POST",
      path: "/v1/products",
      headers: adminHeaders(school),
      body: { title },
    });
    expect(created.status).toBe(201);
    const id = (created.body as { id: string }).id;
    if (published) {
      await runtime.db
        .update(schema.products)
        .set({ status: "published", publishedAt: clock.now() })
        .where(eq(schema.products.publicId, id));
    }
    return id;
  };

  const publish = async (productId: string, school: School = A) => {
    const response = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/products/${productId}`,
      headers: adminHeaders(school),
      body: { status: "published" },
    });
    expect(response.status).toBe(200);
  };

  type PlanDto = { id: string; includesAllProducts: boolean; includedProducts: string[] };
  const postPlan = (body: Record<string, unknown>, school: School = A) =>
    dispatch(runtime, {
      method: "POST",
      path: `/v1/communities/${communityId(school)}/plans`,
      headers: adminHeaders(school),
      body: { kind: "free", type: "free", ...body },
    });
  const createPlan = async (body: Record<string, unknown>, school: School = A) => {
    const plan = await postPlan(body, school);
    expect(plan.status).toBe(201);
    return plan.body as PlanDto;
  };
  const updatePlan = (planId: string, body: Record<string, unknown>, school: School = A) =>
    dispatch(runtime, {
      method: "PATCH",
      path: `/v1/community-plans/${planId}`,
      headers: adminHeaders(school),
      body,
    });

  let learners = 0;
  const signUp = async (school: School = A) => {
    learners += 1;
    const email = `member-${learners}@example.com`;
    const response = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/auth/sign-up",
      headers: { "x-school-id": school.publicId },
      body: {
        schoolId: school.publicId,
        email,
        password: "learner-password-1",
        name: `Member ${learners}`,
      },
    });
    expect(response.status).toBe(201);
    const [account] = await runtime.db
      .select({ id: schema.schoolAccounts.id })
      .from(schema.schoolAccounts)
      .where(
        and(
          eq(schema.schoolAccounts.schoolId, school.id),
          eq(schema.schoolAccounts.email, email),
        ),
      );
    return {
      school,
      headers: { cookie: learnerCookie(response), "x-school-id": school.publicId },
      accountId: account!.id,
    };
  };
  const join = async (
    planId: string,
    existing?: Omit<Member, "checkoutId">,
    school: School = existing?.school ?? A,
  ): Promise<Member> => {
    const member = existing ?? (await signUp(school));
    const joined = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/communities/${communityId(member.school)}/checkout`,
      headers: { ...member.headers, "idempotency-key": `join-${uuidv7(clock)}` },
      body: { planId, joiningReason: "I would like to join" },
    });
    expect(joined.status).toBe(201);
    return { ...member, checkoutId: (joined.body as { id: string }).id };
  };
  const leave = async (member: Member) => {
    const left = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/communities/${communityId(member.school)}/leave`,
      headers: member.headers,
      body: {},
    });
    expect(left.status).toBe(200);
  };

  const rows = (accountId: string) =>
    runtime.db
      .select()
      .from(schema.learnerMemberships)
      .where(eq(schema.learnerMemberships.schoolAccountId, accountId));
  const productRows = async (member: { accountId: string }) =>
    (await rows(member.accountId)).filter((row) => row.entityType === "product");
  const communityRow = async (member: { accountId: string }) =>
    (await rows(member.accountId)).find((row) => row.entityType === "community")!;
  /** Products the member has an active membership of. */
  const activeProducts = async (member: { accountId: string }) =>
    [
      ...new Set(
        (await productRows(member))
          .filter((row) => row.status === "active")
          .map((row) => row.entityId),
      ),
    ].sort();
  /** Products the learner's own product list shows: what they can open. */
  const learnerProducts = async (member: { headers: Record<string, string> }) => {
    const listed = await dispatch(runtime, {
      method: "GET",
      path: "/v1/learner/products",
      headers: member.headers,
    });
    expect(listed.status).toBe(200);
    return (listed.body as { items: Array<{ id: string }> }).items
      .map((item) => item.id)
      .sort();
  };
  /** "product purchased" events queued for the member. */
  const productEvents = async (member: { accountId: string }) =>
    (
      await runtime.db
        .select()
        .from(schema.integrationOutboxJobs)
        .where(eq(schema.integrationOutboxJobs.type, "track_sendlit_event"))
    )
      .map((job) => job.payload as {
        schoolAccountId: string;
        eventName: string;
        properties: { productId: string; includedInPlan: boolean };
      })
      .filter(
        (payload) =>
          payload.eventName === "product purchased" &&
          payload.schoolAccountId === member.accountId,
      );
  const allEvents = async () =>
    (
      await runtime.db
        .select()
        .from(schema.integrationOutboxJobs)
        .where(eq(schema.integrationOutboxJobs.type, "track_sendlit_event"))
    ).length;
  const syncJobs = () =>
    runtime.db
      .select()
      .from(schema.integrationOutboxJobs)
      .where(eq(schema.integrationOutboxJobs.type, "sync_plan_included_products"));
  const runJobs = () =>
    processPlatformJobs(runtime.db, runtime.billing.billing, clock, quietLogger);
  const webhook = (id: string, event: unknown) =>
    dispatch(runtime, {
      method: "POST",
      path: "/v1/storefront/webhooks/stripe",
      headers: { "stripe-event-id": id },
      rawBody: JSON.stringify(event),
    });
  const approve = (member: Member, status: "active" | "rejected") =>
    communityRow(member).then((row) =>
      dispatch(runtime, {
        method: "PATCH",
        path: `/v1/community-memberships/${row.publicId}`,
        headers: adminHeaders(member.school),
        body:
          status === "active" ? { status } : { status, rejectionReason: "Not a fit" },
      }),
    );
  const addLessonProgress = async (productId: string, membershipId: string) => {
    const [product] = await runtime.db
      .select()
      .from(schema.products)
      .where(eq(schema.products.publicId, productId));
    const lessonId = uuidv7(clock);
    await runtime.db.insert(schema.lessons).values({
      id: lessonId,
      publicId: `les_${lessonId.slice(-8)}`,
      schoolId: product!.schoolId,
      productId: product!.id,
      title: "Lesson one",
      createdAt: clock.now(),
      updatedAt: clock.now(),
    });
    await runtime.db.insert(schema.lessonProgress).values({
      id: uuidv7(clock),
      schoolId: product!.schoolId,
      membershipId,
      lessonId,
      startedAt: clock.now(),
      completedAt: clock.now(),
      createdAt: clock.now(),
    });
  };
  const progressOf = (membershipId: string) =>
    runtime.db
      .select()
      .from(schema.lessonProgress)
      .where(eq(schema.lessonProgress.membershipId, membershipId));
  const directPurchase = async (member: Member, productId: string) => {
    const now = clock.now();
    await runtime.db.insert(schema.learnerMemberships).values({
      id: uuidv7(clock),
      publicId: `lrm_direct_${uuidv7(clock).slice(-8)}`,
      schoolId: member.school.id,
      schoolAccountId: member.accountId,
      entityType: "product",
      entityId: productId,
      paymentPlanId: null,
      status: "active",
      isIncludedInPlan: false,
      joiningReason: "",
      createdAt: now,
      updatedAt: now,
    });
  };

  return {
    runtime,
    world,
    clock,
    A,
    B: world.schoolB,
    adminHeaders,
    communityId,
    setAutoAccept,
    createProduct,
    publish,
    postPlan,
    createPlan,
    updatePlan,
    signUp,
    join,
    leave,
    rows,
    productRows,
    communityRow,
    activeProducts,
    learnerProducts,
    productEvents,
    allEvents,
    syncJobs,
    runJobs,
    webhook,
    approve,
    addLessonProgress,
    progressOf,
    directPurchase,
  };
}

type T = Awaited<ReturnType<typeof setup>>;
async function withSetup(run: (t: T) => Promise<void>) {
  const t = await setup();
  try {
    await run(t);
  } finally {
    await t.runtime.close();
  }
}

const paidPlan = {
  kind: "subscription",
  type: "subscription",
  subscriptionMonthlyAmount: 10,
  amountMinor: 1000,
  billingInterval: "month",
};

describe.serial("community plans: configuration", () => {
  it("[1] creating an all-products plan stores no list and returns includesAllProducts", () =>
    withSetup(async (t) => {
      const plan = await t.createPlan({ name: "Everything", includesAllProducts: true });
      expect(plan).toMatchObject({ includesAllProducts: true, includedProducts: [] });
      const listed = await dispatch(t.runtime, {
        method: "GET",
        path: `/v1/communities/${t.communityId()}/plans`,
        headers: t.adminHeaders(),
      });
      expect((listed.body as { items: unknown[] }).items).toEqual([
        expect.objectContaining({ id: plan.id, includesAllProducts: true, includedProducts: [] }),
      ]);
      // The public listing has the flag and no product list.
      const publicPlans = await dispatch(t.runtime, {
        method: "GET",
        path: `/v1/public/${t.A.publicId}/communities/${t.communityId()}/plans`,
        headers: {},
      });
      expect((publicPlans.body as { items: unknown[] }).items[0]).toMatchObject({
        includesAllProducts: true,
        includedProducts: [],
        includedProductSummaries: [],
      });
      // A selected plan defaults to includesAllProducts false.
      const selected = await t.createPlan({ name: "None" });
      expect(selected).toMatchObject({ includesAllProducts: false, includedProducts: [] });
    }));

  it("[2] includesAllProducts with a non-empty list is normalised to an empty list, on create and update", () =>
    withSetup(async (t) => {
      const product = await t.createProduct("Listed", true);
      const created = await t.createPlan({
        name: "Everything",
        includesAllProducts: true,
        includedProducts: [product],
      });
      expect(created).toMatchObject({ includesAllProducts: true, includedProducts: [] });

      const selected = await t.createPlan({ name: "Picked", includedProducts: [product] });
      const updated = await t.updatePlan(selected.id, {
        includesAllProducts: true,
        includedProducts: [product],
      });
      expect(updated.status).toBe(200);
      expect(updated.body).toMatchObject({ includesAllProducts: true, includedProducts: [] });

      // Switching back to a selection without a list starts from none.
      const back = await t.updatePlan(selected.id, { includesAllProducts: false });
      expect(back.body).toMatchObject({ includesAllProducts: false, includedProducts: [] });
    }));

  it("[3] product plans reject includesAllProducts on create and update", () =>
    withSetup(async (t) => {
      const product = await t.createProduct("Course", true);
      const refused = await dispatch(t.runtime, {
        method: "POST",
        path: `/v1/products/${product}/plans`,
        headers: t.adminHeaders(),
        body: { name: "One-off", type: "onetime", oneTimeAmount: 10, includesAllProducts: true },
      });
      expect(refused.status).toBe(400);
      expect(refused.body).toMatchObject({
        details: { reason: "included_products_not_allowed" },
      });
      const created = await dispatch(t.runtime, {
        method: "POST",
        path: `/v1/products/${product}/plans`,
        headers: t.adminHeaders(),
        body: { name: "One-off", type: "onetime", oneTimeAmount: 10 },
      });
      expect(created.status).toBe(201);
      expect(created.body).toMatchObject({ includesAllProducts: false, includedProducts: [] });
      const update = await dispatch(t.runtime, {
        method: "PATCH",
        path: `/v1/plans/${(created.body as { id: string }).id}`,
        headers: t.adminHeaders(),
        body: { includesAllProducts: true },
      });
      expect(update.status).toBe(400);
      expect(update.body).toMatchObject({
        details: { reason: "included_products_not_allowed" },
      });
    }));

  it("[4] a selected list rejects unknown and other-school products, and accepts drafts as before", () =>
    withSetup(async (t) => {
      const foreign = await t.createProduct("Other school", true, t.B);
      const draft = await t.createProduct("Draft", false);
      for (const includedProducts of [["prd_missing"], [foreign]]) {
        const refused = await t.postPlan({ name: "Picked", includedProducts });
        expect(refused.status).toBe(400);
        expect(refused.body).toMatchObject({
          details: { reason: "invalid_included_products" },
        });
      }
      const plan = await t.createPlan({ name: "Picked" });
      const update = await t.updatePlan(plan.id, { includedProducts: [foreign] });
      expect(update.status).toBe(400);
      // Current behaviour: the API accepts a draft in the list (the admin
      // dropdown only offers published products); visitors never see it.
      const withDraft = await t.postPlan({ name: "Draft bonus", includedProducts: [draft] });
      expect(withDraft.status).toBe(201);
      expect(withDraft.body).toMatchObject({ includedProducts: [draft] });
    }));
});

describe.serial("community plans: granting", () => {
  it("[5][24] joining an all-products plan grants every published product, not drafts, and announces each", () =>
    withSetup(async (t) => {
      const first = await t.createProduct("First", true);
      const second = await t.createProduct("Second", true);
      await t.createProduct("Draft", false);
      const plan = await t.createPlan({ name: "Everything", includesAllProducts: true });
      const member = await t.join(plan.id);
      const community = await t.communityRow(member);
      expect(community.status).toBe("active");
      expect(await t.activeProducts(member)).toEqual([first, second].sort());
      expect(await t.learnerProducts(member)).toEqual([first, second].sort());
      for (const row of await t.productRows(member)) {
        expect(row).toMatchObject({
          status: "active",
          isIncludedInPlan: true,
          paymentPlanId: plan.id,
          parentMembershipId: community.id,
        });
      }
      const events = await t.productEvents(member);
      expect(events.map((event) => event.properties.productId).sort()).toEqual(
        [first, second].sort(),
      );
      expect(events.every((event) => event.properties.includedInPlan === true)).toBe(true);
    }));

  it("[6][24] joining a selected plan grants only the selected products", () =>
    withSetup(async (t) => {
      const picked = await t.createProduct("Picked", true);
      await t.createProduct("Not picked", true);
      const plan = await t.createPlan({ name: "Picked", includedProducts: [picked] });
      const member = await t.join(plan.id);
      expect(await t.activeProducts(member)).toEqual([picked]);
      expect(await t.learnerProducts(member)).toEqual([picked]);
      expect((await t.productEvents(member)).map((e) => e.properties.productId)).toEqual([
        picked,
      ]);
    }));

  it("[7] joining a plan with an empty selection grants no products", () =>
    withSetup(async (t) => {
      await t.createProduct("Published", true);
      const plan = await t.createPlan({ name: "Community only" });
      const member = await t.join(plan.id);
      expect((await t.communityRow(member)).status).toBe("active");
      expect(await t.productRows(member)).toEqual([]);
      expect(await t.learnerProducts(member)).toEqual([]);
      expect(await t.productEvents(member)).toEqual([]);
    }));

  it("[8][24] request-to-join: nothing while pending, products on approval, nothing on rejection", () =>
    withSetup(async (t) => {
      const product = await t.createProduct("Published", true);
      await t.setAutoAccept(false);
      for (const plan of [
        await t.createPlan({ name: "Everything", includesAllProducts: true }),
        await t.createPlan({ name: "Picked", includedProducts: [product] }),
      ]) {
        const approved = await t.join(plan.id);
        const rejected = await t.join(plan.id);
        for (const member of [approved, rejected]) {
          expect((await t.communityRow(member)).status).toBe("pending");
          expect(await t.productRows(member)).toEqual([]);
          expect(await t.productEvents(member)).toEqual([]);
        }
        expect((await t.approve(approved, "active")).status).toBe(200);
        expect(await t.activeProducts(approved)).toEqual([product]);
        expect(await t.learnerProducts(approved)).toEqual([product]);
        expect(await t.productEvents(approved)).toHaveLength(1);

        expect((await t.approve(rejected, "rejected")).status).toBe(200);
        expect(await t.productRows(rejected)).toEqual([]);
        expect(await t.learnerProducts(rejected)).toEqual([]);
        expect(await t.productEvents(rejected)).toEqual([]);
      }
    }));

  it("[9][24] a paid join grants included products only once the payment succeeds", () =>
    withSetup(async (t) => {
      const product = await t.createProduct("Published", true);
      const plan = await t.createPlan({
        name: "Monthly",
        ...paidPlan,
        providerProductId: "monthly-all",
        includesAllProducts: true,
      });
      const member = await t.join(plan.id);
      expect(await t.productRows(member)).toEqual([]);
      expect(await t.learnerProducts(member)).toEqual([]);
      expect(await t.productEvents(member)).toEqual([]);
      const paid = await t.webhook("paid-9", {
        type: "payment.succeeded",
        data: {
          payment_id: "payment-9",
          subscription_id: "sub-9",
          amount: 1000,
          currency: "USD",
          metadata: { courselit_community_checkout_id: member.checkoutId },
        },
      });
      expect(paid.status).toBe(200);
      expect(await t.activeProducts(member)).toEqual([product]);
      expect(await t.learnerProducts(member)).toEqual([product]);
      expect(await t.productEvents(member)).toHaveLength(1);
    }));

  it("[10][11][25] a product published later reaches only active members of all-products plans, in a background job, idempotently and silently", () =>
    withSetup(async (t) => {
      const existing = await t.createProduct("Existing", true);
      const later = await t.createProduct("Later", false);
      const everything = await t.createPlan({ name: "Everything", includesAllProducts: true });
      const picked = await t.createPlan({ name: "Picked", includedProducts: [existing] });

      const active = await t.join(everything.id);
      const selected = await t.join(picked.id);
      const expired = await t.join(everything.id);
      await t.leave(expired);
      const paused = await t.join(everything.id);
      await t.runtime.db
        .update(schema.learnerMemberships)
        .set({ status: "paused" })
        .where(eq(schema.learnerMemberships.id, (await t.communityRow(paused)).id));
      await t.setAutoAccept(false);
      const pending = await t.join(everything.id);
      const rejected = await t.join(everything.id);
      await t.approve(rejected, "rejected");
      // Another school's all-products member.
      await t.createProduct("B existing", true, t.B);
      const otherPlan = await t.createPlan(
        { name: "B everything", includesAllProducts: true },
        t.B,
      );
      const otherSchool = await t.join(otherPlan.id, undefined, t.B);
      expect(await t.activeProducts(otherSchool)).toHaveLength(1);

      const eventsBefore = await t.allEvents();
      await t.publish(later);
      // The publish only queued the fan-out.
      expect(await t.activeProducts(active)).toEqual([existing]);
      const queued = await t.syncJobs();
      expect(queued).toHaveLength(1);
      expect(queued[0]).toMatchObject({
        provider: "platform",
        schoolId: t.A.id,
        payload: { productId: later },
      });

      await t.runJobs();
      expect(await t.activeProducts(active)).toEqual([existing, later].sort());
      expect(await t.learnerProducts(active)).toEqual([existing, later].sort());
      const granted = (await t.productRows(active)).find((row) => row.entityId === later);
      expect(granted).toMatchObject({
        isIncludedInPlan: true,
        paymentPlanId: everything.id,
        parentMembershipId: (await t.communityRow(active)).id,
      });
      expect(await t.activeProducts(selected)).toEqual([existing]);
      for (const member of [expired, paused, pending, rejected]) {
        expect(await t.activeProducts(member)).not.toContain(later);
      }
      expect(await t.activeProducts(otherSchool)).not.toContain(later);
      // [25] the system added it on its own: no events.
      expect(await t.allEvents()).toBe(eventsBefore);

      // [11] running the job again changes nothing.
      await t.runtime.db
        .update(schema.integrationOutboxJobs)
        .set({ status: "pending" })
        .where(eq(schema.integrationOutboxJobs.id, queued[0]!.id));
      await t.runJobs();
      expect((await t.syncJobs())[0]?.status).toBe("done");
      expect(
        (await t.productRows(active)).filter((row) => row.entityId === later),
      ).toHaveLength(1);
      expect(await t.allEvents()).toBe(eventsBefore);
    }));

  it("[12] a product a member already has through the plan is not duplicated", () =>
    withSetup(async (t) => {
      const product = await t.createProduct("Published", true);
      const plan = await t.createPlan({ name: "Picked", includedProducts: [product] });
      const member = await t.join(plan.id);
      // Switching to all products, and republishing, keep one row per product.
      await t.updatePlan(plan.id, { includesAllProducts: true });
      await t.runJobs();
      await t.runtime.db
        .update(schema.products)
        .set({ status: "draft" })
        .where(eq(schema.products.publicId, product));
      await t.publish(product);
      await t.runJobs();
      const rows = await t.productRows(member);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ entityId: product, status: "active" });
      expect(await t.productEvents(member)).toHaveLength(1);
    }));
});

describe.serial("community plans: editing included products", () => {
  it("[13][25] switching selected to all grants the missing products to current members, silently", () =>
    withSetup(async (t) => {
      const first = await t.createProduct("First", true);
      const second = await t.createProduct("Second", true);
      await t.createProduct("Draft", false);
      const plan = await t.createPlan({ name: "Picked", includedProducts: [first] });
      const member = await t.join(plan.id);
      const firstRow = (await t.productRows(member))[0]!;
      const eventsBefore = await t.allEvents();

      // An edit that leaves the products alone queues nothing.
      expect((await t.updatePlan(plan.id, { name: "Renamed" })).status).toBe(200);
      expect(await t.syncJobs()).toHaveLength(0);

      expect((await t.updatePlan(plan.id, { includesAllProducts: true })).status).toBe(200);
      expect(await t.syncJobs()).toHaveLength(1);
      await t.runJobs();
      expect(await t.activeProducts(member)).toEqual([first, second].sort());
      expect(await t.learnerProducts(member)).toEqual([first, second].sort());
      expect((await t.productRows(member)).find((r) => r.entityId === first)?.id).toBe(
        firstRow.id,
      );
      expect(await t.allEvents()).toBe(eventsBefore);
    }));

  it("[14][25] switching all to selected revokes the rest and keeps the listed ones, silently", () =>
    withSetup(async (t) => {
      const kept = await t.createProduct("Kept", true);
      const dropped = await t.createProduct("Dropped", true);
      const plan = await t.createPlan({ name: "Everything", includesAllProducts: true });
      const member = await t.join(plan.id);
      expect(await t.activeProducts(member)).toEqual([kept, dropped].sort());
      const eventsBefore = await t.allEvents();

      await t.updatePlan(plan.id, { includesAllProducts: false, includedProducts: [kept] });
      await t.runJobs();
      expect(await t.activeProducts(member)).toEqual([kept]);
      expect(await t.learnerProducts(member)).toEqual([kept]);
      expect((await t.productRows(member)).find((r) => r.entityId === dropped)).toMatchObject({
        status: "expired",
        isIncludedInPlan: true,
      });
      expect(await t.allEvents()).toBe(eventsBefore);
    }));

  it("[15][25] adding a product to a selected list grants it to current members, silently", () =>
    withSetup(async (t) => {
      const first = await t.createProduct("First", true);
      const added = await t.createProduct("Added", true);
      const plan = await t.createPlan({ name: "Picked", includedProducts: [first] });
      const member = await t.join(plan.id);
      const eventsBefore = await t.allEvents();
      await t.updatePlan(plan.id, { includedProducts: [first, added] });
      await t.runJobs();
      expect(await t.activeProducts(member)).toEqual([first, added].sort());
      expect(await t.learnerProducts(member)).toEqual([first, added].sort());
      expect(await t.allEvents()).toBe(eventsBefore);
    }));

  it("[16][25] removing a product revokes only its plan-included rows; a direct purchase stays", () =>
    withSetup(async (t) => {
      const removed = await t.createProduct("Removed", true);
      const kept = await t.createProduct("Kept", true);
      const plan = await t.createPlan({ name: "Picked", includedProducts: [removed, kept] });
      const member = await t.join(plan.id);
      const buyer = await t.join(plan.id);
      await t.directPurchase(buyer, removed);
      const eventsBefore = await t.allEvents();

      await t.updatePlan(plan.id, { includedProducts: [kept] });
      await t.runJobs();
      expect(await t.activeProducts(member)).toEqual([kept]);
      expect(await t.learnerProducts(member)).toEqual([kept]);
      const buyerRows = (await t.productRows(buyer)).filter((r) => r.entityId === removed);
      expect(buyerRows.find((r) => r.isIncludedInPlan)?.status).toBe("expired");
      expect(buyerRows.find((r) => !r.isIncludedInPlan)?.status).toBe("active");
      expect(await t.learnerProducts(buyer)).toEqual([removed, kept].sort());
      expect(await t.allEvents()).toBe(eventsBefore);
    }));

  it("[17] re-adding a removed product reactivates the same row with earlier progress", () =>
    withSetup(async (t) => {
      const product = await t.createProduct("Course", true);
      const plan = await t.createPlan({ name: "Picked", includedProducts: [product] });
      const member = await t.join(plan.id);
      const row = (await t.productRows(member))[0]!;
      await t.addLessonProgress(product, row.id);

      await t.updatePlan(plan.id, { includedProducts: [] });
      await t.runJobs();
      expect(await t.activeProducts(member)).toEqual([]);
      expect(await t.learnerProducts(member)).toEqual([]);

      await t.updatePlan(plan.id, { includedProducts: [product] });
      await t.runJobs();
      const rows = await t.productRows(member);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ id: row.id, status: "active" });
      expect(await t.progressOf(row.id)).toHaveLength(1);
      expect(await t.learnerProducts(member)).toEqual([product]);
    }));

  it("[18] editing one plan leaves members of another plan of the community alone", () =>
    withSetup(async (t) => {
      const first = await t.createProduct("First", true);
      const second = await t.createProduct("Second", true);
      const edited = await t.createPlan({ name: "Edited", includedProducts: [first] });
      const other = await t.createPlan({ name: "Other", includedProducts: [first] });
      const editedMember = await t.join(edited.id);
      const otherMember = await t.join(other.id);
      await t.updatePlan(edited.id, { includedProducts: [second] });
      await t.runJobs();
      expect(await t.activeProducts(editedMember)).toEqual([second]);
      expect(await t.activeProducts(otherMember)).toEqual([first]);
      expect(await t.learnerProducts(otherMember)).toEqual([first]);
      await t.updatePlan(edited.id, { includesAllProducts: true });
      await t.runJobs();
      expect(await t.activeProducts(otherMember)).toEqual([first]);
    }));
});

describe.serial("community plans: lifecycle", () => {
  it("[19] leaving, subscription expiry and payment failure revoke included products of all-products and selected plans", () =>
    withSetup(async (t) => {
      const product = await t.createProduct("Published", true);
      const everything = await t.createPlan({
        name: "Everything",
        ...paidPlan,
        providerProductId: "monthly-all",
        includesAllProducts: true,
      });
      const picked = await t.createPlan({
        name: "Picked",
        ...paidPlan,
        subscriptionMonthlyAmount: 20,
        amountMinor: 2000,
        providerProductId: "monthly-picked",
        includedProducts: [product],
      });
      const freeAll = await t.createPlan({ name: "Free all", includesAllProducts: true });
      const paidMember = async (planId: string, n: string) => {
        const amount = planId === picked.id ? 2000 : 1000;
        const member = await t.join(planId);
        const paid = await t.webhook(`paid-${n}`, {
          type: "payment.succeeded",
          data: {
            payment_id: `payment-${n}`,
            subscription_id: `sub-${n}`,
            amount,
            currency: "USD",
            metadata: { courselit_community_checkout_id: member.checkoutId },
          },
        });
        expect(paid.status).toBe(200);
        expect(await t.learnerProducts(member)).toEqual([product]);
        return { member, subscription: `sub-${n}` };
      };
      const lapses: Array<[string, "subscription.expired" | "subscription.past_due"]> = [
        [everything.id, "subscription.expired"],
        [everything.id, "subscription.past_due"],
        [picked.id, "subscription.expired"],
        [picked.id, "subscription.past_due"],
      ];
      for (const [index, [planId, type]] of lapses.entries()) {
        const { member, subscription } = await paidMember(planId, String(index));
        const lapsed = await t.webhook(`lapse-${index}`, {
          type,
          data: { subscription_id: subscription },
        });
        expect(lapsed.status).toBe(200);
        expect(await t.activeProducts(member)).toEqual([]);
        expect(await t.learnerProducts(member)).toEqual([]);
        expect((await t.communityRow(member)).status).toBe(
          type === "subscription.expired" ? "expired" : "payment_failed",
        );
      }
      // Leaving (cancel) a free all-products plan.
      const leaver = await t.join(freeAll.id);
      expect(await t.learnerProducts(leaver)).toEqual([product]);
      await t.leave(leaver);
      expect(await t.activeProducts(leaver)).toEqual([]);
      expect(await t.learnerProducts(leaver)).toEqual([]);
    }));

  it("[20][24] rejoining reactivates the same included rows with progress intact", () =>
    withSetup(async (t) => {
      const product = await t.createProduct("Course", true);
      const plan = await t.createPlan({ name: "Everything", includesAllProducts: true });
      const member = await t.join(plan.id);
      const community = await t.communityRow(member);
      const row = (await t.productRows(member))[0]!;
      await t.addLessonProgress(product, row.id);
      await t.leave(member);
      expect(await t.learnerProducts(member)).toEqual([]);

      await t.join(plan.id, member);
      expect((await t.communityRow(member)).id).toBe(community.id);
      const rows = await t.productRows(member);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        id: row.id,
        status: "active",
        parentMembershipId: community.id,
      });
      expect(await t.progressOf(row.id)).toHaveLength(1);
      expect(await t.learnerProducts(member)).toEqual([product]);
      // Rejoining is the learner's own action: announced again.
      expect(await t.productEvents(member)).toHaveLength(2);
    }));

  it("[21] a direct purchase and an included row coexist; leaving keeps the direct one", () =>
    withSetup(async (t) => {
      const product = await t.createProduct("Course", true);
      const plan = await t.createPlan({ name: "Everything", includesAllProducts: true });
      const member = await t.join(plan.id);
      await t.directPurchase(member, product);
      const rows = await t.productRows(member);
      expect(rows.filter((r) => r.entityId === product)).toHaveLength(2);
      await t.leave(member);
      const after = await t.productRows(member);
      expect(after.find((r) => r.isIncludedInPlan)?.status).toBe("expired");
      expect(after.find((r) => !r.isIncludedInPlan)?.status).toBe("active");
      expect(await t.learnerProducts(member)).toEqual([product]);
    }));

  it("[22] unpublishing keeps granted access; deleting removes the product but not the plan's list", () =>
    withSetup(async (t) => {
      const unpublished = await t.createProduct("Unpublished", true);
      const deleted = await t.createProduct("Deleted", true);
      const plan = await t.createPlan({
        name: "Picked",
        includedProducts: [unpublished, deleted],
      });
      const member = await t.join(plan.id);
      expect(await t.activeProducts(member)).toEqual([unpublished, deleted].sort());

      const unpublish = await dispatch(t.runtime, {
        method: "PATCH",
        path: `/v1/products/${unpublished}`,
        headers: t.adminHeaders(),
        body: { status: "draft" },
      });
      expect(unpublish.status).toBe(200);
      // Current behaviour: nothing is revoked and no job is queued.
      expect(await t.syncJobs()).toHaveLength(0);
      expect(await t.activeProducts(member)).toContain(unpublished);

      const removed = await dispatch(t.runtime, {
        method: "DELETE",
        path: `/v1/products/${deleted}`,
        headers: t.adminHeaders(),
        body: {},
      });
      expect(removed.status).toBe(200);
      expect(await t.learnerProducts(member)).not.toContain(deleted);
      const [stored] = await t.runtime.db
        .select()
        .from(schema.storefrontPlans)
        .where(eq(schema.storefrontPlans.publicId, plan.id));
      expect(stored?.includedProducts).toEqual([unpublished, deleted]);
    }));

  it("[23] rejoining on a different plan moves the included products to the new plan's", () =>
    withSetup(async (t) => {
      const first = await t.createProduct("First", true);
      const second = await t.createProduct("Second", true);
      const firstPlan = await t.createPlan({ name: "First", includedProducts: [first] });
      const secondPlan = await t.createPlan({ name: "Second", includedProducts: [second] });
      const member = await t.join(firstPlan.id);
      expect(await t.activeProducts(member)).toEqual([first]);
      await t.leave(member);
      await t.join(secondPlan.id, member);
      expect((await t.communityRow(member)).paymentPlanId).toBe(secondPlan.id);
      expect(await t.activeProducts(member)).toEqual([second]);
      expect(await t.learnerProducts(member)).toEqual([second]);
      // Editing the old plan no longer reaches the member.
      await t.updatePlan(firstPlan.id, { includesAllProducts: true });
      await t.runJobs();
      expect(await t.activeProducts(member)).toEqual([second]);
    }));
});

describe.serial("community plans: further states and edges", () => {
  it("[29] payment failure removes included access and a recovered subscription brings the same rows back", () =>
    withSetup(async (t) => {
      const product = await t.createProduct("Course", true);
      const plan = await t.createPlan({
        name: "Monthly",
        ...paidPlan,
        providerProductId: "monthly-29",
        includesAllProducts: true,
      });
      const member = await t.join(plan.id);
      const metadata = { courselit_community_checkout_id: member.checkoutId };
      await t.webhook("paid-29", {
        type: "payment.succeeded",
        data: {
          payment_id: "payment-29",
          subscription_id: "sub-29",
          amount: 1000,
          currency: "USD",
          metadata,
        },
      });
      const row = (await t.productRows(member))[0]!;
      expect(await t.productEvents(member)).toHaveLength(1);

      await t.webhook("past-due-29", {
        type: "subscription.past_due",
        data: { subscription_id: "sub-29" },
      });
      expect((await t.communityRow(member)).status).toBe("payment_failed");
      expect(await t.activeProducts(member)).toEqual([]);
      expect(await t.learnerProducts(member)).toEqual([]);

      await t.webhook("recovered-29", {
        type: "subscription.active",
        data: { subscription_id: "sub-29" },
      });
      expect((await t.communityRow(member)).status).toBe("active");
      const rows = await t.productRows(member);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ id: row.id, status: "active" });
      expect(await t.learnerProducts(member)).toEqual([product]);
      // Current behaviour (a question for the owner): the recovery goes
      // through the same path as joining, so it is announced again, once per
      // product. Paying again is the learner's own action.
      expect(await t.productEvents(member)).toHaveLength(2);
    }));

  it("[29] a paused community membership (set only by imports; no API pauses one) keeps its included rows as they are, and the fan-out skips it", () =>
    withSetup(async (t) => {
      const product = await t.createProduct("Course", true);
      const later = await t.createProduct("Later", false);
      const plan = await t.createPlan({ name: "Everything", includesAllProducts: true });
      const member = await t.join(plan.id);
      await t.runtime.db
        .update(schema.learnerMemberships)
        .set({ status: "paused" })
        .where(eq(schema.learnerMemberships.id, (await t.communityRow(member)).id));
      // Current behaviour (flagged): access checks look at the product row
      // only, so a paused parent does not take the product away.
      expect(await t.activeProducts(member)).toEqual([product]);
      const eventsBefore = await t.allEvents();
      await t.publish(later);
      await t.runJobs();
      expect(await t.activeProducts(member)).toEqual([product]);
      expect(await t.allEvents()).toBe(eventsBefore);
    }));

  it("[30] unpublishing and republishing gives all-products members access again, once, without events", () =>
    withSetup(async (t) => {
      const product = await t.createProduct("Course", true);
      const plan = await t.createPlan({ name: "Everything", includesAllProducts: true });
      const member = await t.join(plan.id);
      const row = (await t.productRows(member))[0]!;
      const eventsBefore = await t.allEvents();
      const unpublish = await dispatch(t.runtime, {
        method: "PATCH",
        path: `/v1/products/${product}`,
        headers: t.adminHeaders(),
        body: { status: "draft" },
      });
      expect(unpublish.status).toBe(200);
      await t.publish(product);
      expect(await t.syncJobs()).toHaveLength(1);
      await t.runJobs();
      const rows = await t.productRows(member);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ id: row.id, status: "active" });
      expect(await t.learnerProducts(member)).toEqual([product]);
      expect(await t.allEvents()).toBe(eventsBefore);
    }));

  it("[31] all products covers every published kind: courses, downloads and free lead-magnet downloads", () =>
    withSetup(async (t) => {
      const course = await t.createProduct("Course", true);
      const created = await dispatch(t.runtime, {
        method: "POST",
        path: "/v1/products",
        headers: t.adminHeaders(),
        body: { title: "Checklist", kind: "download" },
      });
      const download = (created.body as { id: string }).id;
      const freePlan = await dispatch(t.runtime, {
        method: "POST",
        path: `/v1/products/${download}/plans`,
        headers: t.adminHeaders(),
        body: { name: "Free", type: "free" },
      });
      expect(freePlan.status).toBe(201);
      const leadMagnet = await dispatch(t.runtime, {
        method: "PATCH",
        path: `/v1/products/${download}`,
        headers: t.adminHeaders(),
        body: { leadMagnet: true, status: "published" },
      });
      expect(leadMagnet.status).toBe(200);
      const plan = await t.createPlan({ name: "Everything", includesAllProducts: true });
      const member = await t.join(plan.id);
      expect(await t.activeProducts(member)).toEqual([course, download].sort());
      expect(await t.learnerProducts(member)).toEqual([course, download].sort());
      expect(await t.productEvents(member)).toHaveLength(2);
    }));

  it("[32] archiving a plan keeps its members' included products and stops new joins; an archived all-products plan still receives products published later", () =>
    withSetup(async (t) => {
      const product = await t.createProduct("Course", true);
      const later = await t.createProduct("Later", false);
      await t.createPlan({ name: "Default" });
      const everything = await t.createPlan({ name: "Everything", includesAllProducts: true });
      const picked = await t.createPlan({ name: "Picked", includedProducts: [product] });
      const allMember = await t.join(everything.id);
      const pickedMember = await t.join(picked.id);
      for (const plan of [everything, picked]) {
        const archived = await dispatch(t.runtime, {
          method: "POST",
          path: `/v1/community-plans/${plan.id}/archive`,
          headers: t.adminHeaders(),
          body: {},
        });
        expect(archived.status).toBe(200);
      }
      const eventsBefore = await t.allEvents();
      expect(await t.learnerProducts(allMember)).toEqual([product]);
      expect(await t.learnerProducts(pickedMember)).toEqual([product]);
      // Nobody new joins on an archived plan.
      const newcomer = await t.signUp();
      const refused = await dispatch(t.runtime, {
        method: "POST",
        path: `/v1/learner/communities/${t.communityId()}/checkout`,
        headers: { ...newcomer.headers, "idempotency-key": "join-archived" },
        body: { planId: everything.id, joiningReason: "Hi" },
      });
      expect(refused.status).toBeGreaterThanOrEqual(400);
      expect(await t.productRows(newcomer)).toEqual([]);
      // Owner decision: archiving stops new joins, it doesn't downgrade
      // existing members, so a later product still reaches them (silently).
      // An archived plan doesn't count for publishing, so it has its own plan.
      const ownPlan = await dispatch(t.runtime, {
        method: "POST",
        path: `/v1/products/${later}/plans`,
        headers: t.adminHeaders(),
        body: { name: "Free", type: "free" },
      });
      expect(ownPlan.status).toBe(201);
      await t.publish(later);
      await t.runJobs();
      expect(await t.learnerProducts(allMember)).toEqual([product, later].sort());
      expect(await t.learnerProducts(pickedMember)).toEqual([product]);
      expect(await t.allEvents()).toBe(eventsBefore);
      // Archived plans can't be edited.
      expect((await t.updatePlan(everything.id, { includesAllProducts: false })).status).toBe(
        409,
      );
    }));

  it("[33] changing the default plan leaves existing members' included products alone", () =>
    withSetup(async (t) => {
      const product = await t.createProduct("Course", true);
      const first = await t.createPlan({ name: "Everything", includesAllProducts: true });
      const second = await t.createPlan({ name: "None" });
      const member = await t.join(first.id);
      const eventsBefore = await t.allEvents();
      const defaulted = await dispatch(t.runtime, {
        method: "POST",
        path: `/v1/community-plans/${second.id}/default`,
        headers: t.adminHeaders(),
        body: {},
      });
      expect(defaulted.status).toBe(200);
      expect(await t.syncJobs()).toHaveLength(0);
      expect(await t.learnerProducts(member)).toEqual([product]);
      expect(await t.allEvents()).toBe(eventsBefore);
    }));

  it("[34] switching the community off and on leaves included products as they are", () =>
    withSetup(async (t) => {
      const product = await t.createProduct("Course", true);
      const plan = await t.createPlan({ name: "Everything", includesAllProducts: true });
      const member = await t.join(plan.id);
      const toggle = (enabled: boolean) =>
        dispatch(t.runtime, {
          method: "PATCH",
          path: `/v1/communities/${t.communityId()}`,
          headers: t.adminHeaders(),
          body: { enabled },
        });
      expect((await toggle(false)).status).toBe(200);
      // Current behaviour (flagged): turning the community off does not take
      // the products away.
      expect(await t.learnerProducts(member)).toEqual([product]);
      expect((await toggle(true)).status).toBe(200);
      expect(await t.learnerProducts(member)).toEqual([product]);
      expect(await t.productRows(member)).toHaveLength(1);
    }));

  it("[35] staff removing a member revokes the included products; rejecting a request never creates them", () =>
    withSetup(async (t) => {
      const product = await t.createProduct("Course", true);
      const plan = await t.createPlan({ name: "Everything", includesAllProducts: true });
      const member = await t.join(plan.id);
      expect(await t.learnerProducts(member)).toEqual([product]);
      expect((await t.approve(member, "rejected")).status).toBe(200);
      expect(await t.activeProducts(member)).toEqual([]);
      expect(await t.learnerProducts(member)).toEqual([]);
      // Removal is not a purchase: no product events beyond the join's.
      expect(await t.productEvents(member)).toHaveLength(1);

      await t.setAutoAccept(false);
      const applicant = await t.join(plan.id);
      expect((await t.approve(applicant, "rejected")).status).toBe(200);
      expect(await t.productRows(applicant)).toEqual([]);
      expect(await t.productEvents(applicant)).toEqual([]);
    }));

  it("[36] deleting the learner's contact signs them out; their rows, included and direct alike, wait for the account's erasure", () =>
    withSetup(async (t) => {
      const product = await t.createProduct("Course", true);
      const plan = await t.createPlan({ name: "Everything", includesAllProducts: true });
      const member = await t.join(plan.id);
      await t.directPurchase(member, (await t.createProduct("Bought", true)));
      const [account] = await t.runtime.db
        .select({ publicId: schema.schoolAccounts.publicId })
        .from(schema.schoolAccounts)
        .where(eq(schema.schoolAccounts.id, member.accountId));
      const deleted = await dispatch(t.runtime, {
        method: "DELETE",
        path: `/v1/contacts/${account!.publicId}`,
        headers: t.adminHeaders(),
      });
      expect(deleted.status).toBe(200);
      const [pending] = await t.runtime.db
        .select({ status: schema.schoolAccounts.status })
        .from(schema.schoolAccounts)
        .where(eq(schema.schoolAccounts.id, member.accountId));
      expect(pending?.status).toBe("deletion_pending");
      // Current behaviour (flagged): while deletion is pending the learner is
      // signed out, but memberships (included and direct alike) stay as they
      // are until the account is erased.
      expect(await t.activeProducts(member)).toContain(product);
      expect(
        (
          await dispatch(t.runtime, {
            method: "GET",
            path: "/v1/learner/products",
            headers: member.headers,
          })
        ).status,
      ).toBe(401);
      // The included rows behave exactly like the direct one.
      expect((await t.productRows(member)).every((row) => row.status === "active")).toBe(true);
      // Erasure itself (the SendLit erase job deleting the school account,
      // whose memberships cascade) is out of scope here: see the report.
    }));

  it("[37] fan-out and reconcile never touch another school's products, plans or members", () =>
    withSetup(async (t) => {
      const productA = await t.createProduct("A course", true);
      const productB = await t.createProduct("B course", true, t.B);
      const planA = await t.createPlan({ name: "A plan", includedProducts: [productA] });
      const planB = await t.createPlan({ name: "B plan", includesAllProducts: true }, t.B);
      const memberA = await t.join(planA.id);
      const memberB = await t.join(planB.id, undefined, t.B);
      expect(await t.activeProducts(memberB)).toEqual([productB]);

      await t.updatePlan(planA.id, { includesAllProducts: true });
      const laterA = await t.createProduct("A later", false);
      await t.publish(laterA);
      await t.runJobs();
      expect(await t.activeProducts(memberA)).toEqual([productA, laterA].sort());
      expect(await t.activeProducts(memberB)).toEqual([productB]);

      // A school's plan can't be reached under another school's id.
      const crossed = await t.updatePlan(planB.id, { includesAllProducts: false });
      expect(crossed.status).toBe(404);
      const { runPlanIncludedProductsJob } = await import("./plan-included-products.js");
      expect(
        await runPlanIncludedProductsJob(t.runtime.db, t.A.id, { planId: planB.id }, t.clock),
      ).toEqual({ granted: 0, revoked: 0 });
      expect(
        await runPlanIncludedProductsJob(t.runtime.db, t.A.id, { productId: productB }, t.clock),
      ).toEqual({ granted: 0, revoked: 0 });
      expect(await t.activeProducts(memberB)).toEqual([productB]);
      expect(await t.activeProducts(memberA)).not.toContain(productB);
    }));

  it("[38] a member who joins between the publish and its job, or after the job, ends with the product once", () =>
    withSetup(async (t) => {
      const plan = await t.createPlan({ name: "Everything", includesAllProducts: true });
      const product = await t.createProduct("Course", false);
      await t.publish(product);
      // Joins before the queued job runs: the join already grants it.
      const early = await t.join(plan.id);
      expect(await t.activeProducts(early)).toEqual([product]);
      await t.runJobs();
      // Joins after the job ran.
      const late = await t.join(plan.id);
      for (const member of [early, late]) {
        const rows = await t.productRows(member);
        expect(rows).toHaveLength(1);
        expect(rows[0]?.status).toBe("active");
        expect(await t.productEvents(member)).toHaveLength(1);
      }
    }));

  it("[39] an included course gives the same enrolment and discussion space as a direct purchase", () =>
    withSetup(async (t) => {
      const product = await t.createProduct("Course", true);
      const plan = await t.createPlan({ name: "Everything", includesAllProducts: true });
      const discussions = await dispatch(t.runtime, {
        method: "PATCH",
        path: `/v1/products/${product}`,
        headers: t.adminHeaders(),
        body: { discussions: true },
      });
      expect(discussions.status).toBe(200);
      const [course] = await t.runtime.db
        .select({ discussionSpaceId: schema.products.discussionSpaceId })
        .from(schema.products)
        .where(eq(schema.products.publicId, product));
      const [space] = await t.runtime.db
        .select({ publicId: schema.spaces.publicId })
        .from(schema.spaces)
        .where(eq(schema.spaces.id, course!.discussionSpaceId!));
      const spaceId = space!.publicId;
      const included = await t.join(plan.id);
      const direct = { ...(await t.signUp()), checkoutId: "" };
      await t.directPurchase(direct, product);
      for (const member of [included, direct]) {
        const detail = await dispatch(t.runtime, {
          method: "GET",
          path: `/v1/public/${t.A.publicId}/products/${product}`,
          headers: member.headers,
        });
        expect(detail.status).toBe(200);
        expect(detail.body).toMatchObject({ enrolled: true, discussionSpaceId: spaceId });
        expect(await t.learnerProducts(member)).toEqual([product]);
      }
      const spaces = await dispatch(t.runtime, {
        method: "GET",
        path: "/v1/learner/spaces",
        headers: included.headers,
      });
      expect(
        (spaces.body as { items: Array<{ id: string }> }).items.map((space) => space.id),
      ).toContain(spaceId);
    }));

  it("[40] a direct purchase of a product later added to the selection: two rows, one access, no extra events", () =>
    withSetup(async (t) => {
      const first = await t.createProduct("First", true);
      const bought = await t.createProduct("Bought", true);
      const plan = await t.createPlan({ name: "Picked", includedProducts: [first] });
      const member = await t.join(plan.id);
      await t.directPurchase(member, bought);
      const eventsBefore = await t.allEvents();
      await t.updatePlan(plan.id, { includedProducts: [first, bought] });
      await t.runJobs();
      const rows = (await t.productRows(member)).filter((r) => r.entityId === bought);
      expect(rows).toHaveLength(2);
      expect(rows.every((r) => r.status === "active")).toBe(true);
      expect(await t.learnerProducts(member)).toEqual([first, bought].sort());
      expect(await t.allEvents()).toBe(eventsBefore);
    }));

  it("[41] publishing to 200 all-products members: the request only queues a job, which grants them all", () =>
    withSetup(async (t) => {
      const plan = await t.createPlan({ name: "Everything", includesAllProducts: true });
      const now = t.clock.now();
      const accounts: string[] = [];
      for (let i = 0; i < 200; i += 1) {
        const userId = `bulk-user-${i}`;
        const accountId = uuidv7(t.clock);
        accounts.push(accountId);
        await t.runtime.db.insert(schema.user).values({
          id: userId,
          name: `Bulk ${i}`,
          email: `bulk-${i}@example.com`,
          emailVerified: true,
          createdAt: now,
          updatedAt: now,
        });
        await t.runtime.db.insert(schema.schoolAccounts).values({
          id: accountId,
          publicId: `cnt_bulk_${i}`,
          schoolId: t.A.id,
          userId,
          email: `bulk-${i}@example.com`,
          displayName: `Bulk ${i}`,
          createdAt: now,
          updatedAt: now,
        });
        await t.runtime.db.insert(schema.learnerMemberships).values({
          id: uuidv7(t.clock),
          publicId: `lrm_bulk_${i}`,
          schoolId: t.A.id,
          schoolAccountId: accountId,
          entityType: "community",
          entityId: t.communityId(),
          paymentPlanId: plan.id,
          status: "active",
          role: "post",
          joiningReason: "",
          createdAt: now,
          updatedAt: now,
        });
      }
      const product = await t.createProduct("Course", false);
      const includedRows = async () =>
        (
          await t.runtime.db
            .select()
            .from(schema.learnerMemberships)
            .where(
              and(
                eq(schema.learnerMemberships.entityId, product),
                eq(schema.learnerMemberships.status, "active"),
              ),
            )
        ).length;
      const eventsBefore = await t.allEvents();
      await t.publish(product);
      expect(await includedRows()).toBe(0);
      expect(await t.syncJobs()).toHaveLength(1);
      await t.runJobs();
      expect(await includedRows()).toBe(200);
      expect(await t.allEvents()).toBe(eventsBefore);
    }), 120_000);

  it("[42] MCP create/update community plan tools normalise and validate includesAllProducts like REST", () =>
    withSetup(async (t) => {
      const product = await t.createProduct("Course", true);
      const mcpHeaders = {
        authorization: `Bearer ${t.world.owner.oauthToken}`,
        "x-school-id": t.A.publicId,
      };
      const tool = (name: string, args: Record<string, unknown>) =>
        dispatch(t.runtime, {
          method: "POST",
          path: "/mcp",
          headers: mcpHeaders,
          body: {
            jsonrpc: "2.0",
            id: 1,
            method: "tools/call",
            params: { name, arguments: args },
          },
        });
      type ToolBody = {
        result?: { isError?: boolean; structuredContent?: Record<string, unknown> };
      };
      const result = (response: { body: unknown }) => (response.body as ToolBody).result;

      const created = await tool("create_community_plan", {
        communityId: t.communityId(),
        name: "Everything",
        type: "free",
        includesAllProducts: true,
        includedProducts: [product],
      });
      expect(result(created)?.isError).toBeFalsy();
      expect(result(created)?.structuredContent).toMatchObject({
        includesAllProducts: true,
        includedProducts: [],
      });
      const planId = result(created)?.structuredContent?.id as string;

      // Updating changes members' access, so the tool asks for confirmation.
      const unconfirmed = await tool("update_community_plan", {
        planId,
        includesAllProducts: false,
        includedProducts: [product],
      });
      expect(result(unconfirmed)?.isError).toBe(true);
      expect(result(unconfirmed)?.structuredContent).toMatchObject({ code: "forbidden" });
      const updated = await tool("update_community_plan", {
        planId,
        includesAllProducts: false,
        includedProducts: [product],
        confirm: true,
      });
      expect(result(updated)?.structuredContent).toMatchObject({
        includesAllProducts: false,
        includedProducts: [product],
      });
      const unknown = await tool("update_community_plan", {
        planId,
        includedProducts: ["prd_missing"],
        confirm: true,
      });
      expect(result(unknown)?.structuredContent).toMatchObject({
        code: "validation_failed",
        details: { reason: "invalid_included_products" },
      });

      const productPlan = await tool("create_plan", {
        productId: product,
        name: "One-off",
        type: "onetime",
        oneTimeAmount: 10,
        includesAllProducts: true,
      });
      expect(result(productPlan)?.isError).toBe(true);
      expect(result(productPlan)?.structuredContent).toMatchObject({
        details: { reason: "included_products_not_allowed" },
      });
    }));
});
