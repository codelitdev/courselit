import {
  type Clock,
  createPlatformError,
  createPublicId,
  type PlatformError,
  serializeDate,
  uuidv7,
} from "@codelitdev/platform";
import { and, asc, eq, or } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import type { CourseLitPermission } from "./permissions.js";
import type { AppDb } from "./types.js";

export type StorefrontContext = {
  tenantId: string | null;
  principalId: string;
  requestId: string;
  permissions: ReadonlySet<CourseLitPermission>;
};

type SourcePlanType = "free" | "onetime" | "emi" | "subscription";
type TargetPlanKind = "free" | "one_time" | "subscription" | "installment";

export type StorefrontPlanDto = {
  id: string;
  schoolId: string;
  productId: string;
  name: string;
  description: string;
  includedProducts: string[];
  providerProductId: string | null;
  type: SourcePlanType;
  kind: TargetPlanKind;
  currency: string;
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
  createdAt: string;
  updatedAt: string;
};

export type PlanInput = {
  name: string;
  description?: string;
  includedProducts?: string[];
  type?: SourcePlanType;
  kind?: TargetPlanKind;
  oneTimeAmount?: number | null;
  emiAmount?: number | null;
  emiTotalInstallments?: number | null;
  subscriptionMonthlyAmount?: number | null;
  subscriptionYearlyAmount?: number | null;
  amountMinor?: number;
  billingInterval?: "month" | "year" | null;
  installmentCount?: number | null;
  providerProductId?: string | null;
};

type CreatePlanInput = PlanInput;

export type NormalizedPlan = {
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
};

function forbidden(): { ok: false; error: PlatformError } {
  return { ok: false, error: createPlatformError("forbidden") };
}

function normalizeSchoolCurrency(value: string | null | undefined): string {
  const currency = value?.trim().toUpperCase();
  return currency && /^[A-Z]{3}$/.test(currency) ? currency : "USD";
}

function canRead(ctx: StorefrontContext): boolean {
  return Boolean(
    ctx.tenantId &&
      (ctx.permissions.has("storefront:read") || ctx.permissions.has("school:admin")),
  );
}

function canWrite(ctx: StorefrontContext): boolean {
  return Boolean(
    ctx.tenantId &&
      (ctx.permissions.has("storefront:write") || ctx.permissions.has("school:admin")),
  );
}

export function sourceTypeForKind(kind: TargetPlanKind): SourcePlanType {
  switch (kind) {
    case "one_time":
      return "onetime";
    case "installment":
      return "emi";
    default:
      return kind;
  }
}

export function kindForSourceType(type: SourcePlanType): TargetPlanKind {
  switch (type) {
    case "onetime":
      return "one_time";
    case "emi":
      return "installment";
    default:
      return type;
  }
}

function majorAmountToMinor(value: number): number | null {
  if (!Number.isFinite(value) || value < 0) return null;
  const minor = Math.round(value * 100);
  return Number.isSafeInteger(minor) ? minor : null;
}

function minorAmountToMajor(value: number): number {
  return Number((value / 100).toFixed(2));
}

export function sourceAmountsForRow(
  row: Pick<
    typeof schema.storefrontPlans.$inferSelect,
    | "kind"
    | "amountMinor"
    | "oneTimeAmount"
    | "emiAmount"
    | "emiTotalInstallments"
    | "subscriptionMonthlyAmount"
    | "subscriptionYearlyAmount"
    | "billingInterval"
    | "installmentCount"
  >,
) {
  const type = sourceTypeForKind(row.kind);
  const fallback = minorAmountToMajor(row.amountMinor);
  return {
    oneTimeAmount: row.oneTimeAmount ?? (type === "onetime" ? fallback : null),
    emiAmount: row.emiAmount ?? (type === "emi" ? fallback : null),
    emiTotalInstallments:
      row.emiTotalInstallments ?? (type === "emi" ? row.installmentCount : null),
    subscriptionMonthlyAmount:
      row.subscriptionMonthlyAmount ??
      (type === "subscription" && row.billingInterval === "month" ? fallback : null),
    subscriptionYearlyAmount:
      row.subscriptionYearlyAmount ??
      (type === "subscription" && row.billingInterval === "year" ? fallback : null),
  };
}

