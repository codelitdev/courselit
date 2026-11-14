import { createObservability } from "@codelitdev/observability";
import { startBillingWorkers } from "@codelitdev/platform/billing";
import { processDripEmails } from "./drip-emails.js";
import { startIntegrationWorker } from "./integration-provisioning.js";
import { TELEMETRY_PROPERTY_ALLOWLIST } from "./permissions.js";
import { startSsoJobs } from "./sso-jobs.js";
import { createPostgresRuntime } from "./runtime.js";

const databaseUrl = process.env.DATABASE_URL;
const authSecret = process.env.AUTH_SECRET;
const apiKeyPepper = process.env.API_KEY_PEPPER;
if (!databaseUrl || !authSecret || !apiKeyPepper) {
  throw new Error(
    "DATABASE_URL_AUTH_SECRET_AND_API_KEY_PEPPER_REQUIRED",
  );
}
const observability = createObservability({
  serviceName: "courselit-worker",
  environment: process.env.NODE_ENV ?? "development",
  logs: {
    level: process.env.LOG_LEVEL ?? "info",
    ...(process.env.OTLP_LOGS_ENDPOINT
      ? {
          otlp: {
            endpoint: process.env.OTLP_LOGS_ENDPOINT,
            ...(process.env.OTLP_LOGS_AUTHORIZATION
              ? {
                  headers: {
                    authorization: process.env.OTLP_LOGS_AUTHORIZATION,
                  },
                }
              : {}),
          },
        }
      : {}),
  },
  ...(process.env.POSTHOG_API_KEY
    ? {
        posthog: {
          apiKey: process.env.POSTHOG_API_KEY,
          ...(process.env.POSTHOG_HOST ? { host: process.env.POSTHOG_HOST } : {}),
        },
      }
    : {}),
  contextPolicy: {
    propertyAllowlist: TELEMETRY_PROPERTY_ALLOWLIST,
  },
});
const runtime = await createPostgresRuntime({
  databaseUrl,
  authSecret,
  apiKeyPepper,
  publicApiUrl: process.env.PUBLIC_API_URL ?? "http://127.0.0.1:4000",
  observability,
});
try {
  // Catalog verification, webhook inbox, reconciliation, deadlines and retention.
  // The first batch runs one interval after start, never at boot.
  const billingWorkers =
    runtime.billingMode === "cloud"
      ? startBillingWorkers({
          billing: runtime.billing.billing,
          workerId: `courselit-billing-${process.env.HOSTNAME ?? "worker"}-${process.pid}`,
          onError: (task, error) => {
            observability.logger.error(
              { billing_task: task, error: error instanceof Error ? error.message : String(error) },
              "billing maintenance task failed",
            );
            observability.captureException({
              error,
              source: "worker.billing",
              context: { task },
            });
          },
        })
      : null;
  const stopIntegrationWorker = startIntegrationWorker(
    runtime.db,
    runtime.clock,
    observability.logger,
  );
  // Plan-feature syncs queued by the billing hook, the daily plan sync, the
  // weekly SSO domain re-check and cleanup of expired SSO requests.
  const stopSsoJobs = startSsoJobs({
    db: runtime.db,
    billing: runtime.billing.billing,
    billingMode: runtime.billingMode,
    clock: runtime.clock,
    logger: observability.logger,
    onError: (task, error) =>
      observability.captureException({ error, source: "worker.sso", context: { task } }),
  });
  let dripRunning = false;
  const dripTimer = setInterval(async () => {
    if (dripRunning) return;
    dripRunning = true;
    try {
      await processDripEmails(runtime.db, runtime.clock, {
        logger: observability.logger,
      });
    } catch (error) {
      observability.captureException({ error, source: "worker.drip_emails" });
    } finally {
      dripRunning = false;
    }
  }, 60_000);
  await new Promise<void>((resolve) => {
    const stop = () => {
      clearInterval(dripTimer);
      stopIntegrationWorker();
      stopSsoJobs();
      void (billingWorkers?.stop() ?? Promise.resolve()).finally(resolve);
    };
    process.once("SIGTERM", stop);
    process.once("SIGINT", stop);
  });
} catch (error) {
  observability.captureException({ error, source: "worker.maintenance" });
  throw error;
} finally {
  await observability.shutdown(1_000);
  await runtime.close();
}
