import type { BillingEngine } from "@codelitdev/billing/workflows";
import type { Clock } from "@codelitdev/platform";
import { and, eq, inArray, isNotNull, isNull, lt, or } from "drizzle-orm";
import type { Logger } from "pino";
import * as schema from "./db/schema/index.js";
import { processNextPlatformJob } from "./integration-provisioning.js";
import { cleanupSsoRequests } from "./learner-sso-sign-in.js";
import { schoolsWithSendLitTeams, syncMarketingQuota } from "./marketing-quota.js";
import { schoolsWithSsoConnections, syncPlanFeatures } from "./plan-features.js";
import { SSO_DOMAIN_LABEL, ssoDnsResolver } from "./sso-admin.js";
import { notifySsoOwner, recordSsoEvent } from "./sso-events.js";
import { createDomainVerification, type DnsResolver } from "@codelitdev/platform";
import type { AppDb } from "./types.js";

type Billing = Pick<BillingEngine, "hasFeature" | "commercialState">;

/** Failed weekly checks in a row before a domain stops counting as verified. */
export const DOMAIN_FAILURES_BEFORE_UNVERIFIED = 3;
const DOMAIN_RECHECK_INTERVAL_MS = 6.5 * 24 * 60 * 60 * 1000;

/**
 * Drain the platform jobs the billing hook and SendLit provisioning queued
 * (`sync_plan_features`): SSO connections, then the SendLit marketing quota.
 */
export async function processPlatformJobs(
  db: AppDb,
  billing: Billing,
  clock: Clock,
  logger: Logger,
  mode: "cloud" | "oss" = "cloud",
): Promise<number> {
  let processed = 0;
  while (
    await processNextPlatformJob(db, clock, logger, async (job) => {
      if (job.type !== "sync_plan_features") {
        throw new Error(`Unknown platform job type: ${job.type}`);
      }
      await syncPlanFeatures(db, billing, job.schoolId, clock);
      await syncMarketingQuota({ db, billing, mode, clock }, job.schoolId);
    })
  ) {
    processed += 1;
  }
  return processed;
}

/**
 * The daily backstop for SendLit quotas (S3): sets every ready team's quota
 * from its school's plan, in case a sync job was lost or failed.
 */
export async function syncAllMarketingQuotas(
  db: AppDb,
  billing: Billing,
  clock: Clock,
  mode: "cloud" | "oss",
  logger?: Logger,
): Promise<number> {
  let synced = 0;
  for (const schoolId of await schoolsWithSendLitTeams(db)) {
    try {
      if ((await syncMarketingQuota({ db, billing, mode, clock }, schoolId)) === "updated") {
        synced += 1;
      }
    } catch (error) {
      logger?.warn(
        { schoolId, error: error instanceof Error ? error.message : String(error) },
        "marketing quota sync failed",
      );
    }
  }
  return synced;
}

/** The daily backstop: re-sync every school that has an active or suspended connection. */
export async function syncAllSsoPlanFeatures(
  db: AppDb,
  billing: Billing,
  clock: Clock,
  logger?: Logger,
): Promise<number> {
  let synced = 0;
  for (const schoolId of await schoolsWithSsoConnections(db)) {
    try {
      await syncPlanFeatures(db, billing, schoolId, clock);
      synced += 1;
    } catch (error) {
      logger?.warn(
        { schoolId, error: error instanceof Error ? error.message : String(error) },
        "SSO plan sync failed",
      );
    }
  }
  return synced;
}

/**
 * The weekly domain re-check. A verified domain whose TXT record is missing
 * is only cleared after three checks in a row, so one DNS error doesn't take
 * sign-in away. Each domain is checked at most about once a week, so running
 * this more often (or from several workers) never inflates the count.
 */
