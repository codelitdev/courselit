import {
  type Clock,
  createPlatformError,
  createPublicId,
  type PlatformError,
  serializeDate,
  uuidv7,
} from "@codelitdev/platform";
import { and, asc, eq, inArray, isNull, or } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import {
  kindForSourceType,
  type PlanInput,
  type StorefrontContext,
  sourceAmountsForRow,
  sourceTypeForKind,
  validatePlan,
} from "./storefront.js";
import type { AppDb } from "./types.js";

export type CommunityPlanDto = {
  id: string;
  schoolId: string;
  communityId: string;
  name: string;
  description: string;
  includedProducts: string[];
  providerProductId: string | null;
  type: "free" | "onetime" | "emi" | "subscription";
  kind: "free" | "one_time" | "subscription" | "installment";
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

type Result<T> = { ok: true; value: T } | { ok: false; error: PlatformError };

function canRead(context: StorefrontContext) {
  return Boolean(
    context.tenantId &&
      (context.permissions.has("storefront:read") ||
        context.permissions.has("communities:read")),
  );
}

function canWrite(context: StorefrontContext) {
  return Boolean(
    context.tenantId &&
      (context.permissions.has("storefront:write") ||
        context.permissions.has("communities:write")),
  );
}

function invalidPlan(reason: string): Result<never> {
  return {
    ok: false,
    error: createPlatformError("validation_failed", {
      safeDetails: { reason },
    }),
  };
}

function duplicatePlan(): Result<never> {
  return {
    ok: false,
    error: createPlatformError("conflict", {
      safeDetails: { reason: "duplicate_payment_plan" },
    }),
  };
}

function normalizeCurrency(value: string | null | undefined) {
  const currency = value?.trim().toUpperCase();
  return currency && /^[A-Z]{3}$/.test(currency) ? currency : "USD";
}

export function communityPlanToDto(
  row: typeof schema.storefrontPlans.$inferSelect,
  schoolPublicId: string,
  communityPublicId: string,
  currency: string,
): CommunityPlanDto {
  const sourceAmounts = sourceAmountsForRow(row);
  return {
    id: row.publicId,
    schoolId: schoolPublicId,
    communityId: communityPublicId,
    name: row.name,
    description: row.description,
    includedProducts: row.includedProducts,
    providerProductId: row.providerProductId,
    type: sourceTypeForKind(row.kind),
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

async function loadCommunity(db: AppDb, schoolId: string, publicId: string) {
  const rows = await db
    .select()
    .from(schema.communities)
    .where(
      and(
        eq(schema.communities.schoolId, schoolId),
        or(
          eq(schema.communities.publicId, publicId),
          eq(schema.communities.slug, publicId),
        ),
        isNull(schema.communities.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

async function loadSchool(db: AppDb, schoolId: string) {
  const rows = await db
    .select({ publicId: schema.schools.publicId, currency: schema.schools.currency })
    .from(schema.schools)
    .where(eq(schema.schools.id, schoolId))
    .limit(1);
  return rows[0] ?? null;
}

async function validateIncludedProducts(
  db: AppDb,
  schoolId: string,
  includedProducts: string[] | undefined,
) {
  const ids = includedProducts ?? [];
  if (ids.length === 0) return true;
  const rows = await db
    .select({ publicId: schema.products.publicId })
    .from(schema.products)
    .where(
      and(
        eq(schema.products.schoolId, schoolId),
        inArray(schema.products.publicId, ids),
      ),
    );
  return new Set(rows.map((row) => row.publicId)).size === new Set(ids).size;
}

export async function listCommunityPlans(
  db: AppDb,
  context: StorefrontContext,
  schoolPublicId: string,
  communityPublicId: string,
): Promise<Result<CommunityPlanDto[]>> {
  if (!canRead(context)) return { ok: false, error: createPlatformError("forbidden") };
  const community = await loadCommunity(db, context.tenantId!, communityPublicId);
  const school = await loadSchool(db, context.tenantId!);
  if (!community || !school)
    return { ok: false, error: createPlatformError("not_found") };
  const rows = await db
    .select()
    .from(schema.storefrontPlans)
    .where(
      and(
        eq(schema.storefrontPlans.schoolId, context.tenantId!),
        eq(schema.storefrontPlans.entityType, "community"),
        eq(schema.storefrontPlans.entityId, community.publicId),
      ),
    )
    .orderBy(asc(schema.storefrontPlans.createdAt));
  return {
    ok: true,
    value: rows.map((row) =>
      communityPlanToDto(
        row,
        schoolPublicId,
        community.publicId,
        normalizeCurrency(school.currency),
      ),
    ),
  };
}

export async function listPublicCommunityPlans(
  db: AppDb,
  school: { schoolId: string; publicId: string },
  communityPublicId: string,
): Promise<Result<CommunityPlanDto[]>> {
  const community = await loadCommunity(db, school.schoolId, communityPublicId);
  const schoolRow = await loadSchool(db, school.schoolId);
  if (!community || community.deletedAt || !schoolRow) {
    return { ok: false, error: createPlatformError("not_found") };
  }
  const rows = await db
    .select()
    .from(schema.storefrontPlans)
    .where(
      and(
        eq(schema.storefrontPlans.schoolId, school.schoolId),
        eq(schema.storefrontPlans.entityType, "community"),
        eq(schema.storefrontPlans.entityId, community.publicId),
        eq(schema.storefrontPlans.status, "active"),
      ),
    )
    .orderBy(asc(schema.storefrontPlans.createdAt));
  return {
    ok: true,
    value: rows.map((row) =>
      communityPlanToDto(
        row,
        school.publicId,
        community.publicId,
        normalizeCurrency(schoolRow.currency),
      ),
    ),
  };
}

export async function createCommunityPlan(
  db: AppDb,
  context: StorefrontContext,
  schoolPublicId: string,
  communityPublicId: string,
  input: PlanInput,
  clock: Clock,
): Promise<Result<CommunityPlanDto>> {
  if (!canWrite(context)) return { ok: false, error: createPlatformError("forbidden") };
  const community = await loadCommunity(db, context.tenantId!, communityPublicId);
  const school = await loadSchool(db, context.tenantId!);
  if (!community || !school)
    return { ok: false, error: createPlatformError("not_found") };
  const checked = validatePlan(input, { allowIncludedProducts: true });
  if (!checked.ok) return checked;
  if (
    !(await validateIncludedProducts(db, context.tenantId!, input.includedProducts))
  ) {
    return invalidPlan("invalid_included_products");
  }
  const now = clock.now();
  try {
    return await db.transaction(async (tx) => {
      const existing = await tx
        .select()
        .from(schema.storefrontPlans)
        .where(
          and(
            eq(schema.storefrontPlans.entityType, "community"),
            eq(schema.storefrontPlans.entityId, community.publicId),
            eq(schema.storefrontPlans.status, "active"),
          ),
        );
      const row = {
        id: uuidv7(clock),
        publicId: createPublicId("pln", clock),
        schoolId: context.tenantId!,
        entityType: "community" as const,
        entityId: community.publicId,
        name: input.name.trim(),
        description: input.description ?? "",
        includedProducts: input.includedProducts ?? [],
        providerProductId: input.providerProductId?.trim() || null,
        kind: checked.value.kind,
        oneTimeAmount: checked.value.oneTimeAmount,
        emiAmount: checked.value.emiAmount,
        emiTotalInstallments: checked.value.emiTotalInstallments,
        subscriptionMonthlyAmount: checked.value.subscriptionMonthlyAmount,
        subscriptionYearlyAmount: checked.value.subscriptionYearlyAmount,
        amountMinor: checked.value.amountMinor,
        billingInterval: checked.value.billingInterval,
        installmentCount: checked.value.installmentCount,
        status: "active" as const,
        isDefault: existing.every((plan) => !plan.isDefault),
        createdBy: context.principalId,
        createdAt: now,
        updatedAt: now,
      };
      await tx.insert(schema.storefrontPlans).values(row);
      await tx.insert(schema.auditEvents).values({
        id: uuidv7(clock),
        schoolId: context.tenantId!,
        actorId: context.principalId,
        action: "community_payment_plan.created",
        resourceType: "community_payment_plan",
        resourceId: row.publicId,
        requestId: context.requestId,
        createdAt: now,
      });
      return {
        ok: true as const,
        value: communityPlanToDto(
          row,
          schoolPublicId,
          community.publicId,
          normalizeCurrency(school.currency),
        ),
      };
    });
  } catch (error) {
    const errorText = `${error} ${(error as any)?.cause?.message ?? ""} ${(error as any)?.cause?.constraint ?? ""} ${(error as any)?.constraint ?? ""}`;
    if (errorText.includes("storefront_plans_")) return duplicatePlan();
    throw error;
  }
}

export async function updateCommunityPlan(
  db: AppDb,
  context: StorefrontContext,
  schoolPublicId: string,
  planPublicId: string,
  input: Partial<PlanInput>,
  clock: Clock,
): Promise<Result<CommunityPlanDto>> {
  if (!canWrite(context)) return { ok: false, error: createPlatformError("forbidden") };
  const rows = await db
    .select()
    .from(schema.storefrontPlans)
    .where(
      and(
        eq(schema.storefrontPlans.schoolId, context.tenantId!),
        eq(schema.storefrontPlans.publicId, planPublicId),
        eq(schema.storefrontPlans.entityType, "community"),
      ),
    )
    .limit(1);
  const existing = rows[0];
  if (!existing) return { ok: false, error: createPlatformError("not_found") };
  if (existing.status === "archived") {
    return {
      ok: false,
      error: createPlatformError("conflict", {
        safeDetails: { reason: "plan_archived" },
      }),
    };
  }
  const community = await loadCommunity(
    db,
    context.tenantId!,
    existing.entityId,
  );
  const school = await loadSchool(db, context.tenantId!);
  if (!community || !school)
    return { ok: false, error: createPlatformError("not_found") };
  const current = sourceAmountsForRow(existing);
  const nextType =
    input.type ??
    (input.kind ? sourceTypeForKind(input.kind) : sourceTypeForKind(existing.kind));
  const preserve = nextType === sourceTypeForKind(existing.kind);
  const nextProviderProductId =
    input.providerProductId === undefined
      ? existing.providerProductId
      : input.providerProductId;
  const checked = validatePlan(
    {
      name: input.name?.trim() ?? existing.name,
      description: input.description ?? existing.description,
      includedProducts: input.includedProducts ?? existing.includedProducts,
      providerProductId: nextProviderProductId,
      type: nextType,
      kind: input.kind ?? (input.type ? kindForSourceType(input.type) : existing.kind),
      oneTimeAmount:
        input.oneTimeAmount ?? (preserve ? current.oneTimeAmount : undefined),
      emiAmount: input.emiAmount ?? (preserve ? current.emiAmount : undefined),
      emiTotalInstallments:
        input.emiTotalInstallments ??
        (preserve ? current.emiTotalInstallments : undefined),
      subscriptionMonthlyAmount:
        input.subscriptionMonthlyAmount ??
        (preserve ? current.subscriptionMonthlyAmount : undefined),
      subscriptionYearlyAmount:
        input.subscriptionYearlyAmount ??
        (preserve ? current.subscriptionYearlyAmount : undefined),
      amountMinor: input.amountMinor,
      billingInterval:
        input.billingInterval !== undefined
          ? input.billingInterval
          : preserve
            ? existing.billingInterval
            : null,
      installmentCount:
        input.installmentCount !== undefined
          ? input.installmentCount
          : preserve
            ? existing.installmentCount
            : null,
    },
    { allowIncludedProducts: true },
  );
  if (!checked.ok) return checked;
  if (
    !(await validateIncludedProducts(
      db,
      context.tenantId!,
      input.includedProducts ?? existing.includedProducts,
    ))
  ) {
    return invalidPlan("invalid_included_products");
  }
  const now = clock.now();
  const next = {
    name: input.name?.trim() ?? existing.name,
    description: input.description ?? existing.description,
    includedProducts: input.includedProducts ?? existing.includedProducts,
    providerProductId: nextProviderProductId?.trim() || null,
    kind: checked.value.kind,
    oneTimeAmount: checked.value.oneTimeAmount,
    emiAmount: checked.value.emiAmount,
    emiTotalInstallments: checked.value.emiTotalInstallments,
    subscriptionMonthlyAmount: checked.value.subscriptionMonthlyAmount,
    subscriptionYearlyAmount: checked.value.subscriptionYearlyAmount,
    amountMinor: checked.value.amountMinor,
    billingInterval: checked.value.billingInterval,
    installmentCount: checked.value.installmentCount,
    updatedAt: now,
  };
  try {
    await db.transaction(async (tx) => {
      await tx
        .update(schema.storefrontPlans)
        .set(next)
        .where(eq(schema.storefrontPlans.id, existing.id));
      await tx.insert(schema.auditEvents).values({
        id: uuidv7(clock),
        schoolId: context.tenantId!,
        actorId: context.principalId,
        action: "community_payment_plan.updated",
        resourceType: "community_payment_plan",
        resourceId: existing.publicId,
        requestId: context.requestId,
        createdAt: now,
      });
    });
  } catch (error) {
    const errorText = `${error} ${(error as any)?.cause?.message ?? ""} ${(error as any)?.cause?.constraint ?? ""} ${(error as any)?.constraint ?? ""}`;
    if (errorText.includes("storefront_plans_")) return duplicatePlan();
    throw error;
  }
  return {
    ok: true,
    value: communityPlanToDto(
      { ...existing, ...next },
      schoolPublicId,
      community.publicId,
      normalizeCurrency(school.currency),
    ),
  };
}

export async function setDefaultCommunityPlan(
  db: AppDb,
  context: StorefrontContext,
  schoolPublicId: string,
  planPublicId: string,
  clock: Clock,
): Promise<Result<CommunityPlanDto>> {
  if (!canWrite(context)) return { ok: false, error: createPlatformError("forbidden") };
  return db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(schema.storefrontPlans)
      .where(
        and(
          eq(schema.storefrontPlans.schoolId, context.tenantId!),
          eq(schema.storefrontPlans.publicId, planPublicId),
          eq(schema.storefrontPlans.entityType, "community"),
        ),
      )
      .limit(1);
    const row = rows[0];
    if (!row) return { ok: false as const, error: createPlatformError("not_found") };
    if (row.status === "archived")
      return { ok: false as const, error: createPlatformError("conflict") };
    const now = clock.now();
    await tx
      .update(schema.storefrontPlans)
      .set({ isDefault: false, updatedAt: now })
      .where(
        and(
          eq(schema.storefrontPlans.entityType, "community"),
          eq(schema.storefrontPlans.entityId, row.entityId),
          eq(schema.storefrontPlans.status, "active"),
        ),
      );
    await tx
      .update(schema.storefrontPlans)
      .set({ isDefault: true, updatedAt: now })
      .where(eq(schema.storefrontPlans.id, row.id));
    const school = await loadSchool(tx, context.tenantId!);
    if (!school) return { ok: false as const, error: createPlatformError("not_found") };
    const community = await loadCommunity(tx, context.tenantId!, row.entityId);
    if (!community)
      return { ok: false as const, error: createPlatformError("not_found") };
    await tx.insert(schema.auditEvents).values({
      id: uuidv7(clock),
      schoolId: context.tenantId!,
      actorId: context.principalId,
      action: "community_payment_plan.defaulted",
      resourceType: "community_payment_plan",
      resourceId: row.publicId,
      requestId: context.requestId,
      createdAt: now,
    });
    return {
      ok: true as const,
      value: communityPlanToDto(
        { ...row, isDefault: true, updatedAt: now },
        schoolPublicId,
        community.publicId,
        normalizeCurrency(school.currency),
      ),
    };
  });
}

export async function archiveCommunityPlan(
  db: AppDb,
  context: StorefrontContext,
  schoolPublicId: string,
  planPublicId: string,
  clock: Clock,
): Promise<Result<CommunityPlanDto>> {
  if (!canWrite(context)) return { ok: false, error: createPlatformError("forbidden") };
  const rows = await db
    .select()
    .from(schema.storefrontPlans)
    .where(
      and(
        eq(schema.storefrontPlans.schoolId, context.tenantId!),
        eq(schema.storefrontPlans.publicId, planPublicId),
        eq(schema.storefrontPlans.entityType, "community"),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) return { ok: false, error: createPlatformError("not_found") };
  if (row.status === "archived") {
    return {
      ok: false,
      error: createPlatformError("conflict", {
        safeDetails: { reason: "plan_archived" },
      }),
    };
  }
  if (row.isDefault) {
    return {
      ok: false,
      error: createPlatformError("conflict", {
        safeDetails: { reason: "default_plan_cannot_be_archived" },
      }),
    };
  }
  const now = clock.now();
  const community = await loadCommunity(db, context.tenantId!, row.entityId);
  const school = await loadSchool(db, context.tenantId!);
  if (!school || !community)
    return { ok: false, error: createPlatformError("not_found") };
  await db.transaction(async (tx) => {
    await tx
      .update(schema.storefrontPlans)
      .set({ status: "archived", isDefault: false, updatedAt: now })
      .where(eq(schema.storefrontPlans.id, row.id));
    await tx.insert(schema.auditEvents).values({
      id: uuidv7(clock),
      schoolId: context.tenantId!,
      actorId: context.principalId,
      action: "community_payment_plan.archived",
      resourceType: "community_payment_plan",
      resourceId: row.publicId,
      requestId: context.requestId,
      createdAt: now,
    });
  });
  return {
    ok: true,
      value: communityPlanToDto(
      { ...row, status: "archived", isDefault: false, updatedAt: now },
      schoolPublicId,
      community.publicId,
      normalizeCurrency(school.currency),
    ),
  };
}