/**
 * Return the amount used by the payment adapter while honoring the source
 * PaymentPlan fields first. `amountMinor` is retained only as the normalized
 * fallback for rows created before source amount columns were introduced.
 */
export function amountMinorForPlan(
  row: typeof schema.storefrontPlans.$inferSelect,
): number {
  const amounts = sourceAmountsForRow(row);
  const sourceAmount =
    row.kind === "one_time"
      ? amounts.oneTimeAmount
      : row.kind === "installment"
        ? amounts.emiAmount
        : row.kind === "subscription"
          ? (amounts.subscriptionMonthlyAmount ?? amounts.subscriptionYearlyAmount)
          : 0;
  const normalized = sourceAmount === null ? null : majorAmountToMinor(sourceAmount);
  return normalized ?? row.amountMinor;
}

function planToDto(
  row: typeof schema.storefrontPlans.$inferSelect,
  publicSchoolId: string,
  publicProductId: string,
  currency: string,
): StorefrontPlanDto {
  const sourceType = sourceTypeForKind(row.kind);
  const sourceAmounts = sourceAmountsForRow(row);
  return {
    id: row.publicId,
    schoolId: publicSchoolId,
    productId: publicProductId,
    name: row.name,
    description: row.description,
    includedProducts: row.includedProducts,
    providerProductId: row.providerProductId,
    type: sourceType,
    kind: row.kind,
    currency,
    ...sourceAmounts,
    amountMinor: row.amountMinor,
    billingInterval: row.billingInterval,
    installmentCount: row.installmentCount,
    status: row.status,
    isDefault: row.isDefault,
    createdAt: serializeDate(row.createdAt),
    updatedAt: serializeDate(row.updatedAt),
  };
}

function invalidPlan(reason: string): { ok: false; error: PlatformError } {
  return {
    ok: false,
    error: createPlatformError("validation_failed", {
      safeDetails: { reason },
    }),
  };
}

