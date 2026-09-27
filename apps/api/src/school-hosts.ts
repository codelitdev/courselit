import {
  type Clock,
  createPlatformError,
  type PlatformError,
  uuidv7,
} from "@codelitdev/platform";
import { and, eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import {
  attachFrontLitCustomDomain,
  frontLitConfig,
  getFrontLitDomainSettings,
  removeFrontLitCustomDomain,
  type FrontLitConfig,
  type FrontLitDomainSettings,
  verifyFrontLitCustomDomain,
} from "./frontlit-client.js";
import { decryptIntegrationSecret } from "./utils/integration-secrets.js";
import { normalizeCustomHostname } from "./school-host.js";
import type { AppDb } from "./types.js";

export type SchoolHostDto = {
  hostname: string;
  kind: "subdomain" | "custom";
  verificationStatus: "verified" | "unverified";
  verifiedAt: string | null;
  isPrimary: boolean;
  verificationRecords?: FrontLitDomainSettings["verificationRecords"];
};

export type CreateSchoolHostResult = {
  host: SchoolHostDto;
  verification: {
    method: "dns_txt";
    name: string;
    value: string;
  };
};

type FrontLitConnection = {
  apiKey: string;
  config: FrontLitConfig;
};

function toDto(
  row: typeof schema.schoolHosts.$inferSelect,
  verificationRecords: FrontLitDomainSettings["verificationRecords"] = null,
): SchoolHostDto {
  return {
    hostname: row.hostname,
    kind: row.kind,
    verificationStatus: row.verificationStatus,
    verifiedAt: row.verifiedAt?.toISOString() ?? null,
    isPrimary: row.isPrimary,
    ...(row.kind === "custom" ? { verificationRecords } : {}),
  };
}

async function getFrontLitConnection(
  db: AppDb,
  schoolId: string,
): Promise<FrontLitConnection | null> {
  const rows = await db
    .select()
    .from(schema.schoolIntegrations)
    .where(
      and(
        eq(schema.schoolIntegrations.schoolId, schoolId),
        eq(schema.schoolIntegrations.provider, "frontlit"),
        eq(schema.schoolIntegrations.status, "ready"),
      ),
    )
    .limit(1);
  const integration = rows[0];
  if (!integration?.encryptedTeamKey || !integration.server) return null;

  return {
    apiKey: decryptIntegrationSecret(integration.encryptedTeamKey),
    config: {
      ...frontLitConfig(),
      server: integration.server.replace(/\/$/, ""),
      provisioningSecret: null,
    },
  };
}

async function syncCustomHost(
  db: AppDb,
  schoolId: string,
  settings: FrontLitDomainSettings,
  clock: Clock,
): Promise<typeof schema.schoolHosts.$inferSelect | null> {
  const hostname = settings.customDomain?.hostname ?? null;
  const currentRows = await db
    .select()
    .from(schema.schoolHosts)
    .where(
      and(
        eq(schema.schoolHosts.schoolId, schoolId),
        eq(schema.schoolHosts.kind, "custom"),
      ),
    );

  if (!hostname) {
    if (currentRows.length > 0) {
      await db
        .delete(schema.schoolHosts)
        .where(
          and(
            eq(schema.schoolHosts.schoolId, schoolId),
            eq(schema.schoolHosts.kind, "custom"),
          ),
        );
    }
    return null;
  }

  const claimed = await db
    .select({ id: schema.schoolHosts.id, schoolId: schema.schoolHosts.schoolId })
    .from(schema.schoolHosts)
    .where(eq(schema.schoolHosts.hostname, hostname))
    .limit(1);
  if (claimed[0] && claimed[0].schoolId !== schoolId) {
    throw new Error("FrontLit domain is already mapped to another school");
  }

  const now = clock.now();
  const verified = settings.customDomain?.status === "verified";
  const existing = currentRows.find((row) => row.hostname === hostname);
  if (existing) {
    const [updated] = await db
      .update(schema.schoolHosts)
      .set({
        verificationStatus: verified ? "verified" : "unverified",
        verificationTokenDigest: null,
        verifiedAt: verified
          ? settings.customDomain?.verifiedAt
            ? new Date(settings.customDomain.verifiedAt)
            : now
          : null,
        updatedAt: now,
      })
      .where(eq(schema.schoolHosts.id, existing.id))
      .returning();
    return updated;
  }

  if (currentRows.length > 0) {
    await db
      .delete(schema.schoolHosts)
      .where(
        and(
          eq(schema.schoolHosts.schoolId, schoolId),
          eq(schema.schoolHosts.kind, "custom"),
        ),
      );
  }
  const [created] = await db
    .insert(schema.schoolHosts)
    .values({
      id: uuidv7(clock),
      schoolId,
      hostname,
      kind: "custom",
      verificationStatus: verified ? "verified" : "unverified",
      verificationTokenDigest: null,
      verifiedAt: verified
        ? settings.customDomain?.verifiedAt
          ? new Date(settings.customDomain.verifiedAt)
          : now
        : null,
      isPrimary: false,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  return created;
}

export async function listSchoolHosts(
  db: AppDb,
  schoolId: string,
  clock: Clock,
): Promise<SchoolHostDto[]> {
  const connection = await getFrontLitConnection(db, schoolId);
  let settings: FrontLitDomainSettings | null = null;
  if (connection) {
    settings = await getFrontLitDomainSettings(connection.apiKey, {
      config: connection.config,
    });
    await syncCustomHost(db, schoolId, settings, clock);
  }

  const rows = await db
    .select()
    .from(schema.schoolHosts)
    .where(eq(schema.schoolHosts.schoolId, schoolId));
  return rows.map((row) =>
    toDto(
      row,
      row.kind === "custom" && row.hostname === settings?.customDomain?.hostname
        ? settings.verificationRecords
        : null,
    ),
  );
}

export async function createSchoolCustomHost(
  db: AppDb,
  input: {
    schoolId: string;
    actorId: string;
    hostname: string;
    requestId: string;
  },
  clock: Clock,
): Promise<
  { ok: true; value: CreateSchoolHostResult } | { ok: false; error: PlatformError }
> {
  const hostname = normalizeCustomHostname(input.hostname);
  if (!hostname) {
    return { ok: false, error: createPlatformError("validation_failed") };
  }

  const existing = await db
    .select({ id: schema.schoolHosts.id, schoolId: schema.schoolHosts.schoolId })
    .from(schema.schoolHosts)
    .where(eq(schema.schoolHosts.hostname, hostname))
    .limit(1);
  if (existing[0] && existing[0].schoolId !== input.schoolId) {
    return {
      ok: false,
      error: createPlatformError("conflict", {
        safeDetails: { reason: "hostname_taken" },
      }),
    };
  }

  const connection = await getFrontLitConnection(db, input.schoolId);
  if (!connection) {
    return {
      ok: false,
      error: createPlatformError("conflict", {
        safeDetails: { reason: "website_setup_pending" },
      }),
    };
  }
  let settings = await getFrontLitDomainSettings(connection.apiKey, {
    config: connection.config,
  });
  if (settings.customDomain?.hostname !== hostname) {
    if (settings.customDomain) {
      return {
        ok: false,
        error: createPlatformError("conflict", {
          safeDetails: { reason: "custom_domain_already_attached" },
        }),
      };
    }
    settings = await attachFrontLitCustomDomain(
      connection.apiKey,
      hostname,
      { config: connection.config },
    );
  }

  const row = await syncCustomHost(db, input.schoolId, settings, clock);
  if (!row || !settings.verificationRecords) {
    return { ok: false, error: createPlatformError("internal_error") };
  }

  const now = clock.now();
  await db.transaction(async (tx) => {
    await tx.insert(schema.auditEvents).values({
      id: uuidv7(clock),
      schoolId: input.schoolId,
      actorId: input.actorId,
      action: "school.host_added",
      resourceType: "school_host",
      resourceId: hostname,
      requestId: input.requestId,
      createdAt: now,
    });
  });

  return {
    ok: true,
    value: {
      host: toDto(row, settings.verificationRecords),
      verification: {
        method: "dns_txt",
        name: settings.verificationRecords.txtName,
        value: settings.verificationRecords.txtValue,
      },
    },
  };
}

export async function verifySchoolCustomHost(
  db: AppDb,
  input: {
    schoolId: string;
    actorId: string;
    hostname: string;
    requestId: string;
  },
  clock: Clock,
): Promise<{ ok: true; value: SchoolHostDto } | { ok: false; error: PlatformError }> {
  const hostname = normalizeCustomHostname(input.hostname);
  if (!hostname) {
    return { ok: false, error: createPlatformError("validation_failed") };
  }
  const connection = await getFrontLitConnection(db, input.schoolId);
  if (!connection) {
    return { ok: false, error: createPlatformError("not_found") };
  }
  let settings = await getFrontLitDomainSettings(connection.apiKey, {
    config: connection.config,
  });
  if (settings.customDomain?.hostname !== hostname) {
    return { ok: false, error: createPlatformError("not_found") };
  }
  settings = await verifyFrontLitCustomDomain(connection.apiKey, {
    config: connection.config,
  });
  const row = await syncCustomHost(db, input.schoolId, settings, clock);
  if (!row) return { ok: false, error: createPlatformError("not_found") };

  const now = clock.now();
  await db.insert(schema.auditEvents).values({
    id: uuidv7(clock),
    schoolId: input.schoolId,
    actorId: input.actorId,
    action: "school.host_verified",
    resourceType: "school_host",
    resourceId: hostname,
    requestId: input.requestId,
    createdAt: now,
  });
  return {
    ok: true,
    value: toDto(row, settings.verificationRecords),
  };
}

export async function deleteSchoolCustomHost(
  db: AppDb,
  input: {
    schoolId: string;
    actorId: string;
    hostname: string;
    requestId: string;
  },
  clock: Clock,
): Promise<{ ok: true } | { ok: false; error: PlatformError }> {
  const hostname =
    normalizeCustomHostname(input.hostname) ?? input.hostname.trim().toLowerCase();
  const rows = await db
    .select()
    .from(schema.schoolHosts)
    .where(
      and(
        eq(schema.schoolHosts.schoolId, input.schoolId),
        eq(schema.schoolHosts.hostname, hostname),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) return { ok: false, error: createPlatformError("not_found") };
  if (row.kind !== "custom" || row.isPrimary) {
    return {
      ok: false,
      error: createPlatformError("conflict", {
        safeDetails: { reason: "primary_host_cannot_be_removed" },
      }),
    };
  }

  const connection = await getFrontLitConnection(db, input.schoolId);
  if (!connection) return { ok: false, error: createPlatformError("not_found") };
  const settings = await getFrontLitDomainSettings(connection.apiKey, {
    config: connection.config,
  });
  if (settings.customDomain?.hostname === hostname) {
    await removeFrontLitCustomDomain(connection.apiKey, {
      config: connection.config,
    });
  }

  const now = clock.now();
  await db.transaction(async (tx) => {
    await tx.delete(schema.schoolHosts).where(eq(schema.schoolHosts.id, row.id));
    await tx.insert(schema.auditEvents).values({
      id: uuidv7(clock),
      schoolId: input.schoolId,
      actorId: input.actorId,
      action: "school.host_removed",
      resourceType: "school_host",
      resourceId: hostname,
      requestId: input.requestId,
      createdAt: now,
    });
  });
  return { ok: true };
}
