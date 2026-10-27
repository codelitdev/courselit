import { randomBytes } from "node:crypto";
import { promises as dns } from "node:dns";
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

export type CustomDomainVerificationRecords = {
  cnameTarget: string;
  txtName: string;
  txtValue: string;
  kind: "cname" | "alias";
  txtSatisfied: boolean | null;
  routingSatisfied: boolean | null;
};

export type SchoolHostDto = {
  hostname: string;
  kind: "subdomain" | "custom";
  verificationStatus: "verified" | "unverified";
  verifiedAt: string | null;
  isPrimary: boolean;
  verificationRecords?: CustomDomainVerificationRecords | null;
};

export type CreateSchoolHostResult = {
  host: SchoolHostDto;
  verification: {
    method: "dns_txt";
    name: string;
    value: string;
  };
};

/** DNS lookups used by custom domain verification. Injectable for tests. */
export type DnsResolver = {
  resolveTxt(hostname: string): Promise<string[][]>;
  resolveCname(hostname: string): Promise<string[]>;
  resolve4(hostname: string): Promise<string[]>;
};

const systemDnsResolver: DnsResolver = {
  resolveTxt: (hostname) => dns.resolveTxt(hostname),
  resolveCname: (hostname) => dns.resolveCname(hostname),
  resolve4: (hostname) => dns.resolve4(hostname),
};

export type CustomDomainConfig = {
  cnameTarget: string;
  txtRecordName: string;
  /** Optional anycast A set for apex hosts. Empty means "name resolves". */
  aRecords: string[];
};

function normalizeDnsName(value: string): string {
  return value.trim().toLowerCase().replace(/\.$/, "");
}

export function customDomainConfig(
  env: Record<string, string | undefined> = process.env,
): CustomDomainConfig {
  const platformDomain = normalizeDnsName(env.PLATFORM_SITE_DOMAIN || "localhost");
  return {
    cnameTarget: normalizeDnsName(
      env.CUSTOM_DOMAIN_CNAME_TARGET || `sites.${platformDomain}`,
    ),
    txtRecordName: normalizeDnsName(
      env.CUSTOM_DOMAIN_TXT_RECORD_NAME || "_courselit-verification",
    ),
    aRecords: (env.CUSTOM_DOMAIN_A_RECORDS || "")
      .split(/[\s,]+/)
      .map((value) => value.trim())
      .filter(Boolean),
  };
}

/** Two labels (`example.com`) is treated as the zone apex. */
function isApexHostname(hostname: string): boolean {
  return hostname.split(".").filter(Boolean).length === 2;
}

function verificationRecords(
  row: typeof schema.schoolHosts.$inferSelect,
  config: CustomDomainConfig,
): CustomDomainVerificationRecords | null {
  if (row.kind !== "custom" || !row.verificationToken) return null;
  return {
    cnameTarget: config.cnameTarget,
    txtName: `${config.txtRecordName}.${row.hostname}`,
    txtValue: row.verificationToken,
    kind: isApexHostname(row.hostname) ? "alias" : "cname",
    txtSatisfied: row.txtSatisfied,
    routingSatisfied: row.routingSatisfied,
  };
}

function toDto(
  row: typeof schema.schoolHosts.$inferSelect,
  config: CustomDomainConfig,
): SchoolHostDto {
  return {
    hostname: row.hostname,
    kind: row.kind,
    verificationStatus: row.verificationStatus,
    verifiedAt: row.verifiedAt?.toISOString() ?? null,
    isPrimary: row.isPrimary,
    ...(row.kind === "custom"
      ? { verificationRecords: verificationRecords(row, config) }
      : {}),
  };
}

/** The TXT ownership record must contain the issued token. */
async function verifyTxtRecord(
  resolver: DnsResolver,
  hostname: string,
  token: string,
  recordName: string,
): Promise<boolean> {
  try {
    const records = await resolver.resolveTxt(`${recordName}.${hostname}`);
    return records.some((chunks) => chunks.join("").trim() === token);
  } catch {
    return false;
  }
}

async function cnameChainIncludes(
  resolver: DnsResolver,
  hostname: string,
  target: string,
): Promise<boolean> {
  const seen = new Set<string>();
  let current = hostname;
  while (!seen.has(current)) {
    seen.add(current);
    let records: string[];
    try {
      records = await resolver.resolveCname(current);
    } catch {
      return false;
    }
    const next = records.map(normalizeDnsName);
    if (next.includes(target)) return true;
    if (next.length === 0) return false;
    current = next[0]!;
  }
  return false;
}

/** Non-apex hosts must CNAME (possibly via a chain) to the target. Apex hosts
 * may use CNAME flattening; otherwise their A records must resolve and, when
 * configured, match `CUSTOM_DOMAIN_A_RECORDS`. */
async function verifyRouting(
  resolver: DnsResolver,
  hostname: string,
  config: CustomDomainConfig,
): Promise<boolean> {
  if (await cnameChainIncludes(resolver, hostname, config.cnameTarget)) return true;
  if (!isApexHostname(hostname)) return false;
  let addresses: string[];
  try {
    addresses = (await resolver.resolve4(hostname)).slice().sort();
  } catch {
    return false;
  }
  if (addresses.length === 0) return false;
  const required = config.aRecords.slice().sort();
  if (required.length === 0) return true;
  return (
    required.length === addresses.length &&
    required.every((ip, index) => ip === addresses[index])
  );
}