function normalizePlanInput(
  input: PlanInput,
): { ok: true; value: NormalizedPlan } | { ok: false; error: PlatformError } {
  const type = input.type ?? (input.kind ? sourceTypeForKind(input.kind) : null);
  if (!type) return invalidPlan("invalid_plan_type");
  if (input.type && input.kind && kindForSourceType(input.type) !== input.kind) {
    return invalidPlan("invalid_plan_shape");
  }
  if (
    input.amountMinor !== undefined &&
    (!Number.isInteger(input.amountMinor) || input.amountMinor < 0)
  ) {
    return invalidPlan("invalid_amount");
  }

  const amountFromMinor =
    input.amountMinor === undefined ? null : minorAmountToMajor(input.amountMinor);
  const amountMinor = (value: number | null | undefined) => {
    if (value !== undefined && value !== null) return majorAmountToMinor(value);
    return input.amountMinor ?? null;
  };

  if (type === "free") {
    if (
      (input.amountMinor !== undefined && input.amountMinor !== 0) ||
      (input.oneTimeAmount != null && input.oneTimeAmount !== 0) ||
      (input.emiAmount != null && input.emiAmount !== 0) ||
      (input.subscriptionMonthlyAmount != null &&
        input.subscriptionMonthlyAmount !== 0) ||
      (input.subscriptionYearlyAmount != null &&
        input.subscriptionYearlyAmount !== 0) ||
      input.billingInterval ||
      input.installmentCount != null ||
      input.emiTotalInstallments != null
    ) {
      return invalidPlan("invalid_plan_shape");
    }
    return {
      ok: true,
      value: {
        type,
        kind: "free",
        oneTimeAmount: null,
        emiAmount: null,
        emiTotalInstallments: null,
        subscriptionMonthlyAmount: null,
        subscriptionYearlyAmount: null,
        amountMinor: 0,
        billingInterval: null,
        installmentCount: null,
      },
    };
  }

  if (type === "onetime") {
    const oneTimeAmount =
      input.oneTimeAmount != null ? input.oneTimeAmount : amountFromMinor;
    const normalizedMinor = amountMinor(oneTimeAmount);
    if (normalizedMinor === null || normalizedMinor <= 0) {
      return invalidPlan("invalid_plan_shape");
    }
    if (input.billingInterval || input.installmentCount != null) {
      return invalidPlan("invalid_plan_shape");
    }
    return {
      ok: true,
      value: {
        type,
        kind: "one_time",
        oneTimeAmount: oneTimeAmount ?? null,
        emiAmount: null,
        emiTotalInstallments: null,
        subscriptionMonthlyAmount: null,
        subscriptionYearlyAmount: null,
        amountMinor: normalizedMinor,
        billingInterval: null,
        installmentCount: null,
      },
    };
  }

  if (type === "emi") {
    const emiAmount = input.emiAmount != null ? input.emiAmount : amountFromMinor;
    const installments =
      input.emiTotalInstallments != null
        ? input.emiTotalInstallments
        : input.installmentCount;
    const normalizedMinor = amountMinor(emiAmount);
    if (
      normalizedMinor === null ||
      normalizedMinor <= 0 ||
      !Number.isInteger(installments) ||
      installments! < 2 ||
      installments! > 60
    ) {
      return invalidPlan("invalid_plan_shape");
    }
    return {
      ok: true,
      value: {
        type,
        kind: "installment",
        oneTimeAmount: null,
        emiAmount: emiAmount ?? null,
        emiTotalInstallments: installments!,
        subscriptionMonthlyAmount: null,
        subscriptionYearlyAmount: null,
        amountMinor: normalizedMinor,
        // The target checkout adapter historically exposed an interval for
        // installment plans. Keep its default while the source model remains
        // the authority for the EMI amount/count fields.
        billingInterval: input.billingInterval ?? "month",
        installmentCount: installments!,
      },
    };
  }

  const monthly =
    input.subscriptionMonthlyAmount != null
      ? input.subscriptionMonthlyAmount
      : input.billingInterval === "month"
        ? amountFromMinor
        : null;
  const yearly =
    input.subscriptionYearlyAmount != null
      ? input.subscriptionYearlyAmount
      : input.billingInterval === "year"
        ? amountFromMinor
        : null;
  const monthlyMinor = monthly == null ? null : majorAmountToMinor(monthly);
  const yearlyMinor = yearly == null ? null : majorAmountToMinor(yearly);
  const monthlyValid = monthlyMinor !== null && monthlyMinor > 0;
  const yearlyValid = yearlyMinor !== null && yearlyMinor > 0;
  if (monthlyValid === yearlyValid || input.installmentCount != null) {
    return invalidPlan("invalid_plan_shape");
  }
  return {
    ok: true,
    value: {
      type,
      kind: "subscription",
      oneTimeAmount: null,
      emiAmount: null,
      emiTotalInstallments: null,
      subscriptionMonthlyAmount: monthlyValid ? monthly! : null,
      subscriptionYearlyAmount: yearlyValid ? yearly! : null,
      amountMinor: monthlyValid ? monthlyMinor! : yearlyMinor!,
      billingInterval: monthlyValid ? "month" : "year",
      installmentCount: null,
    },
  };
}

export function validatePlan(
  input: PlanInput,
  options: { allowIncludedProducts?: boolean } = {},
): { ok: true; value: NormalizedPlan } | { ok: false; error: PlatformError } {
  const name = input.name.trim();
  if (!name || name.length > 200) {
    return invalidPlan("invalid_plan_name");
  }
  if (input.description !== undefined && input.description.length > 2_000) {
    return invalidPlan("invalid_plan_description");
  }
  if (!options.allowIncludedProducts && input.includedProducts?.length) {
    return invalidPlan("included_products_not_allowed");
  }
  if (
    input.includedProducts?.some(
      (productId) => typeof productId !== "string" || !productId.trim(),
    )
  ) {
    return invalidPlan("invalid_included_products");
  }
  if (
    input.providerProductId !== undefined &&
    input.providerProductId !== null &&
    (!input.providerProductId.trim() || input.providerProductId.trim().length > 200)
  ) {
    return invalidPlan("invalid_provider_product_id");
  }
  return normalizePlanInput(input);
}

function duplicatePlanError(): { ok: false; error: PlatformError } {
  return {
    ok: false,
    error: createPlatformError("conflict", {
      safeDetails: { reason: "duplicate_payment_plan" },
    }),
  };
}

