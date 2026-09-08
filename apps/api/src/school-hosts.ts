import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { resolveTxt } from "node:dns/promises";
import {
  type Clock,
  createPlatformError,
  type PlatformError,
  uuidv7,
} from "@codelitdev/platform";
import { and, eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { normalizeCustomHostname } from "./school-host.js";
import type { AppDb } from "./types.js";

export type SchoolHostDto = {
  hostname: string;
  kind: "subdomain" | "custom";
  verificationStatus: "verified" | "unverified";
  verifiedAt: string | null;
  isPrimary: boolean;
};

export type CreateSchoolHostResult = {
  host: SchoolHostDto;
  verification: {
    method: "dns_txt";
    name: string;
    value: string;
  };
};

function toDto(row: typeof schema.schoolHosts.$inferSelect): SchoolHostDto {
  return {
    hostname: row.hostname,
    kind: row.kind,
    verificationStatus: row.verificationStatus,
    verifiedAt: row.verifiedAt?.toISOString() ?? null,
    isPrimary: row.isPrimary,
  };
}

function tokenDigest(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function tokenMatches(token: string, digest: string): boolean {
  const actual = Buffer.from(tokenDigest(token), "hex");
  const expected = Buffer.from(digest, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function verificationRecord(hostname: string, token: string) {
  return {
    method: "dns_txt" as const,
    name: `_courselit-verification.${hostname}`,
    value: token,
  };
}

export async function listSchoolHosts(
  db: AppDb,
  schoolId: string,
): Promise<SchoolHostDto[]> {
  const rows = await db
    .select()
    .from(schema.schoolHosts)
    .where(eq(schema.schoolHosts.schoolId, schoolId));
  return rows.map(toDto);
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
    .select({ id: schema.schoolHosts.id })
    .from(schema.schoolHosts)
    .where(eq(schema.schoolHosts.hostname, hostname))
    .limit(1);
  if (existing[0]) {
    return {
      ok: false,
      error: createPlatformError("conflict", {
        safeDetails: { reason: "hostname_taken" },
      }),
    };
  }

  const now = clock.now();
  const token = randomBytes(32).toString("base64url");
  const row = {
    id: uuidv7(clock),
    schoolId: input.schoolId,
    hostname,
    kind: "custom" as const,
    verificationStatus: "unverified" as const,
    verificationTokenDigest: tokenDigest(token),
    verifiedAt: null,
    isPrimary: false,
    createdAt: now,
    updatedAt: now,
  };
  await db.transaction(async (tx) => {
    await tx.insert(schema.schoolHosts).values(row);
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
      host: toDto(row),
      verification: verificationRecord(hostname, token),
    },
  };
}

export async function verifySchoolCustomHost(
  db: AppDb,
  input: {
    schoolId: string;
    actorId: string;
    hostname: string;
    token: string;
    requestId: string;
    verify: (hostname: string, token: string) => Promise<boolean>;
  },
  clock: Clock,
): Promise<{ ok: true; value: SchoolHostDto } | { ok: false; error: PlatformError }> {
  const hostname = normalizeCustomHostname(input.hostname);
  const token = input.token.trim();
  if (!hostname || token.length === 0) {
    return { ok: false, error: createPlatformError("validation_failed") };
  }
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
  if (row.kind !== "custom") {
    return {
      ok: false,
      error: createPlatformError("conflict", {
        safeDetails: { reason: "primary_host_cannot_be_verified" },
      }),
    };
  }
  if (row.verificationStatus === "verified") {
    return { ok: true, value: toDto(row) };
  }
  if (!row.verificationTokenDigest) {
    return {
      ok: false,
      error: createPlatformError("conflict", {
        safeDetails: { reason: "verification_unavailable" },
      }),
    };
  }
  if (!tokenMatches(token, row.verificationTokenDigest)) {
    return {
      ok: false,
      error: createPlatformError("validation_failed", {
        safeDetails: { reason: "invalid_verification_token" },
      }),
    };
  }
  if (!(await input.verify(hostname, token))) {
    return {
      ok: false,
      error: createPlatformError("validation_failed", {
        safeDetails: { reason: "dns_txt_not_found" },
      }),
    };
  }
  const now = clock.now();
  await db.transaction(async (tx) => {
    await tx
      .update(schema.schoolHosts)
      .set({
        verificationStatus: "verified",
        verificationTokenDigest: null,
        verifiedAt: now,
        updatedAt: now,
      })
      .where(eq(schema.schoolHosts.id, row.id));
    await tx.insert(schema.auditEvents).values({
      id: uuidv7(clock),
      schoolId: input.schoolId,
      actorId: input.actorId,
      action: "school.host_verified",
      resourceType: "school_host",
      resourceId: hostname,
      requestId: input.requestId,
      createdAt: now,
    });
  });
  return {
    ok: true,
    value: {
      ...toDto(row),
      verificationStatus: "verified",
      verifiedAt: now.toISOString(),
    },
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

export async function verifyCustomDomainTxt(
  hostname: string,
  token: string,
): Promise<boolean> {
  try {
    const records = await resolveTxt(`_courselit-verification.${hostname}`);
    return records.flat().includes(token);
  } catch {
    return false;
  }
}
