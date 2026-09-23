import {
  type Clock,
  createPlatformError,
  createPublicId,
  type PlatformError,
  uuidv7,
} from "@codelitdev/platform";
import type { MediaRef } from "@courselit/api-contract";
import { and, eq, ne, or } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { frontLitConfig, getPublicFrontLitSettings } from "./frontlit-client.js";
import { normalizeEmail } from "./invitations.js";
import {
  OWNER_PERMISSIONS,
  parsePermissions,
  serializePermissions,
  type CourseLitPermission,
} from "./permissions.js";
import { sendLitConfig } from "./sendlit-client.js";
import type { AppDb } from "./types.js";
import { CONTACT_PUBLIC_ID_PREFIX, SCHOOL_PUBLIC_ID_PREFIX } from "./public-id-prefixes.js";
import {
  parseStoredPaymentSettings,
  providerSettingsDto,
  type StoredPaymentSettings,
} from "./payments.js";
import { encryptIntegrationSecret } from "./utils/integration-secrets.js";
import { provisionSchoolCommunity } from "./spaces.js";

export type SchoolDto = {
  id: string;
  name: string;
  subdomain: string;
  status: "active" | "read_only" | "maintenance" | "migrating" | "deleted";
  locale: string;
  currency: string;
  permissions?: CourseLitPermission[];
  selected?: boolean;
  website?: {
    status: "pending" | "provisioning" | "ready" | "action_required";
    teamId: string | null;
    lastSuccessfulSyncAt: string | null;
    lastError: string | null;
    logo: MediaRef | null;
  };
};

type SchoolWebsiteDto = NonNullable<SchoolDto["website"]>;

export function toSchoolDto(
  row: typeof schema.schools.$inferSelect,
  selected?: boolean,
  permissions?: readonly CourseLitPermission[],
  website?: SchoolWebsiteDto,
): SchoolDto {
  return {
    id: row.publicId,
    name: row.name,
    subdomain: row.subdomain,
    status: row.status,
    locale: row.locale,
    currency: row.currency,
    ...(permissions === undefined ? {} : { permissions: [...permissions] }),
    ...(selected === undefined ? {} : { selected }),
    ...(website === undefined ? {} : { website }),
  };
}