export async function recheckSsoDomains(
  db: AppDb,
  clock: Clock,
  options: { resolver?: DnsResolver; logger?: Logger } = {},
): Promise<{ checked: number; unverified: number }> {
  const now = clock.now();
  const dueBefore = new Date(now.getTime() - DOMAIN_RECHECK_INTERVAL_MS);
  const due = await db
    .select({ domain: schema.schoolSsoDomains, connection: schema.schoolSsoConnections })
    .from(schema.schoolSsoDomains)
    .innerJoin(
      schema.schoolSsoConnections,
      eq(schema.schoolSsoConnections.id, schema.schoolSsoDomains.connectionId),
    )
    .where(
      and(
        isNotNull(schema.schoolSsoDomains.verifiedAt),
        inArray(schema.schoolSsoConnections.status, ["active", "suspended", "draft"]),
        or(
          isNull(schema.schoolSsoDomains.lastCheckedAt),
          lt(schema.schoolSsoDomains.lastCheckedAt, dueBefore),
        ),
      ),
    );
  const verification = createDomainVerification({
    label: SSO_DOMAIN_LABEL,
    resolver: options.resolver ?? ssoDnsResolver(),
  });
  const result = { checked: 0, unverified: 0 };
  for (const { domain, connection } of due) {
    const proven = await verification.verifyOwnership(domain.domain, domain.verificationToken);
    result.checked += 1;
    if (proven) {
      await db
        .update(schema.schoolSsoDomains)
        .set({ consecutiveCheckFailures: 0, lastCheckedAt: now })
        .where(eq(schema.schoolSsoDomains.id, domain.id));
      continue;
    }
    const failures = domain.consecutiveCheckFailures + 1;
    const lapsed = failures >= DOMAIN_FAILURES_BEFORE_UNVERIFIED;
    await db
      .update(schema.schoolSsoDomains)
      .set({
        consecutiveCheckFailures: failures,
        lastCheckedAt: now,
        ...(lapsed ? { verifiedAt: null } : {}),
      })
      .where(eq(schema.schoolSsoDomains.id, domain.id));
    if (!lapsed) continue;
    result.unverified += 1;
    const eventId = await recordSsoEvent(
      db,
      {
        schoolId: connection.schoolId,
        connectionId: connection.id,
        action: "domain.lapsed",
        reason: "txt_record_missing",
        metadata: { domain: domain.domain },
      },
      clock,
    );
    await notifySsoOwner(
      db,
      {
        schoolId: connection.schoolId,
        subject: "An SSO domain is no longer verified",
        lines: [
          `We couldn't find the DNS record that proves you own ${domain.domain} on ${failures} checks in a row, so it is no longer verified.`,
          "Until it's verified again, new learners from this domain can't sign in with single sign-on and enforcement for it stops. Add the record back and verify the domain again.",
        ],
        idempotencyKey: `sso-event:${eventId}`,
      },
      clock,
    );
  }
  return result;
}

/**
 * Starts the SSO background work on the worker: platform jobs every few
 * seconds, and an hourly sweep that runs cleanup, the weekly domain re-check
 * (self-limiting by `last_checked_at`) and the daily plan sync.
 */
export function startSsoJobs(options: {
  db: AppDb;
  billing: Billing;
  clock: Clock;
  logger: Logger;
  billingMode?: "cloud" | "oss";
  onError?: (task: string, error: unknown) => void;
}): () => void {
  const { db, billing, clock, logger } = options;
  const mode = options.billingMode ?? "cloud";
  const fail = (task: string, error: unknown) => {
    logger.error(
      { sso_task: task, error: error instanceof Error ? error.message : String(error) },
      "SSO background task failed",
    );
    options.onError?.(task, error);
  };
  let stopped = false;
  let jobsRunning = false;
  let sweepRunning = false;
  let lastPlanSync = 0;
  const jobsTimer = setInterval(async () => {
    if (jobsRunning || stopped) return;
    jobsRunning = true;
    try {
      await processPlatformJobs(db, billing, clock, logger, mode);
    } catch (error) {
      fail("platform_jobs", error);
    } finally {
      jobsRunning = false;
    }
  }, 5_000);
  const sweep = async () => {
    if (sweepRunning || stopped) return;
    sweepRunning = true;
    try {
      await cleanupSsoRequests(db, clock);
    } catch (error) {
      fail("cleanup", error);
    }
    try {
      await recheckSsoDomains(db, clock, { logger });
    } catch (error) {
      fail("domain_recheck", error);
    }
    try {
      if (clock.now().getTime() - lastPlanSync >= 24 * 60 * 60 * 1000) {
        await syncAllSsoPlanFeatures(db, billing, clock, logger);
        await syncAllMarketingQuotas(db, billing, clock, mode, logger);
        lastPlanSync = clock.now().getTime();
      }
    } catch (error) {
      fail("plan_sync", error);
    }
    sweepRunning = false;
  };
  // The first sweep runs a minute after start, never at boot.
  const firstSweep = setTimeout(sweep, 60_000);
  const sweepTimer = setInterval(sweep, 60 * 60 * 1000);
  return () => {
    stopped = true;
    clearInterval(jobsTimer);
    clearInterval(sweepTimer);
    clearTimeout(firstSweep);
  };
}
