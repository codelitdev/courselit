import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { type Clock, uuidv7 } from "@codelitdev/platform";
import { and, eq } from "drizzle-orm";
import * as schema from "../db/schema/index.js";
import type { AppDb } from "../types.js";

const SOURCE_SYSTEM = "courselit-mongo";
const SOURCE_COLLECTION = "paymentplans";

type JsonRecord = Record<string, unknown>;

export type PaymentPlanImportCounts = {
  seen: number;
  ready: number;
  imported: number;
  alreadyMapped: number;
  rejected: number;
};

export type PaymentPlanImportRejection = {
  sourceId: string | null;
  code:
    | "invalid_record"
    | "invalid_plan_id"
    | "invalid_name"
    | "invalid_description"
    | "invalid_entity_id"
    | "invalid_entity_type"
    | "unsupported_entity_type"
    | "invalid_type"
    | "invalid_amount"
    | "invalid_installments"
    | "invalid_timestamps"
    | "invalid_included_products"
    | "included_products_not_allowed"
    | "internal_plan_requires_review"
    | "product_source_missing"
    | "school_mapping_missing"
    | "product_mapping_missing"
    | "creator_not_found"
    | "product_conflict"
    | "plan_conflict"
    | "duplicate_source_id"
    | "duplicate_active_plan"
    | "default_plan_missing"
    | "default_plan_conflict"
    | "mapping_target_missing";
  details: Record<string, string | number | boolean | null>;
};

export type PaymentPlanImportResult = {
  runId: string;
  sourceSystem: string;
  mode: "dry_run" | "apply";
  status: "succeeded";
  counts: PaymentPlanImportCounts;
  rejectionByCode: Record<string, number>;
  rejections: PaymentPlanImportRejection[];
};

type SourcePlanType = "free" | "onetime" | "emi" | "subscription";
type TargetPlanKind = "free" | "one_time" | "installment" | "subscription";

