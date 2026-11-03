import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { uuidv7 } from "@codelitdev/platform";
import { and, eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { processNextSystemEmailJob } from "./integration-provisioning.js";
import { createPgliteRuntime, freezeRuntimeClock, type Runtime } from "./runtime.js";
import type { SendSchoolEmailPayload } from "./school-emails.js";
import { type SeededWorld, seedWorld } from "./seed.js";
import type { SystemMailMessage } from "./system-mail.js";
import { dispatch } from "./test-learner-auth.js";
import { MemoryPaymentProvider } from "./test-payment-provider.js";
import { encryptIntegrationSecret } from "./utils/integration-secrets.js";

const RETURN_URL = "http://localhost:3000/checkout/complete";

type Setup = Awaited<ReturnType<typeof setUp>>;

async function setUp(
  options: { kind?: "course" | "download"; mailingTeam?: boolean } = {},
) {
  process.env.AUTH_SECRET ??= "integration-test-auth-secret";
  const clock = freezeRuntimeClock(new Date("2026-04-01T00:00:00.000Z"));
  const provider = new MemoryPaymentProvider();
  const runtime = await createPgliteRuntime({ clock, paymentProvider: provider });
  const world = await seedWorld(runtime, clock);
  if (options.mailingTeam) {
    const now = clock.now();
    await runtime.db.insert(schema.schoolIntegrations).values({
      id: uuidv7(clock),
      schoolId: world.schoolA.id,
      provider: "sendlit",
      server: "http://mail.test",
      externalId: world.schoolA.publicId,
      remoteTeamId: "team_a",
      encryptedTeamKey: encryptIntegrationSecret("team_key"),
      status: "ready",
      createdAt: now,
      updatedAt: now,
    });
  }
  const adminHeaders = {
    cookie: world.owner.sessionCookie,
    "x-school-id": world.schoolA.publicId,
  };
  const product = await dispatch(runtime, {
    method: "POST",
    path: "/v1/products",
    headers: adminHeaders,
    body: {
      kind: options.kind ?? "course",
      title: options.kind === "download" ? "Starter kit" : "Paid course",
      description: "",
    },
  });
  expect(product.status).toBe(201);
  const productId = (product.body as { id: string }).id;
  const freePlan = await dispatch(runtime, {
    method: "POST",
    path: `/v1/products/${productId}/plans`,
    headers: adminHeaders,
    body: { name: "Free access", kind: "free", amountMinor: 0 },
  });
  expect(freePlan.status).toBe(201);
  const published = await dispatch(runtime, {
    method: "PATCH",
    path: `/v1/products/${productId}`,
    headers: adminHeaders,
    body: { status: "published" },
  });
  expect(published.status).toBe(200);
  const paidPlan = await dispatch(runtime, {
    method: "POST",
    path: `/v1/products/${productId}/plans`,
    headers: adminHeaders,
    body: {
      name: "Lifetime",
      kind: "one_time",
      amountMinor: 2500,
      providerProductId: "pdt_paid",
    },
  });
  expect(paidPlan.status).toBe(201);
  return {
    clock,
    provider,
    runtime,
    world,
    adminHeaders,
    productId,
    freePlanId: (freePlan.body as { id: string }).id,
    paidPlanId: (paidPlan.body as { id: string }).id,
  };
}

async function signUp(runtime: Runtime, world: SeededWorld, email: string) {
  const response = await dispatch(runtime, {
    method: "POST",
    path: "/v1/learner/auth/sign-up",
    headers: {},
    body: {
      schoolId: world.schoolA.publicId,
      email,
      password: "learner-password-1",
      name: email.split("@")[0],
    },
  });
  expect(response.status).toBe(201);
  return {
    cookie: (response.headers?.["Set-Cookie"] ?? "").split(";", 1)[0]!,
    "x-school-id": world.schoolA.publicId,
  };
}

let idempotency = 0;
function checkout(runtime: Runtime, learner: Record<string, string>, planId: string) {
  idempotency += 1;
  return dispatch(runtime, {
    method: "POST",
    path: "/v1/learner/checkout",
    headers: { ...learner, "idempotency-key": `checkout-${idempotency}` },
    body: { planId, returnUrl: RETURN_URL },
  });
}

function webhook(
  runtime: Runtime,
  eventId: string,
  event: { type: string; data: Record<string, unknown> },
) {
  return dispatch(runtime, {
    method: "POST",
    path: "/v1/storefront/webhooks/stripe",
    headers: { "stripe-event-id": eventId },
    rawBody: JSON.stringify(event),
  });
}

function paid(checkoutId: string, paymentId: string, amount = 2500) {
  return {
    type: "payment.succeeded",
    data: {
      payment_id: paymentId,
      amount,
      currency: "USD",
      metadata: { courselit_checkout_id: checkoutId },
    },
  };
}

/** Buys the paid plan and confirms the payment, as the provider would. */
async function buy(setup: Setup, learner: Record<string, string>, paymentId: string) {
  const started = await checkout(setup.runtime, learner, setup.paidPlanId);
  expect(started.status).toBe(201);
  const checkoutId = (started.body as { id: string }).id;
  const received = await webhook(
    setup.runtime,
    `evt-${paymentId}`,
    paid(checkoutId, paymentId),
  );
  expect(received.status).toBe(200);
  return checkoutId;
}

async function productMembership(setup: Setup, email: string) {
  const [row] = await setup.runtime.db
    .select({ status: schema.learnerMemberships.status })
    .from(schema.learnerMemberships)
    .innerJoin(
      schema.schoolAccounts,
      eq(schema.schoolAccounts.id, schema.learnerMemberships.schoolAccountId),
    )
    .where(
      and(
        eq(schema.schoolAccounts.email, email),
        eq(schema.learnerMemberships.entityType, "product"),
        eq(schema.learnerMemberships.entityId, setup.productId),
      ),
    );
  return row?.status ?? null;
}

async function emailJobs(runtime: Runtime) {
  const jobs = await runtime.db.select().from(schema.integrationOutboxJobs);
  return jobs
    .filter(
      (job) => job.type === "send_school_email" || job.type === "send_system_email",
    )
    .map((job) => ({
      provider: job.provider,
      type: job.type,
      payload: job.payload as SendSchoolEmailPayload,
    }));
}

async function receiptsTo(runtime: Runtime, email: string) {
  return (await emailJobs(runtime)).filter(
    (job) =>
      job.payload.to === email && job.payload.idempotencyKey.startsWith("receipt:"),
  );
}

async function saleNotifications(runtime: Runtime, email: string) {
  return runtime.db
    .select({ title: schema.notifications.title, href: schema.notifications.href })
    .from(schema.notifications)
    .innerJoin(
      schema.schoolAccounts,
      eq(schema.schoolAccounts.id, schema.notifications.schoolAccountId),
    )
    .where(
      and(
        eq(schema.notifications.type, "new_sale"),
        eq(schema.schoolAccounts.email, email),
      ),
    );
}

describe.serial("commerce: buying again keeps existing access", () => {
  it("refuses paid and free checkouts for a learner who already has access", async () => {
    const setup = await setUp();
    const learner = await signUp(setup.runtime, setup.world, "owner-of-it@example.com");
    await buy(setup, learner, "pay_first");
    expect(await productMembership(setup, "owner-of-it@example.com")).toBe("active");

    for (const planId of [setup.paidPlanId, setup.freePlanId]) {
      const again = await checkout(setup.runtime, learner, planId);
      expect(again.status).toBe(409);
      expect(again.body).toMatchObject({ details: { reason: "already_member" } });
      expect(await productMembership(setup, "owner-of-it@example.com")).toBe("active");
    }

    // The storefront's checkout-session flow is refused the same way.
    const session = await dispatch(setup.runtime, {
      method: "POST",
      path: `/v1/public/${setup.world.schoolA.publicId}/checkout-sessions`,
      headers: {},
      body: { productId: setup.productId, planId: setup.paidPlanId },
    });
    expect(session.status).toBe(201);
    const started = await dispatch(setup.runtime, {
      method: "POST",
      path: `/v1/learner/checkout-sessions/${(session.body as { id: string }).id}/checkout`,
      headers: learner,
      body: { returnUrl: RETURN_URL },
    });
    expect(started.status).toBe(409);
    expect(started.body).toMatchObject({ details: { reason: "already_member" } });
    expect(await productMembership(setup, "owner-of-it@example.com")).toBe("active");
    expect(setup.provider.checkouts).toHaveLength(1);
    await setup.runtime.close();
  });

  it("protects access a creator granted", async () => {
    const setup = await setUp();
    const granted = await dispatch(setup.runtime, {
      method: "POST",
      path: "/v1/memberships",
      headers: setup.adminHeaders,
      body: {
        productId: setup.productId,
        email: "granted@example.com",
        name: "Granted",
      },
    });
    expect(granted.status).toBe(201);
    const learner = await signUp(setup.runtime, setup.world, "granted@example.com");
    const again = await checkout(setup.runtime, learner, setup.paidPlanId);
    expect(again.status).toBe(409);
    expect(again.body).toMatchObject({ details: { reason: "already_member" } });
    expect(await productMembership(setup, "granted@example.com")).toBe("active");
    expect(setup.provider.checkouts).toHaveLength(0);
    await setup.runtime.close();
  });

  it("lets a learner whose access lapsed buy again", async () => {
    const setup = await setUp();
    const learner = await signUp(setup.runtime, setup.world, "lapsed@example.com");
    await buy(setup, learner, "pay_lapsed_first");
    await setup.runtime.db
      .update(schema.learnerMemberships)
      .set({ status: "expired" })
      .where(eq(schema.learnerMemberships.entityId, setup.productId));
    const again = await checkout(setup.runtime, learner, setup.paidPlanId);
    expect(again.status).toBe(201);
    expect(again.body).toMatchObject({ status: "pending" });
    const renewed = await webhook(
      setup.runtime,
      "evt-lapsed-again",
      paid((again.body as { id: string }).id, "pay_lapsed_again"),
    );
    expect(renewed.status).toBe(200);
    expect(await productMembership(setup, "lapsed@example.com")).toBe("active");
    await setup.runtime.close();
  });
});

describe.serial("commerce: receipts", () => {
  it("queues exactly one receipt per payment through the platform sender", async () => {
    const setup = await setUp();
    const learner = await signUp(setup.runtime, setup.world, "buyer@example.com");
    const checkoutId = await buy(setup, learner, "pay_receipt");

    // The provider redelivers the same event, then reports the payment again
    // under a new event id.
    const duplicate = await webhook(
      setup.runtime,
      "evt-pay_receipt",
      paid(checkoutId, "pay_receipt"),
    );
    expect(duplicate.body).toMatchObject({ duplicate: true });
    const replayed = await webhook(
      setup.runtime,
      "evt-pay_receipt-again",
      paid(checkoutId, "pay_receipt"),
    );
    expect(replayed.status).toBe(200);

    const receipts = await receiptsTo(setup.runtime, "buyer@example.com");
    expect(receipts).toHaveLength(1);
    // No mailing team: the platform sender delivers it instead of dropping it.
    expect(receipts[0]).toMatchObject({
      provider: "system",
      type: "send_system_email",
      payload: { subject: "Your receipt for Paid course" },
    });
    const { html, text } = receipts[0]!.payload;
    expect(text).toContain("$25.00");
    expect(text).toContain(checkoutId);
    expect(text).toContain("Lifetime");
    expect(html).toContain(`/dashboard/courses/${setup.productId}`);
    expect(html).toContain("/dashboard/account/purchases");

    // The worker delivers it through the platform's own sender.
    const sent: SystemMailMessage[] = [];
    let processed = true;
    while (processed) {
      processed = await processNextSystemEmailJob(
        setup.runtime.db,
        setup.clock,
        setup.runtime.logger,
        async (message) => {
          sent.push(message);
          return "console";
        },
      );
    }
    expect(sent.filter((message) => message.to === "buyer@example.com")).toEqual([
      expect.objectContaining({ subject: "Your receipt for Paid course" }),
    ]);
    const pending = await setup.runtime.db
      .select()
      .from(schema.integrationOutboxJobs)
      .where(
        and(
          eq(schema.integrationOutboxJobs.provider, "system"),
          eq(schema.integrationOutboxJobs.status, "pending"),
        ),
      );
    expect(pending).toHaveLength(0);
    await setup.runtime.close();
  });

  it("sends receipts through the school's mailing team when it has one", async () => {
    const setup = await setUp({ mailingTeam: true });
    const learner = await signUp(setup.runtime, setup.world, "team-buyer@example.com");
    await buy(setup, learner, "pay_team");
    expect(await receiptsTo(setup.runtime, "team-buyer@example.com")).toEqual([
      expect.objectContaining({ provider: "sendlit", type: "send_school_email" }),
    ]);
    await setup.runtime.close();
  });

  it("confirms a free checkout once, without a sale alert", async () => {
    const setup = await setUp();
    const learner = await signUp(setup.runtime, setup.world, "free@example.com");
    const started = await checkout(setup.runtime, learner, setup.freePlanId);
    expect(started.status).toBe(201);
    expect(started.body).toMatchObject({ status: "paid" });
    const receipts = await receiptsTo(setup.runtime, "free@example.com");
    expect(receipts).toHaveLength(1);
    expect(receipts[0]!.payload.subject).toBe("You're in: Paid course");
    expect(receipts[0]!.payload.text).toContain("Amount: Free");
    expect(
      await saleNotifications(setup.runtime, setup.world.owner.email),
    ).toHaveLength(0);
    await setup.runtime.close();
  });

  it("sends a short receipt for a renewal, without another sale alert", async () => {
    const setup = await setUp();
    const learner = await signUp(setup.runtime, setup.world, "renewal@example.com");
    const checkoutId = await buy(setup, learner, "pay_installment_1");
    const second = await webhook(
      setup.runtime,
      "evt-installment-2",
      paid(checkoutId, "pay_installment_2"),
    );
    expect(second.status).toBe(200);
    const receipts = await receiptsTo(setup.runtime, "renewal@example.com");
    expect(receipts.map((receipt) => receipt.payload.subject)).toEqual([
      "Your receipt for Paid course",
      "Payment received for Paid course",
    ]);
    expect(
      await saleNotifications(setup.runtime, setup.world.owner.email),
    ).toHaveLength(1);
    await setup.runtime.close();
  });

  it("sends a receipt and a sale alert for a paid community join", async () => {
    const setup = await setUp();
    const [community] = await setup.runtime.db
      .select()
      .from(schema.communities)
      .where(eq(schema.communities.schoolId, setup.world.schoolA.id));
    await setup.runtime.db
      .update(schema.communities)
      .set({ enabled: true })
      .where(eq(schema.communities.id, community!.id));
    const plan = await dispatch(setup.runtime, {
      method: "POST",
      path: `/v1/communities/${community!.publicId}/plans`,
      headers: setup.adminHeaders,
      body: {
        name: "Members",
        kind: "one_time",
        type: "onetime",
        amountMinor: 4000,
        providerProductId: "community-once",
      },
    });
    expect(plan.status).toBe(201);
    const learner = await signUp(setup.runtime, setup.world, "joiner@example.com");
    const started = await dispatch(setup.runtime, {
      method: "POST",
      path: `/v1/learner/communities/${community!.publicId}/checkout`,
      headers: { ...learner, "idempotency-key": "community-join" },
      body: { planId: (plan.body as { id: string }).id, returnUrl: RETURN_URL },
    });
    expect(started.status).toBe(201);
    const event = {
      type: "payment.succeeded",
      data: {
        payment_id: "pay_community",
        amount: 4000,
        currency: "USD",
        metadata: {
          courselit_community_checkout_id: (started.body as { id: string }).id,
        },
      },
    };
    expect((await webhook(setup.runtime, "evt-community", event)).status).toBe(200);
    expect((await webhook(setup.runtime, "evt-community-again", event)).status).toBe(
      200,
    );

    const receipts = await receiptsTo(setup.runtime, "joiner@example.com");
    expect(receipts).toHaveLength(1);
    expect(receipts[0]!.payload.text).toContain("$40.00");
    expect(await saleNotifications(setup.runtime, setup.world.owner.email)).toEqual([
      { title: `New paid member: ${community!.name}`, href: "/community/memberships" },
    ]);
    await setup.runtime.close();
  });
});

describe.serial("commerce: learner purchases", () => {
  it("lists only the caller's purchases at this school and shows refunds", async () => {
    const setup = await setUp();
    const alice = await signUp(setup.runtime, setup.world, "alice@example.com");
    const bob = await signUp(setup.runtime, setup.world, "bob@example.com");
    const aliceCheckout = await buy(setup, alice, "pay_alice");
    await buy(setup, bob, "pay_bob");

    const list = await dispatch(setup.runtime, {
      method: "GET",
      path: "/v1/learner/purchases",
      headers: alice,
    });
    expect(list.status).toBe(200);
    const items = (list.body as { items: Array<Record<string, unknown>> }).items;
    expect(items).toEqual([
      expect.objectContaining({
        orderId: aliceCheckout,
        resourceType: "product",
        resourceId: setup.productId,
        title: "Paid course",
        productKind: "course",
        planName: "Lifetime",
        planKind: "one_time",
        amountMinor: 2500,
        currency: "USD",
        status: "paid",
      }),
    ]);

    const refunded = await webhook(setup.runtime, "evt-refund-alice", {
      type: "payment.refunded",
      data: { payment_id: "pay_alice" },
    });
    expect(refunded.status).toBe(200);
    const afterRefund = await dispatch(setup.runtime, {
      method: "GET",
      path: "/v1/learner/purchases",
      headers: alice,
    });
    expect(afterRefund.body).toMatchObject({ items: [{ status: "refunded" }] });

    // Bob still sees only his own, still-paid purchase.
    const bobs = await dispatch(setup.runtime, {
      method: "GET",
      path: "/v1/learner/purchases",
      headers: bob,
    });
    expect(bobs.body).toMatchObject({
      items: [{ status: "paid", orderId: expect.not.stringMatching(aliceCheckout) }],
    });
    expect((bobs.body as { items: unknown[] }).items).toHaveLength(1);

    // Signed out, or signed in to another school, there is nothing to read.
    expect(
      (
        await dispatch(setup.runtime, {
          method: "GET",
          path: "/v1/learner/purchases",
          headers: { "x-school-id": setup.world.schoolA.publicId },
        })
      ).status,
    ).toBe(401);
    const otherSchool = await dispatch(setup.runtime, {
      method: "GET",
      path: "/v1/learner/purchases",
      headers: { ...alice, "x-school-id": setup.world.schoolB.publicId },
    });
    expect(otherSchool.status === 200 ? otherSchool.body : { items: [] }).toEqual({
      items: [],
    });
    await setup.runtime.close();
  });
});

describe.serial("commerce: sale alerts", () => {
  it("alerts the staff who manage products, respecting their preferences", async () => {
    const setup = await setUp();
    // The member can no longer manage products, so the sale isn't theirs to see.
    await setup.runtime.db
      .update(schema.memberships)
      .set({ permissions: ["products:read"] })
      .where(eq(schema.memberships.isOwner, false));
    const learner = await signUp(setup.runtime, setup.world, "first-sale@example.com");
    await buy(setup, learner, "pay_first_sale");
    expect(await saleNotifications(setup.runtime, setup.world.owner.email)).toEqual([
      {
        title: "New sale: Paid course",
        href: `/products/${setup.productId}/customers`,
      },
    ]);
    expect(
      await saleNotifications(setup.runtime, setup.world.member.email),
    ).toHaveLength(0);
    const ownerAlertEmails = (await emailJobs(setup.runtime)).filter(
      (job) =>
        job.payload.to === setup.world.owner.email &&
        job.payload.subject === "New sale: Paid course",
    );
    expect(ownerAlertEmails).toHaveLength(1);
    expect(ownerAlertEmails[0]!.provider).toBe("system");

    // The owner turns sale alerts off in the app and by email.
    const off = await dispatch(setup.runtime, {
      method: "PATCH",
      path: "/v1/notification-preferences/new_sale",
      headers: setup.adminHeaders,
      body: { appEnabled: false, emailEnabled: false },
    });
    expect(off.status).toBe(200);
    const another = await signUp(setup.runtime, setup.world, "second-sale@example.com");
    await buy(setup, another, "pay_second_sale");
    expect(
      await saleNotifications(setup.runtime, setup.world.owner.email),
    ).toHaveLength(1);
    expect(
      (await emailJobs(setup.runtime)).filter(
        (job) =>
          job.payload.to === setup.world.owner.email &&
          job.payload.subject === "New sale: Paid course",
      ),
    ).toHaveLength(1);
    // The buyer still gets their receipt.
    expect(await receiptsTo(setup.runtime, "second-sale@example.com")).toHaveLength(1);
    await setup.runtime.close();
  });
});

describe.serial("commerce: digital downloads", () => {
  it("lets a buyer create a download link for a purchased download", async () => {
    const setup = await setUp({ kind: "download" });
    const learner = await signUp(setup.runtime, setup.world, "downloader@example.com");
    const before = await dispatch(setup.runtime, {
      method: "POST",
      path: `/v1/learner/products/${setup.productId}/download`,
      headers: learner,
      body: {},
    });
    expect(before.status).toBe(403);
    await buy(setup, learner, "pay_download");
    const link = await dispatch(setup.runtime, {
      method: "POST",
      path: `/v1/learner/products/${setup.productId}/download`,
      headers: learner,
      body: {},
    });
    expect(link.status).toBe(201);
    expect(link.body).toMatchObject({ token: expect.any(String) });
    // The receipt links to the product page that has the download button.
    const [receipt] = await receiptsTo(setup.runtime, "downloader@example.com");
    expect(receipt!.payload.html).toContain(`/dashboard/courses/${setup.productId}`);
    expect(receipt!.payload.html).toContain("Open Starter kit");
    // The purchases page knows it is a download.
    const purchases = await dispatch(setup.runtime, {
      method: "GET",
      path: "/v1/learner/purchases",
      headers: learner,
    });
    expect(purchases.body).toMatchObject({ items: [{ productKind: "download" }] });
    await setup.runtime.close();
  });

  it("puts the download button on every storefront path to a purchased download", () => {
    const read = (relative: string) =>
      readFileSync(path.join(import.meta.dir, "../../storefront", relative), "utf8");
    const action = read("components/download-product-action.tsx");
    expect(action).toContain("/api/v1/learner/products/");
    expect(action).toContain("/download");
    expect(action).toContain("/api/v1/learner/downloads/");

    // "My products" and the checkout's Continue both open the course viewer…
    expect(read("components/dashboard/learner-products.tsx")).toContain("`/course/");
    expect(read("components/public-checkout-session.tsx")).toContain("`/course/");
    // …which renders the download action for downloads instead of jumping to
    // the first file.
    const viewer = read("components/public-course-viewer.tsx");
    expect(viewer).toContain("<DownloadProductAction");
    expect(viewer).toContain('product.kind === "download" && product.enrolled');
    expect(viewer).toContain('if (product.kind === "download") return;');
    // Emails link to the dashboard product page, which has it too.
    expect(
      read("app/schools/[schoolId]/(loggedin)/dashboard/courses/[productId]/page.tsx"),
    ).toContain("<DownloadProductAction");
  });
});