export async function createSchool(
  db: AppDb,
  input: {
    name: string;
    subdomain: string;
    locale: string;
    currency: string;
    principalId: string;
    requestId: string;
  },
  clock: Clock,
): Promise<{ ok: true; value: SchoolDto } | { ok: false; error: PlatformError }> {
  const duplicate = await db
    .select()
    .from(schema.schools)
    .where(eq(schema.schools.subdomain, input.subdomain))
    .limit(1);
  if (duplicate[0]) {
    return {
      ok: false,
      error: createPlatformError("conflict", {
        safeDetails: { reason: "subdomain_taken" },
      }),
    };
  }
  const now = clock.now();
  const schoolId = uuidv7(clock);
  const publicId = createPublicId(SCHOOL_PUBLIC_ID_PREFIX, clock);
  const row = {
    id: schoolId,
    publicId,
    name: input.name,
    subdomain: input.subdomain,
    status: "active" as const,
    locale: input.locale,
    currency: input.currency,
    paymentSettingsEncrypted: null,
    codeInjectionHead: "",
    codeInjectionBody: "",
    createdAt: now,
    updatedAt: now,
  };

  const frontLit = frontLitConfig();
  const frontLitConfigured = Boolean(frontLit.server && frontLit.provisioningSecret);

  const sendLit = sendLitConfig();
  const sendLitConfigured = Boolean(sendLit.server && sendLit.provisioningApiKey);

  await db.transaction(async (tx) => {
    await tx.insert(schema.schools).values(row);
    await tx.insert(schema.schoolHosts).values({
      id: uuidv7(clock),
      schoolId,
      hostname: input.subdomain,
      kind: "subdomain",
      verificationStatus: "verified",
      verifiedAt: now,
      isPrimary: true,
      createdAt: now,
      updatedAt: now,
    });

    const [owner] = await tx
      .select({ email: schema.user.email, name: schema.user.name, image: schema.user.image })
      .from(schema.user)
      .where(eq(schema.user.id, input.principalId))
      .limit(1);
    const ownerEmail = owner?.email ?? "";
    const ownerName = owner?.name?.trim() || ownerEmail.split("@", 1)[0]?.trim() || "Owner";
    const schoolAccountId = uuidv7(clock);
    const ownerAccountPublicId = createPublicId(CONTACT_PUBLIC_ID_PREFIX, clock);

    await tx.insert(schema.schoolAccounts).values({
      id: schoolAccountId,
      publicId: ownerAccountPublicId,
      schoolId,
      userId: input.principalId,
      email: normalizeEmail(ownerEmail),
      displayName: ownerName,
      bio: "",
      avatar: owner?.image ? { url: owner.image } : null,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    const membershipId = uuidv7(clock);
    const membershipPublicId = createPublicId("mem", clock);
    await tx.insert(schema.memberships).values({
      id: membershipId,
      publicId: membershipPublicId,
      schoolId,
      schoolAccountId,
      isOwner: true,
      permissions: [],
      presetId: "full_access",
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
    await tx.insert(schema.auditEvents).values({
      id: uuidv7(clock),
      schoolId,
      actorId: input.principalId,
      action: "school.created",
      resourceType: "school",
      resourceId: publicId,
      requestId: input.requestId ?? "",
      createdAt: now,
    });
    await tx
      .delete(schema.selectedSchools)
      .where(eq(schema.selectedSchools.userId, input.principalId));
    await tx
      .insert(schema.selectedSchools)
      .values({ userId: input.principalId, schoolId });

    await tx.insert(schema.auditEvents).values({
      id: uuidv7(clock),
      schoolId,
      actorId: input.principalId,
      action: "learner.owner_profile_provisioned",
      resourceType: "learner",
      resourceId: ownerAccountPublicId,
      requestId: input.requestId ?? "",
      createdAt: now,
    });
    await provisionSchoolCommunity(
      tx as AppDb,
      {
        schoolId,
        schoolName: input.name,
        principalId: input.principalId,
        schoolAccountId,
        schoolAccountPublicId: ownerAccountPublicId,
      },
      clock,
    );

    await tx.insert(schema.schoolIntegrations).values({
      id: uuidv7(clock),
      schoolId,
      provider: "frontlit",
      server: frontLit.server ?? "",
      externalId: publicId,
      status: frontLitConfigured ? "pending" : "action_required",
      lastError: frontLitConfigured ? null : "FRONTLIT_CONFIGURATION_MISSING",
      createdAt: now,
      updatedAt: now,
    });
    await tx.insert(schema.integrationOutboxJobs).values({
      id: uuidv7(clock),
      schoolId,
      provider: "frontlit",
      type: "provision_frontlit",
      payload: {
        externalId: publicId,
        ownerEmail,
        name: input.name,
        subdomain: input.subdomain,
      },
      nextAttemptAt: now,
      createdAt: now,
      updatedAt: now,
    });

    await tx.insert(schema.schoolIntegrations).values({
      id: uuidv7(clock),
      schoolId,
      provider: "sendlit",
      server: sendLit.server ?? "",
      externalId: publicId,
      status: sendLitConfigured ? "pending" : "action_required",
      lastError: sendLitConfigured ? null : "SENDLIT_CONFIGURATION_MISSING",
      createdAt: now,
      updatedAt: now,
    });
    await tx.insert(schema.integrationOutboxJobs).values({
      id: uuidv7(clock),
      schoolId,
      provider: "sendlit",
      type: "provision_sendlit",
      payload: {
        externalId: publicId,
        name: input.name,
      },
      nextAttemptAt: now,
      createdAt: now,
      updatedAt: now,
    });
  });
  return { ok: true, value: toSchoolDto(row, true) };
}

export async function listSchoolsForUser(
  db: AppDb,
  principalId: string,
): Promise<SchoolDto[]> {
  const selectedRows = await db
    .select({ publicId: schema.schools.publicId })
    .from(schema.selectedSchools)
    .innerJoin(schema.schools, eq(schema.schools.id, schema.selectedSchools.schoolId))
    .where(eq(schema.selectedSchools.userId, principalId))
    .limit(1);
  const selectedTenantPublicId = selectedRows[0]?.publicId;
  const rows = await db
    .select({
      school: schema.schools,
      membership: schema.memberships,
      integration: schema.schoolIntegrations,
    })
    .from(schema.memberships)
    .innerJoin(schema.schools, eq(schema.schools.id, schema.memberships.schoolId))
    .innerJoin(
      schema.schoolAccounts,
      eq(schema.schoolAccounts.id, schema.memberships.schoolAccountId),
    )
    .leftJoin(
      schema.schoolIntegrations,
      and(
        eq(schema.schoolIntegrations.schoolId, schema.schools.id),
        eq(schema.schoolIntegrations.provider, "frontlit"),
      ),
    )
    .where(
      and(
        eq(schema.schoolAccounts.userId, principalId),
        eq(schema.schoolAccounts.status, "active"),
      ),
    );
  const config = frontLitConfig();
  const websiteBySchoolId = new Map<string, SchoolWebsiteDto>();
  if (config.server) {
    await Promise.all(
      rows.map(async (row) => {
        const integration = row.integration;
        if (!integration?.remoteTeamId) return;
        try {
          const settings = await getPublicFrontLitSettings(integration.remoteTeamId, {
            config,
          });
          websiteBySchoolId.set(row.school.id, {
            status: integration.status,
            teamId: integration.remoteTeamId,
            lastSuccessfulSyncAt: integration.lastSuccessfulSyncAt?.toISOString() ?? null,
            lastError: integration.lastError,
            logo: settings.logo,
          });
        } catch {
          websiteBySchoolId.set(row.school.id, {
            status: integration.status,
            teamId: integration.remoteTeamId,
            lastSuccessfulSyncAt: integration.lastSuccessfulSyncAt?.toISOString() ?? null,
            lastError: integration.lastError,
            logo: null,
          });
        }
      }),
    );
  }

  return rows.map((row) =>
    toSchoolDto(
      row.school,
      row.school.publicId === selectedTenantPublicId,
      row.membership.isOwner
        ? OWNER_PERMISSIONS
        : [...parsePermissions(row.membership.permissions)],
      websiteBySchoolId.get(row.school.id),
    ),
  );
}

export async function loadSchoolByPublicId(db: AppDb, publicId: string) {
  const identifier = publicId.trim();
  const rows = await db
    .select()
    .from(schema.schools)
    .where(
      and(
        or(
          eq(schema.schools.publicId, identifier),
          eq(schema.schools.subdomain, identifier),
        ),
        ne(schema.schools.status, "deleted"),
      ),
    )
    .limit(1);
  if (rows[0]) return rows[0];
  try {
    const hosts = await db
      .select({ school: schema.schools })
      .from(schema.schoolHosts)
      .innerJoin(schema.schools, eq(schema.schools.id, schema.schoolHosts.schoolId))
      .where(
        and(
          eq(schema.schoolHosts.hostname, identifier.toLowerCase()),
          eq(schema.schoolHosts.verificationStatus, "verified"),
          ne(schema.schools.status, "deleted"),
        ),
      )
      .limit(1);
    return hosts[0]?.school ?? null;
  } catch {
    return null;
  }
}

export async function updateSchoolCurrency(
  db: AppDb,
  input: {
    schoolId: string;
    actorId: string;
    currency: string;
    requestId?: string;
  },
  clock: Clock,
): Promise<{ ok: true; value: SchoolDto } | { ok: false; error: PlatformError }> {
  const normalizedCurrency = input.currency.trim().toUpperCase();
  if (normalizedCurrency.length !== 3) {
    return { ok: false, error: createPlatformError("validation_failed") };
  }

  const [school] = await db
    .select()
    .from(schema.schools)
    .where(eq(schema.schools.id, input.schoolId))
    .limit(1);

  if (!school) {
    return { ok: false, error: createPlatformError("not_found") };
  }

  const now = clock.now();
  let updatedRow: typeof schema.schools.$inferSelect | undefined;

  await db.transaction(async (tx) => {
    const [row] = await tx
      .update(schema.schools)
      .set({
        currency: normalizedCurrency,
        updatedAt: now,
      })
      .where(eq(schema.schools.id, input.schoolId))
      .returning();
    updatedRow = row;

    await tx.insert(schema.auditEvents).values({
      id: uuidv7(clock),
      schoolId: school.id,
      actorId: input.actorId,
      action: "school.updated",
      resourceType: "school",
      resourceId: school.publicId,
      requestId: input.requestId ?? "",
      createdAt: now,
    });
  });

  return { ok: true, value: toSchoolDto(updatedRow!, true) };
}

export async function getSchoolPaymentSettings(db: AppDb, schoolId: string) {
  const rows = await db
    .select({ paymentSettingsEncrypted: schema.schools.paymentSettingsEncrypted })
    .from(schema.schools)
    .where(eq(schema.schools.id, schoolId))
    .limit(1);
  if (!rows[0]) return { ok: false as const, error: createPlatformError("not_found") };
  return {
    ok: true as const,
    value: providerSettingsDto(
      parseStoredPaymentSettings(rows[0].paymentSettingsEncrypted),
    ),
  };
}

export type SchoolCodeInjectionDto = {
  codeInjectionHead: string;
  codeInjectionBody: string;
};

export async function getSchoolCodeInjection(
  db: AppDb,
  schoolId: string,
): Promise<
  { ok: true; value: SchoolCodeInjectionDto } | { ok: false; error: PlatformError }
> {
  const rows = await db
    .select({
      codeInjectionHead: schema.schools.codeInjectionHead,
      codeInjectionBody: schema.schools.codeInjectionBody,
    })
    .from(schema.schools)
    .where(eq(schema.schools.id, schoolId))
    .limit(1);
  if (!rows[0]) return { ok: false, error: createPlatformError("not_found") };
  return {
    ok: true,
    value: {
      codeInjectionHead: rows[0].codeInjectionHead ?? "",
      codeInjectionBody: rows[0].codeInjectionBody ?? "",
    },
  };
}

export async function updateSchoolCodeInjection(
  db: AppDb,
  input: {
    schoolId: string;
    actorId: string;
    codeInjectionHead?: string;
    codeInjectionBody?: string;
    requestId?: string;
  },
  clock: Clock,
): Promise<
  { ok: true; value: SchoolCodeInjectionDto } | { ok: false; error: PlatformError }
> {
  const [school] = await db
    .select()
    .from(schema.schools)
    .where(eq(schema.schools.id, input.schoolId))
    .limit(1);
  if (!school) return { ok: false, error: createPlatformError("not_found") };

  const now = clock.now();
  const patch: {
    updatedAt: Date;
    codeInjectionHead?: string;
    codeInjectionBody?: string;
  } = { updatedAt: now };
  if (input.codeInjectionHead !== undefined) {
    patch.codeInjectionHead = input.codeInjectionHead;
  }
  if (input.codeInjectionBody !== undefined) {
    patch.codeInjectionBody = input.codeInjectionBody;
  }

  let updated: SchoolCodeInjectionDto | undefined;
  await db.transaction(async (tx) => {
    const [row] = await tx
      .update(schema.schools)
      .set(patch)
      .where(eq(schema.schools.id, input.schoolId))
      .returning({
        codeInjectionHead: schema.schools.codeInjectionHead,
        codeInjectionBody: schema.schools.codeInjectionBody,
      });
    updated = {
      codeInjectionHead: row?.codeInjectionHead ?? "",
      codeInjectionBody: row?.codeInjectionBody ?? "",
    };
    await tx.insert(schema.auditEvents).values({
      id: uuidv7(clock),
      schoolId: school.id,
      actorId: input.actorId,
      action: "school.updated",
      resourceType: "school",
      resourceId: school.publicId,
      requestId: input.requestId ?? "",
      createdAt: now,
    });
  });

  return { ok: true, value: updated! };
}

type PaymentSettingsPatch = {
  provider?: "stripe" | "lemonsqueezy" | "razorpay" | null;
  stripe?: { publishableKey?: string; secretKey?: string; webhookSecret?: string };
  razorpay?: { keyId?: string; keySecret?: string; webhookSecret?: string };
  lemonsqueezy?: {
    apiKey?: string;
    storeId?: string;
    oneTimeVariantId?: string;
    monthlyVariantId?: string;
    yearlyVariantId?: string;
    webhookSecret?: string;
  };
};

function mergeSecretGroup<T extends Record<string, string | undefined>>(
  current: T | undefined,
  patch: T | undefined,
): T | undefined {
  if (!patch) return current;
  const merged = { ...(current ?? {}) } as T;
  for (const [key, value] of Object.entries(patch)) {
    if (typeof value === "string" && value.trim()) {
      (merged as Record<string, string>)[key] = value.trim();
    }
  }
  return merged;
}

export async function updateSchoolPaymentSettings(
  db: AppDb,
  input: {
    schoolId: string;
    actorId: string;
    settings: PaymentSettingsPatch;
    requestId?: string;
  },
  clock: Clock,
) {
  const school = (
    await db
      .select()
      .from(schema.schools)
      .where(eq(schema.schools.id, input.schoolId))
      .limit(1)
  )[0];
  if (!school) return { ok: false as const, error: createPlatformError("not_found") };
  const current = parseStoredPaymentSettings(school.paymentSettingsEncrypted);
  const next: StoredPaymentSettings = {
    ...current,
    ...(input.settings.provider === undefined
      ? {}
      : { provider: input.settings.provider }),
    stripe: mergeSecretGroup(current.stripe, input.settings.stripe),
    razorpay: mergeSecretGroup(current.razorpay, input.settings.razorpay),
    lemonsqueezy: mergeSecretGroup(current.lemonsqueezy, input.settings.lemonsqueezy),
  };
  const now = clock.now();
  await db.transaction(async (tx) => {
    await tx
      .update(schema.schools)
      .set({
        paymentSettingsEncrypted: encryptIntegrationSecret(JSON.stringify(next)),
        updatedAt: now,
      })
      .where(eq(schema.schools.id, input.schoolId));
    await tx.insert(schema.auditEvents).values({
      id: uuidv7(clock),
      schoolId: input.schoolId,
      actorId: input.actorId,
      action: "school.payment_settings.updated",
      resourceType: "school",
      resourceId: school.publicId,
      requestId: input.requestId ?? "",
      createdAt: now,
    });
  });
  return { ok: true as const, value: providerSettingsDto(next) };
}