function isDuplicatePlan(
  candidate: NormalizedPlan,
  existing: typeof schema.storefrontPlans.$inferSelect,
  currentPlanId?: string,
): boolean {
  if (currentPlanId && existing.id === currentPlanId) return false;
  if (
    existing.status !== "active" ||
    sourceTypeForKind(existing.kind) !== candidate.type
  ) {
    return false;
  }
  if (candidate.type !== "subscription") return true;
  const existingAmounts = sourceAmountsForRow(existing);
  return candidate.subscriptionMonthlyAmount !== null
    ? existingAmounts.subscriptionMonthlyAmount !== null
    : existingAmounts.subscriptionYearlyAmount !== null;
}

async function loadProduct(db: AppDb, schoolId: string, productPublicId: string) {
  const rows = await db
    .select()
    .from(schema.products)
    .where(
      and(
        eq(schema.products.schoolId, schoolId),
        or(
          eq(schema.products.publicId, productPublicId),
          eq(schema.products.slug, productPublicId),
        ),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

async function loadSchoolCurrency(db: AppDb, schoolId: string): Promise<string> {
  const rows = await db
    .select({ currency: schema.schools.currency })
    .from(schema.schools)
    .where(eq(schema.schools.id, schoolId))
    .limit(1);
  return normalizeSchoolCurrency(rows[0]?.currency);
}

export async function listPlans(
  db: AppDb,
  ctx: StorefrontContext,
  publicSchoolId: string,
  productPublicId: string,
): Promise<
  { ok: true; value: StorefrontPlanDto[] } | { ok: false; error: PlatformError }
> {
  if (!canRead(ctx)) return forbidden();
  const product = await loadProduct(db, ctx.tenantId!, productPublicId);
  if (!product) return { ok: false, error: createPlatformError("not_found") };
  const currency = await loadSchoolCurrency(db, ctx.tenantId!);
  const rows = await db
    .select()
    .from(schema.storefrontPlans)
    .where(
      and(
        eq(schema.storefrontPlans.schoolId, ctx.tenantId!),
        eq(schema.storefrontPlans.productId, product.id),
      ),
    )
    .orderBy(asc(schema.storefrontPlans.createdAt));
  return {
    ok: true,
    value: rows.map((row) =>
      planToDto(row, publicSchoolId, product.publicId, currency),
    ),
  };
}

export async function listPublicPlans(
  db: AppDb,
  school: { schoolId: string; publicId: string; currency: string },
  productPublicId: string,
): Promise<
  { ok: true; value: StorefrontPlanDto[] } | { ok: false; error: PlatformError }
> {
  const product = await loadProduct(db, school.schoolId, productPublicId);
  if (product?.status !== "published") {
    return { ok: false, error: createPlatformError("not_found") };
  }
  const currency = normalizeSchoolCurrency(school.currency);
  const rows = await db
    .select()
    .from(schema.storefrontPlans)
    .where(
      and(
        eq(schema.storefrontPlans.schoolId, school.schoolId),
        eq(schema.storefrontPlans.productId, product.id),
        eq(schema.storefrontPlans.status, "active"),
      ),
    )
    .orderBy(asc(schema.storefrontPlans.createdAt));
  return {
    ok: true,
    value: rows.map((row) =>
      planToDto(row, school.publicId, product.publicId, currency),
    ),
  };
}

export async function createPlan(
  db: AppDb,
  ctx: StorefrontContext,
  publicSchoolId: string,
  productPublicId: string,
  input: CreatePlanInput,
  clock: Clock,
): Promise<
  { ok: true; value: StorefrontPlanDto } | { ok: false; error: PlatformError }
> {
  if (!canWrite(ctx)) return forbidden();
  const product = await loadProduct(db, ctx.tenantId!, productPublicId);
  if (!product) return { ok: false, error: createPlatformError("not_found") };
  const currency = await loadSchoolCurrency(db, ctx.tenantId!);
  const checked = validatePlan(input);
  if (!checked.ok) return checked;
  const now = clock.now();
  try {
    return await db.transaction(async (tx) => {
      const defaults = await tx
        .select({ id: schema.storefrontPlans.id })
        .from(schema.storefrontPlans)
        .where(
          and(
            eq(schema.storefrontPlans.productId, product.id),
            eq(schema.storefrontPlans.status, "active"),
            eq(schema.storefrontPlans.isDefault, true),
          ),
        )
        .limit(1);
      const existingPlans = await tx
        .select()
        .from(schema.storefrontPlans)
        .where(
          and(
            eq(schema.storefrontPlans.productId, product.id),
            eq(schema.storefrontPlans.status, "active"),
          ),
        );
      if (existingPlans.some((plan) => isDuplicatePlan(checked.value, plan))) {
        return duplicatePlanError();
      }
      const row = {
        id: uuidv7(clock),
        publicId: createPublicId("pln", clock),
        schoolId: ctx.tenantId!,
        productId: product.id,
        name: input.name.trim(),
        description: input.description ?? "",
        includedProducts: input.includedProducts ?? [],
        kind: checked.value.kind,
        oneTimeAmount: checked.value.oneTimeAmount,
        emiAmount: checked.value.emiAmount,
        emiTotalInstallments: checked.value.emiTotalInstallments,
        subscriptionMonthlyAmount: checked.value.subscriptionMonthlyAmount,
        subscriptionYearlyAmount: checked.value.subscriptionYearlyAmount,
        amountMinor: checked.value.amountMinor,
        billingInterval: checked.value.billingInterval,
        installmentCount: checked.value.installmentCount,
        providerProductId: input.providerProductId?.trim() || null,
        status: "active" as const,
        isDefault: defaults.length === 0,
        createdBy: ctx.principalId,
        createdAt: now,
        updatedAt: now,
      };
      await tx.insert(schema.storefrontPlans).values(row);
      await tx.insert(schema.auditEvents).values({
        id: uuidv7(clock),
        schoolId: ctx.tenantId!,
        actorId: ctx.principalId,
        action: "storefront_plan.created",
        resourceType: "storefront_plan",
        resourceId: row.publicId,
        requestId: ctx.requestId,
        createdAt: now,
      });
      return {
        ok: true as const,
        value: planToDto(row, publicSchoolId, product.publicId, currency),
      };
    });
  } catch (error) {
    if (
      String(error).includes("storefront_plans_active_") &&
      String(error).includes("_uidx")
    ) {
      return {
        ok: false,
        error: createPlatformError("conflict", {
          safeDetails: { reason: "duplicate_payment_plan" },
        }),
      };
    }
    throw error;
  }
}

export async function updatePlan(
  db: AppDb,
  ctx: StorefrontContext,
  publicSchoolId: string,
  planPublicId: string,
  input: {
    name?: string;
    description?: string;
    includedProducts?: string[];
    type?: SourcePlanType;
    kind?: TargetPlanKind;
    oneTimeAmount?: number | null;
    emiAmount?: number | null;
    emiTotalInstallments?: number | null;
    subscriptionMonthlyAmount?: number | null;
    subscriptionYearlyAmount?: number | null;
    amountMinor?: number;
    billingInterval?: "month" | "year" | null;
    installmentCount?: number | null;
    providerProductId?: string | null;
  },
  clock: Clock,
): Promise<
  { ok: true; value: StorefrontPlanDto } | { ok: false; error: PlatformError }
> {
  if (!canWrite(ctx)) return forbidden();
  return db.transaction(async (tx) => {
    const rows = await tx
      .select({
        plan: schema.storefrontPlans,
        product: schema.products,
        school: schema.schools,
      })
      .from(schema.storefrontPlans)
      .innerJoin(
        schema.products,
        eq(schema.products.id, schema.storefrontPlans.productId),
      )
      .innerJoin(schema.schools, eq(schema.schools.id, schema.storefrontPlans.schoolId))
      .where(
        and(
          eq(schema.storefrontPlans.publicId, planPublicId),
          eq(schema.storefrontPlans.schoolId, ctx.tenantId!),
        ),
      )
      .limit(1);
    const row = rows[0];
    if (!row) return { ok: false as const, error: createPlatformError("not_found") };
    if (row.plan.status === "archived") {
      return {
        ok: false as const,
        error: createPlatformError("conflict", {
          safeDetails: { reason: "plan_archived" },
        }),
      };
    }
    const nextType =
      input.type ??
      (input.kind ? sourceTypeForKind(input.kind) : sourceTypeForKind(row.plan.kind));
    const nextKind =
      input.kind ?? (input.type ? kindForSourceType(input.type) : row.plan.kind);
    const currentType = sourceTypeForKind(row.plan.kind);
    const preserveCurrentPlanFields = nextType === currentType;
    const currentAmounts = sourceAmountsForRow(row.plan);
    const candidate: PlanInput = {
      name: input.name?.trim() ?? row.plan.name,
      description: input.description ?? row.plan.description,
      includedProducts: input.includedProducts ?? row.plan.includedProducts,
      type: nextType,
      kind: nextKind,
      oneTimeAmount:
        input.oneTimeAmount !== undefined
          ? input.oneTimeAmount
          : preserveCurrentPlanFields
            ? currentAmounts.oneTimeAmount
            : undefined,
      emiAmount:
        input.emiAmount !== undefined
          ? input.emiAmount
          : preserveCurrentPlanFields
            ? currentAmounts.emiAmount
            : undefined,
      emiTotalInstallments:
        input.emiTotalInstallments !== undefined
          ? input.emiTotalInstallments
          : preserveCurrentPlanFields
            ? currentAmounts.emiTotalInstallments
            : undefined,
      subscriptionMonthlyAmount:
        input.subscriptionMonthlyAmount !== undefined
          ? input.subscriptionMonthlyAmount
          : preserveCurrentPlanFields
            ? currentAmounts.subscriptionMonthlyAmount
            : undefined,
      subscriptionYearlyAmount:
        input.subscriptionYearlyAmount !== undefined
          ? input.subscriptionYearlyAmount
          : preserveCurrentPlanFields
            ? currentAmounts.subscriptionYearlyAmount
            : undefined,
      amountMinor: input.amountMinor,
      billingInterval:
        input.billingInterval !== undefined
          ? input.billingInterval
          : preserveCurrentPlanFields
            ? row.plan.billingInterval
            : null,
      installmentCount:
        input.installmentCount !== undefined
          ? input.installmentCount
          : preserveCurrentPlanFields
            ? row.plan.installmentCount
            : null,
      providerProductId:
        input.providerProductId === undefined
          ? row.plan.providerProductId
          : input.providerProductId,
    };
    const checked = validatePlan(candidate);
    if (!checked.ok) return { ok: false as const, error: checked.error };
    const existingPlans = await tx
      .select()
      .from(schema.storefrontPlans)
      .where(
        and(
          eq(schema.storefrontPlans.productId, row.product.id),
          eq(schema.storefrontPlans.status, "active"),
        ),
      );
    if (
      existingPlans.some((plan) =>
        isDuplicatePlan(checked.value, plan, row.plan.id),
      )
    ) {
      return duplicatePlanError();
    }
    const now = clock.now();
    const next = {
      name: candidate.name,
      description: candidate.description ?? "",
      includedProducts: candidate.includedProducts ?? [],
      kind: checked.value.kind,
      oneTimeAmount: checked.value.oneTimeAmount,
      emiAmount: checked.value.emiAmount,
      emiTotalInstallments: checked.value.emiTotalInstallments,
      subscriptionMonthlyAmount: checked.value.subscriptionMonthlyAmount,
      subscriptionYearlyAmount: checked.value.subscriptionYearlyAmount,
      amountMinor: checked.value.amountMinor,
      billingInterval: checked.value.billingInterval,
      installmentCount: checked.value.installmentCount,
      providerProductId: candidate.providerProductId?.trim() || null,
      updatedAt: now,
    };
    try {
      await tx
        .update(schema.storefrontPlans)
        .set(next)
        .where(eq(schema.storefrontPlans.id, row.plan.id));
    } catch (error) {
      if (
        String(error).includes("storefront_plans_active_") &&
        String(error).includes("_uidx")
      ) {
        return {
          ok: false as const,
          error: createPlatformError("conflict", {
            safeDetails: { reason: "duplicate_payment_plan" },
          }),
        };
      }
      throw error;
    }
    await tx.insert(schema.auditEvents).values({
      id: uuidv7(clock),
      schoolId: ctx.tenantId!,
      actorId: ctx.principalId,
      action: "storefront_plan.updated",
      resourceType: "storefront_plan",
      resourceId: row.plan.publicId,
      requestId: ctx.requestId,
      createdAt: now,
    });
    return {
      ok: true as const,
      value: planToDto(
        { ...row.plan, ...next },
        publicSchoolId,
        row.product.publicId,
        normalizeSchoolCurrency(row.school.currency),
      ),
    };
  });
}

export async function setDefaultPlan(
  db: AppDb,
  ctx: StorefrontContext,
  publicSchoolId: string,
  planPublicId: string,
  clock: Clock,
): Promise<
  { ok: true; value: StorefrontPlanDto } | { ok: false; error: PlatformError }
> {
  if (!canWrite(ctx)) return forbidden();
  return db.transaction(async (tx) => {
    const rows = await tx
      .select({
        plan: schema.storefrontPlans,
        product: schema.products,
        school: schema.schools,
      })
      .from(schema.storefrontPlans)
      .innerJoin(
        schema.products,
        eq(schema.products.id, schema.storefrontPlans.productId),
      )
      .innerJoin(schema.schools, eq(schema.schools.id, schema.storefrontPlans.schoolId))
      .where(
        and(
          eq(schema.storefrontPlans.publicId, planPublicId),
          eq(schema.storefrontPlans.schoolId, ctx.tenantId!),
        ),
      )
      .limit(1);
    const row = rows[0];
    if (!row) return { ok: false as const, error: createPlatformError("not_found") };
    if (row.plan.status !== "active") {
      return {
        ok: false as const,
        error: createPlatformError("conflict", {
          safeDetails: { reason: "plan_archived" },
        }),
      };
    }
    const now = clock.now();
    await tx
      .update(schema.storefrontPlans)
      .set({ isDefault: false, updatedAt: now })
      .where(
        and(
          eq(schema.storefrontPlans.productId, row.product.id),
          eq(schema.storefrontPlans.status, "active"),
        ),
      );
    await tx
      .update(schema.storefrontPlans)
      .set({ isDefault: true, updatedAt: now })
      .where(eq(schema.storefrontPlans.id, row.plan.id));
    await tx.insert(schema.auditEvents).values({
      id: uuidv7(clock),
      schoolId: ctx.tenantId!,
      actorId: ctx.principalId,
      action: "storefront_plan.defaulted",
      resourceType: "storefront_plan",
      resourceId: row.plan.publicId,
      requestId: ctx.requestId,
      createdAt: now,
    });
    return {
      ok: true as const,
      value: planToDto(
        { ...row.plan, isDefault: true, updatedAt: now },
        publicSchoolId,
        row.product.publicId,
        normalizeSchoolCurrency(row.school.currency),
      ),
    };
  });
}

export async function archivePlan(
  db: AppDb,
  ctx: StorefrontContext,
  publicSchoolId: string,
  planPublicId: string,
  clock: Clock,
): Promise<
  { ok: true; value: StorefrontPlanDto } | { ok: false; error: PlatformError }
> {
  if (!canWrite(ctx)) return forbidden();
  return db.transaction(async (tx) => {
    const rows = await tx
      .select({
        plan: schema.storefrontPlans,
        product: schema.products,
        school: schema.schools,
      })
      .from(schema.storefrontPlans)
      .innerJoin(
        schema.products,
        eq(schema.products.id, schema.storefrontPlans.productId),
      )
      .innerJoin(schema.schools, eq(schema.schools.id, schema.storefrontPlans.schoolId))
      .where(
        and(
          eq(schema.storefrontPlans.publicId, planPublicId),
          eq(schema.storefrontPlans.schoolId, ctx.tenantId!),
        ),
      )
      .limit(1);
    const row = rows[0];
    if (!row) return { ok: false as const, error: createPlatformError("not_found") };
    if (row.plan.isDefault) {
      return {
        ok: false as const,
        error: createPlatformError("conflict", {
          safeDetails: { reason: "default_plan_cannot_be_archived" },
        }),
      };
    }
    const now = clock.now();
    await tx
      .update(schema.storefrontPlans)
      .set({ status: "archived", isDefault: false, updatedAt: now })
      .where(eq(schema.storefrontPlans.id, row.plan.id));
    await tx.insert(schema.auditEvents).values({
      id: uuidv7(clock),
      schoolId: ctx.tenantId!,
      actorId: ctx.principalId,
      action: "storefront_plan.archived",
      resourceType: "storefront_plan",
      resourceId: row.plan.publicId,
      requestId: ctx.requestId,
      createdAt: now,
    });
    const updated = {
      ...row.plan,
      status: "archived" as const,
      updatedAt: now,
    };
    return {
      ok: true as const,
      value: planToDto(
        updated,
        publicSchoolId,
        row.product.publicId,
        normalizeSchoolCurrency(row.school.currency),
      ),
    };
  });
}