export async function listSchoolHosts(
  db: AppDb,
  schoolId: string,
  config: CustomDomainConfig = customDomainConfig(),
): Promise<SchoolHostDto[]> {
  const rows = await db
    .select()
    .from(schema.schoolHosts)
    .where(eq(schema.schoolHosts.schoolId, schoolId));
  return rows.map((row) => toDto(row, config));
}

/** A school has at most one custom domain. Attaching issues a TXT token the
 * owner publishes in DNS before verification. */
export async function createSchoolCustomHost(
  db: AppDb,
  input: {
    schoolId: string;
    actorId: string;
    hostname: string;
    requestId: string;
  },
  clock: Clock,
  config: CustomDomainConfig = customDomainConfig(),
): Promise<
  { ok: true; value: CreateSchoolHostResult } | { ok: false; error: PlatformError }
> {
  const hostname = normalizeCustomHostname(input.hostname);
  if (!hostname) {
    return { ok: false, error: createPlatformError("validation_failed") };
  }

  const [claimed] = await db
    .select()
    .from(schema.schoolHosts)
    .where(eq(schema.schoolHosts.hostname, hostname))
    .limit(1);
  if (claimed && claimed.schoolId !== input.schoolId) {
    return {
      ok: false,
      error: createPlatformError("conflict", {
        safeDetails: { reason: "hostname_taken" },
      }),
    };
  }

  const [currentCustom] = await db
    .select()
    .from(schema.schoolHosts)
    .where(
      and(
        eq(schema.schoolHosts.schoolId, input.schoolId),
        eq(schema.schoolHosts.kind, "custom"),
      ),
    )
    .limit(1);
  if (currentCustom && currentCustom.hostname !== hostname) {
    return {
      ok: false,
      error: createPlatformError("conflict", {
        safeDetails: { reason: "custom_domain_already_attached" },
      }),
    };
  }

  const now = clock.now();
  const row = await db.transaction(async (tx) => {
    let host = currentCustom;
    if (!host) {
      [host] = await tx
        .insert(schema.schoolHosts)
        .values({
          id: uuidv7(clock),
          schoolId: input.schoolId,
          hostname,
          kind: "custom",
          verificationStatus: "unverified",
          verificationToken: randomBytes(16).toString("hex"),
          txtSatisfied: null,
          routingSatisfied: null,
          verifiedAt: null,
          isPrimary: false,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
    } else if (!host.verificationToken) {
      [host] = await tx
        .update(schema.schoolHosts)
        .set({ verificationToken: randomBytes(16).toString("hex"), updatedAt: now })
        .where(eq(schema.schoolHosts.id, host.id))
        .returning();
    }
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
    return host!;
  });

  const records = verificationRecords(row, config)!;
  return {
    ok: true,
    value: {
      host: toDto(row, config),
      verification: {
        method: "dns_txt",
        name: records.txtName,
        value: records.txtValue,
      },
    },
  };
}

/** Checks the TXT ownership record and DNS routing. A failed re-check marks
 * a previously verified domain unverified so it stops serving the school. */
export async function verifySchoolCustomHost(
  db: AppDb,
  input: {
    schoolId: string;
    actorId: string;
    hostname: string;
    requestId: string;
  },
  clock: Clock,
  options: { config?: CustomDomainConfig; resolver?: DnsResolver } = {},
): Promise<{ ok: true; value: SchoolHostDto } | { ok: false; error: PlatformError }> {
  const config = options.config ?? customDomainConfig();
  const resolver = options.resolver ?? systemDnsResolver;
  const hostname = normalizeCustomHostname(input.hostname);
  if (!hostname) {
    return { ok: false, error: createPlatformError("validation_failed") };
  }
  const [row] = await db
    .select()
    .from(schema.schoolHosts)
    .where(
      and(
        eq(schema.schoolHosts.schoolId, input.schoolId),
        eq(schema.schoolHosts.hostname, hostname),
        eq(schema.schoolHosts.kind, "custom"),
      ),
    )
    .limit(1);
  if (!row?.verificationToken) {
    return { ok: false, error: createPlatformError("not_found") };
  }

  const txtSatisfied = await verifyTxtRecord(
    resolver,
    hostname,
    row.verificationToken,
    config.txtRecordName,
  );
  const routingSatisfied = await verifyRouting(resolver, hostname, config);
  const verified = txtSatisfied && routingSatisfied;
  const now = clock.now();

  const updated = await db.transaction(async (tx) => {
    const [next] = await tx
      .update(schema.schoolHosts)
      .set({
        verificationStatus: verified ? "verified" : "unverified",
        verifiedAt: verified ? now : null,
        txtSatisfied,
        routingSatisfied,
        updatedAt: now,
      })
      .where(eq(schema.schoolHosts.id, row.id))
      .returning();
    await tx.insert(schema.auditEvents).values({
      id: uuidv7(clock),
      schoolId: input.schoolId,
      actorId: input.actorId,
      action: verified ? "school.host_verified" : "school.host_verification_failed",
      resourceType: "school_host",
      resourceId: hostname,
      requestId: input.requestId,
      createdAt: now,
    });
    return next!;
  });
  return { ok: true, value: toDto(updated, config) };
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
  const [row] = await db
    .select()
    .from(schema.schoolHosts)
    .where(
      and(
        eq(schema.schoolHosts.schoolId, input.schoolId),
        eq(schema.schoolHosts.hostname, hostname),
      ),
    )
    .limit(1);
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
