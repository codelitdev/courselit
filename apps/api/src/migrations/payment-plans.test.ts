import { describe, expect, it } from "bun:test";
import { and, eq } from "drizzle-orm";
import * as schema from "../db/schema/index.js";
import { createPgliteRuntime, freezeRuntimeClock } from "../runtime.js";
import { seedWorld } from "../seed.js";
import { importLegacyDomains } from "./domains.js";
import { importLegacyPaymentPlans } from "./payment-plans.js";
import { importLegacyProducts } from "./products.js";

describe.serial("legacy payment-plan migration", () => {
  it("preserves source amounts, derives one default, omits currency, and is idempotent", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    await importLegacyDomains(runtime.db, {
      clock,
      mode: "apply",
      records: [
        {
          _id: "legacy-domain-plans",
          name: "plans-school",
          email: world.owner.email,
          currency: "INR",
        },
      ],
    });
    const course = {
      _id: "legacy-course-plans",
      courseId: "legacy-course-plans",
      domain: "legacy-domain-plans",
      title: "Plans course",
      slug: "plans-course",
      type: "course",
      creatorId: world.owner.id,
      published: true,
      privacy: "public",
      defaultPaymentPlan: "legacy-plan-monthly",
      groups: [],
    };
    await importLegacyProducts(runtime.db, {
      clock,
      mode: "apply",
      courses: [course],
      lessons: [],
    });

    const plans = [
      {
        planId: "legacy-plan-free",
        domain: "legacy-domain-plans",
        entityId: course.courseId,
        entityType: "course",
        userId: world.owner.id,
        name: "Free",
        type: "free",
        description: "No currency belongs to this plan",
        archived: false,
        internal: false,
        currency: "EUR",
      },
      {
        planId: "legacy-plan-onetime",
        domain: "legacy-domain-plans",
        entityId: course.courseId,
        entityType: "course",
        userId: world.owner.id,
        name: "One time",
        type: "onetime",
        oneTimeAmount: 49.5,
        archived: false,
        internal: false,
      },
      {
        planId: "legacy-plan-emi",
        domain: "legacy-domain-plans",
        entityId: course.courseId,
        entityType: "course",
        userId: world.owner.id,
        name: "Installments",
        type: "emi",
        emiAmount: 12.25,
        emiTotalInstallments: 4,
        archived: false,
        internal: false,
      },
      {
        planId: "legacy-plan-monthly",
        domain: "legacy-domain-plans",
        entityId: course.courseId,
        entityType: "course",
        userId: world.owner.id,
        name: "Monthly",
        type: "subscription",
        subscriptionMonthlyAmount: 10,
        archived: false,
        internal: false,
      },
      {
        planId: "legacy-plan-yearly",
        domain: "legacy-domain-plans",
        entityId: course.courseId,
        entityType: "course",
        userId: world.owner.id,
        name: "Yearly",
        type: "subscription",
        subscriptionYearlyAmount: 100,
        archived: false,
        internal: false,
      },
    ];

    const dryRun = await importLegacyPaymentPlans(runtime.db, {
      clock,
      mode: "dry_run",
      courses: [course],
      plans,
    });
    expect(dryRun.counts).toMatchObject({
      seen: 5,
      ready: 5,
      imported: 0,
      rejected: 0,
    });
    expect(
      await runtime.db
        .select()
        .from(schema.storefrontPlans)
        .where(eq(schema.storefrontPlans.publicId, "legacy-plan-monthly")),
    ).toHaveLength(0);

    const applied = await importLegacyPaymentPlans(runtime.db, {
      clock,
      mode: "apply",
      courses: [course],
      plans,
    });
    expect(applied.counts).toMatchObject({
      seen: 5,
      ready: 5,
      imported: 5,
      rejected: 0,
    });
    const rows = await runtime.db
      .select()
      .from(schema.storefrontPlans)
      .where(eq(schema.storefrontPlans.productId, (await runtime.db
        .select({ id: schema.products.id })
        .from(schema.products)
        .where(eq(schema.products.publicId, course.courseId))
        .limit(1))[0]!.id));
    expect(rows).toHaveLength(5);
    expect(rows.find((row) => row.publicId === "legacy-plan-monthly")).toMatchObject({
      kind: "subscription",
      subscriptionMonthlyAmount: 10,
      amountMinor: 1000,
      billingInterval: "month",
      isDefault: true,
    });
    expect(rows.find((row) => row.publicId === "legacy-plan-emi")).toMatchObject({
      kind: "installment",
      emiAmount: 12.25,
      emiTotalInstallments: 4,
      amountMinor: 1225,
      billingInterval: "month",
      installmentCount: 4,
    });
    expect(rows.find((row) => row.publicId === "legacy-plan-free")).toMatchObject({
      kind: "free",
      amountMinor: 0,
      isDefault: false,
    });
    expect(rows[0]).not.toHaveProperty("currency");

    const mapping = await runtime.db
      .select()
      .from(schema.migrationMappings)
      .where(
        and(
          eq(schema.migrationMappings.sourceCollection, "paymentplans"),
          eq(schema.migrationMappings.sourceId, "legacy-plan-monthly"),
        ),
      );
    expect(mapping).toHaveLength(1);

    const second = await importLegacyPaymentPlans(runtime.db, {
      clock,
      mode: "apply",
      courses: [course],
      plans,
    });
    expect(second.counts).toMatchObject({
      seen: 5,
      ready: 0,
      imported: 0,
      alreadyMapped: 5,
      rejected: 0,
    });
    await runtime.close();
  });

  it("rejects community, internal, bundled, malformed, and duplicate plans", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    await importLegacyDomains(runtime.db, {
      clock,
      mode: "apply",
      records: [
        {
          _id: "legacy-domain-plan-rejections",
          name: "plan-rejections-school",
          email: world.owner.email,
        },
      ],
    });
    const course = {
      _id: "legacy-course-plan-rejections",
      courseId: "legacy-course-plan-rejections",
      domain: "legacy-domain-plan-rejections",
      title: "Plan rejection course",
      slug: "plan-rejection-course",
      type: "course",
      creatorId: world.owner.id,
      defaultPaymentPlan: "legacy-plan-duplicate-a",
    };
    await importLegacyProducts(runtime.db, {
      clock,
      mode: "apply",
      courses: [course],
      lessons: [],
    });
    const base = {
      domain: "legacy-domain-plan-rejections",
      entityId: course.courseId,
      userId: world.owner.id,
      name: "Plan",
      type: "onetime",
      oneTimeAmount: 20,
      archived: false,
      internal: false,
    };
    const result = await importLegacyPaymentPlans(runtime.db, {
      clock,
      mode: "dry_run",
      courses: [course],
      plans: [
        { ...base, planId: "legacy-plan-community", entityType: "community" },
        { ...base, planId: "legacy-plan-internal", entityType: "course", internal: true },
        { ...base, planId: "legacy-plan-bundle", entityType: "course", includedProducts: ["another-course"] },
        { ...base, planId: "legacy-plan-invalid", entityType: "course", oneTimeAmount: "20" },
        { ...base, planId: "legacy-plan-duplicate-a", entityType: "course" },
        { ...base, planId: "legacy-plan-duplicate-b", entityType: "course" },
      ],
    });
    expect(result.counts).toMatchObject({ seen: 6, ready: 1, rejected: 5 });
    expect(result.rejectionByCode).toMatchObject({
      unsupported_entity_type: 1,
      internal_plan_requires_review: 1,
      included_products_not_allowed: 1,
      invalid_amount: 1,
      duplicate_active_plan: 1,
    });
    expect(
      await runtime.db
        .select()
        .from(schema.migrationRejections)
        .where(eq(schema.migrationRejections.runId, result.runId)),
    ).toHaveLength(5);
    await runtime.close();
  });
});