type NormalizedPaymentPlan = {
  sourceId: string;
  entityId: string;
  domainId: string;
  creatorId: string;
  name: string;
  description: string;
  includedProducts: string[];
  type: SourcePlanType;
  kind: TargetPlanKind;
  oneTimeAmount: number | null;
  emiAmount: number | null;
  emiTotalInstallments: number | null;
  subscriptionMonthlyAmount: number | null;
  subscriptionYearlyAmount: number | null;
  amountMinor: number;
  billingInterval: "month" | "year" | null;
  installmentCount: number | null;
  status: "active" | "archived";
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type Candidate = NormalizedPaymentPlan & {
  schoolId: string;
  productId: string;
};

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function idValue(value: unknown): string | null {
  const object = asRecord(value);
  if (object && typeof object.$oid === "string") return object.$oid.trim() || null;
  return stringValue(value);
}

function dateValue(value: unknown): Date | null {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value;
  const object = asRecord(value);
  if (object?.$date !== undefined) return dateValue(object.$date);
  if (typeof value !== "string" && typeof value !== "number") return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function optionalNumber(
  value: unknown,
): { ok: true; value: number | null } | { ok: false } {
  if (value === undefined || value === null) return { ok: true, value: null };
  return typeof value === "number" && Number.isFinite(value)
    ? { ok: true, value }
    : { ok: false };
}

function majorAmountToMinor(value: number): number | null {
  if (!Number.isFinite(value) || value < 0) return null;
  const minor = Math.round(value * 100);
  return Number.isSafeInteger(minor) ? minor : null;
}

function rejection(
  sourceId: string | null,
  code: PaymentPlanImportRejection["code"],
  details: PaymentPlanImportRejection["details"] = {},
): PaymentPlanImportRejection {
  return { sourceId, code, details };
}

function countRejection(
  counts: PaymentPlanImportCounts,
  rejectionByCode: Record<string, number>,
  item: PaymentPlanImportRejection,
) {
  counts.rejected += 1;
  rejectionByCode[item.code] = (rejectionByCode[item.code] ?? 0) + 1;
}

function persistableCounts(
  counts: PaymentPlanImportCounts,
  rejectionByCode: Record<string, number>,
): Record<string, number> {
  return {
    ...counts,
    ...Object.fromEntries(
      Object.entries(rejectionByCode).map(([code, count]) => [`rejected_${code}`, count]),
    ),
  };
}

function digestForLog(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex").slice(0, 12);
}

function sourceTypeToTargetKind(type: SourcePlanType): TargetPlanKind {
  switch (type) {
    case "onetime":
      return "one_time";
    case "emi":
      return "installment";
    default:
      return type;
  }
}

function activePlanKey(plan: Pick<NormalizedPaymentPlan, "type" | "billingInterval">): string {
  return plan.type === "subscription"
    ? `${plan.type}:${plan.billingInterval}`
    : plan.type;
}

function normalizePlan(
  raw: unknown,
  coursesById: Map<string, JsonRecord>,
  now: Date,
): { ok: true; value: NormalizedPaymentPlan } | { ok: false; error: PaymentPlanImportRejection } {
  const object = asRecord(raw);
  if (!object) return { ok: false, error: rejection(null, "invalid_record") };

  // PaymentPlan.planId is the source's required, globally unique public ID.
  // Do not fall back to Mongo _id: Course.defaultPaymentPlan points to planId.
  const sourceId = stringValue(object.planId);
  if (!sourceId) return { ok: false, error: rejection(null, "invalid_plan_id") };
  const name = stringValue(object.name);
  if (!name || name.length > 200) {
    return { ok: false, error: rejection(sourceId, "invalid_name") };
  }
  if (object.description !== undefined && typeof object.description !== "string") {
    return { ok: false, error: rejection(sourceId, "invalid_description") };
  }
  const description = typeof object.description === "string" ? object.description : "";
  if (description.length > 2_000) {
    return { ok: false, error: rejection(sourceId, "invalid_description") };
  }
  const entityId = stringValue(object.entityId);
  if (!entityId) return { ok: false, error: rejection(sourceId, "invalid_entity_id") };
  const entityType = stringValue(object.entityType)?.toLowerCase();
  if (!entityType) {
    return { ok: false, error: rejection(sourceId, "invalid_entity_type") };
  }
  if (entityType !== "course") {
    return {
      ok: false,
      error: rejection(sourceId, "unsupported_entity_type", { entityType }),
    };
  }
  const type = stringValue(object.type)?.toLowerCase();
  if (!type || !["free", "onetime", "emi", "subscription"].includes(type)) {
    return {
      ok: false,
      error: rejection(sourceId, "invalid_type", { type: type ?? null }),
    };
  }
  const domainId = idValue(object.domain);
  const creatorId = stringValue(object.userId);
  if (!domainId || !creatorId) {
    return { ok: false, error: rejection(sourceId, "invalid_record") };
  }

  const oneTimeAmount = optionalNumber(object.oneTimeAmount);
  const emiAmount = optionalNumber(object.emiAmount);
  const emiTotalInstallments = optionalNumber(object.emiTotalInstallments);
  const subscriptionMonthlyAmount = optionalNumber(object.subscriptionMonthlyAmount);
  const subscriptionYearlyAmount = optionalNumber(object.subscriptionYearlyAmount);
  if (
    !oneTimeAmount.ok ||
    !emiAmount.ok ||
    !emiTotalInstallments.ok ||
    !subscriptionMonthlyAmount.ok ||
    !subscriptionYearlyAmount.ok
  ) {
    return { ok: false, error: rejection(sourceId, "invalid_amount") };
  }

  const includedProducts = object.includedProducts;
  if (
    includedProducts !== undefined &&
    (!Array.isArray(includedProducts) ||
      includedProducts.some((productId) => typeof productId !== "string" || !productId.trim()))
  ) {
    return { ok: false, error: rejection(sourceId, "invalid_included_products") };
  }
  if (Array.isArray(includedProducts) && includedProducts.length > 0) {
    // This is the source validation rule for course-owned plans. Bundles are
    // owned by community plans in main and are not silently flattened here.
    return { ok: false, error: rejection(sourceId, "included_products_not_allowed") };
  }

  const archived = object.archived === undefined ? false : object.archived;
  const internal = object.internal === undefined ? false : object.internal;
  if (typeof archived !== "boolean" || typeof internal !== "boolean") {
    return { ok: false, error: rejection(sourceId, "invalid_record") };
  }
  if (internal) {
    return { ok: false, error: rejection(sourceId, "internal_plan_requires_review") };
  }

  const createdAt = object.createdAt === undefined ? now : dateValue(object.createdAt);
  const updatedAt = object.updatedAt === undefined ? now : dateValue(object.updatedAt);
  if (!createdAt || !updatedAt) {
    return { ok: false, error: rejection(sourceId, "invalid_timestamps") };
  }

  let amountMinor = 0;
  let billingInterval: "month" | "year" | null = null;
  let installmentCount: number | null = null;
  if (type === "onetime") {
    if (oneTimeAmount.value === null || oneTimeAmount.value <= 0) {
      return { ok: false, error: rejection(sourceId, "invalid_amount") };
    }
    amountMinor = majorAmountToMinor(oneTimeAmount.value) ?? -1;
    if (amountMinor <= 0) return { ok: false, error: rejection(sourceId, "invalid_amount") };
  } else if (type === "emi") {
    if (emiAmount.value === null || emiAmount.value <= 0) {
      return { ok: false, error: rejection(sourceId, "invalid_amount") };
    }
    if (
      emiTotalInstallments.value === null ||
      !Number.isInteger(emiTotalInstallments.value) ||
      emiTotalInstallments.value < 2 ||
      emiTotalInstallments.value > 60
    ) {
      return { ok: false, error: rejection(sourceId, "invalid_installments") };
    }
    amountMinor = majorAmountToMinor(emiAmount.value) ?? -1;
    installmentCount = emiTotalInstallments.value;
    if (amountMinor <= 0) return { ok: false, error: rejection(sourceId, "invalid_amount") };
    // main's EMI model has no frequency field; its payment implementations
    // charge each installment monthly. The target interval is an adapter
    // projection and is not a source payment-plan field.
    billingInterval = "month";
  } else if (type === "subscription") {
    const monthlyValid =
      subscriptionMonthlyAmount.value !== null && subscriptionMonthlyAmount.value > 0;
    const yearlyValid =
      subscriptionYearlyAmount.value !== null && subscriptionYearlyAmount.value > 0;
    if (monthlyValid === yearlyValid) {
      return { ok: false, error: rejection(sourceId, "invalid_amount") };
    }
    const amount = monthlyValid
      ? subscriptionMonthlyAmount.value!
      : subscriptionYearlyAmount.value!;
    amountMinor = majorAmountToMinor(amount) ?? -1;
    billingInterval = monthlyValid ? "month" : "year";
    if (amountMinor <= 0) return { ok: false, error: rejection(sourceId, "invalid_amount") };
  }

  const course = coursesById.get(entityId);
  if (!course) {
    return { ok: false, error: rejection(sourceId, "product_source_missing", { entityId }) };
  }
  const defaultPlanId = stringValue(course.defaultPaymentPlan);
  if (!archived && !defaultPlanId) {
    return { ok: false, error: rejection(sourceId, "default_plan_missing", { entityId }) };
  }

  return {
    ok: true,
    value: {
      sourceId,
      entityId,
      domainId,
      creatorId,
      name,
      description,
      includedProducts: Array.isArray(includedProducts)
        ? includedProducts.map((productId) => productId.trim())
        : [],
      type: type as SourcePlanType,
      kind: sourceTypeToTargetKind(type as SourcePlanType),
      oneTimeAmount: oneTimeAmount.value,
      emiAmount: emiAmount.value,
      emiTotalInstallments: emiTotalInstallments.value,
      subscriptionMonthlyAmount: subscriptionMonthlyAmount.value,
      subscriptionYearlyAmount: subscriptionYearlyAmount.value,
      amountMinor,
      billingInterval,
      installmentCount,
      status: archived ? "archived" : "active",
      isDefault: !archived && defaultPlanId === sourceId,
      createdAt,
      updatedAt,
    },
  };
}

function coursesById(records: readonly unknown[]): Map<string, JsonRecord> {
  const result = new Map<string, JsonRecord>();
  for (const record of records) {
    const object = asRecord(record);
    const courseId = object ? stringValue(object.courseId) : null;
    if (courseId && object) result.set(courseId, object);
  }
  return result;
}

export function readLegacyPaymentPlanExport(path: string): readonly unknown[] {
  const parsed = JSON.parse(readFileSync(path, "utf8")) as unknown;
  if (Array.isArray(parsed)) return parsed;
  const object = asRecord(parsed);
  const plans = object?.paymentPlans ?? object?.plans;
  if (!Array.isArray(plans)) {
    throw new Error("payment_plan_export_must_be_array_or_object_with_plans_array");
  }
  return plans;
}

export async function importLegacyPaymentPlans(
  db: AppDb,
  input: {
    plans: readonly unknown[];
    courses: readonly unknown[];
    clock: Clock;
    mode?: "dry_run" | "apply";
    sourceSystem?: string;
  },
): Promise<PaymentPlanImportResult> {
  const now = input.clock.now();
  const mode = input.mode ?? "dry_run";
  const sourceSystem = input.sourceSystem ?? SOURCE_SYSTEM;
  const runId = uuidv7(input.clock);
  const counts: PaymentPlanImportCounts = {
    seen: input.plans.length,
    ready: 0,
    imported: 0,
    alreadyMapped: 0,
    rejected: 0,
  };
  const rejectionByCode: Record<string, number> = {};
  const rejections: PaymentPlanImportRejection[] = [];
  const sourceIds = new Set<string>();
  const sourceCourses = coursesById(input.courses);
  const candidates: Candidate[] = [];
  const plannedKeys = new Map<string, Set<string>>();
  const plannedDefaults = new Set<string>();

  await db.insert(schema.migrationRuns).values({
    id: runId,
    sourceSystem,
    scope: SOURCE_COLLECTION,
    mode,
    status: "running",
    counts: persistableCounts(counts, rejectionByCode),
    startedAt: now,
  });

  const addRejection = (item: PaymentPlanImportRejection) => {
    rejections.push(item);
    countRejection(counts, rejectionByCode, item);
  };

  try {
    for (const raw of input.plans) {
      const rawObject = asRecord(raw);
      const sourceId = stringValue(rawObject?.planId);
      if (sourceId && sourceIds.has(sourceId)) {
        addRejection(rejection(sourceId, "duplicate_source_id"));
        continue;
      }
      if (sourceId) sourceIds.add(sourceId);

      if (sourceId) {
        const mappings = await db
          .select()
          .from(schema.migrationMappings)
          .where(
            and(
              eq(schema.migrationMappings.sourceSystem, sourceSystem),
              eq(schema.migrationMappings.sourceCollection, SOURCE_COLLECTION),
              eq(schema.migrationMappings.sourceId, sourceId),
              eq(schema.migrationMappings.targetTable, "storefront_plans"),
            ),
          )
          .limit(1);
        if (mappings[0]) {
          const target = await db
            .select({ id: schema.storefrontPlans.id })
            .from(schema.storefrontPlans)
            .where(eq(schema.storefrontPlans.id, mappings[0].targetId))
            .limit(1);
          if (!target[0]) {
            addRejection(
              rejection(sourceId, "mapping_target_missing", {
                targetId: mappings[0].targetId,
              }),
            );
          } else {
            counts.alreadyMapped += 1;
          }
          continue;
        }
      }

      const normalized = normalizePlan(raw, sourceCourses, now);
      if (!normalized.ok) {
        addRejection(normalized.error);
        continue;
      }
      const plan = normalized.value;
      const schoolMapping = await db
        .select({ schoolId: schema.migrationMappings.schoolId })
        .from(schema.migrationMappings)
        .where(
          and(
            eq(schema.migrationMappings.sourceSystem, sourceSystem),
            eq(schema.migrationMappings.sourceCollection, "domains"),
            eq(schema.migrationMappings.sourceId, plan.domainId),
            eq(schema.migrationMappings.targetTable, "schools"),
          ),
        )
        .limit(1);
      const schoolId = schoolMapping[0]?.schoolId;
      if (!schoolId) {
        addRejection(
          rejection(plan.sourceId, "school_mapping_missing", {
            domainIdHash: digestForLog(plan.domainId),
          }),
        );
        continue;
      }

      const product = await db
        .select({ id: schema.products.id })
        .from(schema.products)
        .where(
          and(
            eq(schema.products.schoolId, schoolId),
            eq(schema.products.publicId, plan.entityId),
          ),
        )
        .limit(1);
      if (!product[0]) {
        addRejection(
          rejection(plan.sourceId, "product_mapping_missing", { entityId: plan.entityId }),
        );
        continue;
      }

      const creator = await db
        .select({ id: schema.user.id })
        .from(schema.user)
        .where(eq(schema.user.id, plan.creatorId))
        .limit(1);
      if (!creator[0]) {
        addRejection(
          rejection(plan.sourceId, "creator_not_found", {
            creatorIdHash: digestForLog(plan.creatorId),
          }),
        );
        continue;
      }

      const existingPlanId = await db
        .select({ id: schema.storefrontPlans.id })
        .from(schema.storefrontPlans)
        .where(eq(schema.storefrontPlans.publicId, plan.sourceId))
        .limit(1);
      if (existingPlanId[0]) {
        addRejection(rejection(plan.sourceId, "plan_conflict"));
        continue;
      }

      const productPlans = await db
        .select()
        .from(schema.storefrontPlans)
        .where(eq(schema.storefrontPlans.productId, product[0].id));
      const productKey = product[0].id;
      const keys = plannedKeys.get(productKey) ?? new Set<string>();
      if (plan.status === "active") {
        const key = activePlanKey(plan);
        const existingDuplicate = productPlans.some(
          (existing) =>
            existing.status === "active" &&
            activePlanKey({
              type:
                existing.kind === "one_time"
                  ? "onetime"
                  : existing.kind === "installment"
                    ? "emi"
                    : existing.kind,
              billingInterval: existing.billingInterval,
            }) === key,
        );
        if (existingDuplicate || keys.has(key)) {
          addRejection(
            rejection(plan.sourceId, "duplicate_active_plan", { productId: productKey }),
          );
          continue;
        }
        keys.add(key);
      }
      plannedKeys.set(productKey, keys);

      if (plan.isDefault) {
        const existingDefault = productPlans.some(
          (existing) => existing.status === "active" && existing.isDefault,
        );
        if (existingDefault || plannedDefaults.has(productKey)) {
          addRejection(
            rejection(plan.sourceId, "default_plan_conflict", { productId: productKey }),
          );
          continue;
        }
        plannedDefaults.add(productKey);
      }

      candidates.push({
        ...plan,
        schoolId,
        productId: product[0].id,
      });
      counts.ready += 1;
    }

    if (mode === "apply") {
      for (const plan of candidates) {
        await db.transaction(async (tx) => {
          const planId = uuidv7(input.clock);
          await tx.insert(schema.storefrontPlans).values({
            id: planId,
            publicId: plan.sourceId,
            schoolId: plan.schoolId,
            productId: plan.productId,
            name: plan.name,
            description: plan.description,
            includedProducts: plan.includedProducts,
            providerProductId: null,
            kind: plan.kind,
            oneTimeAmount: plan.oneTimeAmount,
            emiAmount: plan.emiAmount,
            emiTotalInstallments: plan.emiTotalInstallments,
            subscriptionMonthlyAmount: plan.subscriptionMonthlyAmount,
            subscriptionYearlyAmount: plan.subscriptionYearlyAmount,
            amountMinor: plan.amountMinor,
            billingInterval: plan.billingInterval,
            installmentCount: plan.installmentCount,
            status: plan.status,
            isDefault: plan.isDefault,
            createdBy: plan.creatorId,
            createdAt: plan.createdAt,
            updatedAt: plan.updatedAt,
          });
          await tx.insert(schema.migrationMappings).values({
            id: uuidv7(input.clock),
            sourceSystem,
            sourceCollection: SOURCE_COLLECTION,
            sourceId: plan.sourceId,
            targetTable: "storefront_plans",
            targetId: planId,
            schoolId: plan.schoolId,
            runId,
            createdAt: now,
          });
          await tx.insert(schema.auditEvents).values({
            id: uuidv7(input.clock),
            schoolId: plan.schoolId,
            actorId: plan.creatorId,
            action: "migration.payment_plan_imported",
            resourceType: "storefront_plan",
            resourceId: plan.sourceId,
            requestId: `migration:${runId}`,
            createdAt: now,
          });
        });
        counts.imported += 1;
      }
    }

    if (rejections.length > 0) {
      await db.insert(schema.migrationRejections).values(
        rejections.map((item) => ({
          id: uuidv7(input.clock),
          runId,
          sourceSystem,
          sourceCollection: SOURCE_COLLECTION,
          sourceId: item.sourceId,
          code: item.code,
          details: item.details,
          createdAt: now,
        })),
      );
    }
    await db
      .update(schema.migrationRuns)
      .set({
        status: "succeeded",
        counts: persistableCounts(counts, rejectionByCode),
        completedAt: input.clock.now(),
      })
      .where(eq(schema.migrationRuns.id, runId));
  } catch (error) {
    await db
      .update(schema.migrationRuns)
      .set({
        status: "failed",
        counts: persistableCounts(counts, rejectionByCode),
        errorCode: error instanceof Error ? error.name : "unknown_error",
        completedAt: input.clock.now(),
      })
      .where(eq(schema.migrationRuns.id, runId));
    throw error;
  }

  return {
    runId,
    sourceSystem,
    mode,
    status: "succeeded",
    counts,
    rejectionByCode,
    rejections,
  };
}
