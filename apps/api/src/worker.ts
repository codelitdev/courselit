import { createObservability } from "@codelitdev/observability";
import { runBoundedMaintenance } from "./billing.js";
import { startIntegrationWorker } from "./integration-provisioning.js";
import { TELEMETRY_PROPERTY_ALLOWLIST } from "./permissions.js";
import { createPostgresRuntime } from "./runtime.js";

const databaseUrl = process.env.DATABASE_URL;
const authSecret = process.env.AUTH_SECRET;
const learnerAuthSecret = process.env.LEARNER_AUTH_SECRET;
const apiKeyPepper = process.env.API_KEY_PEPPER;
if (!databaseUrl || !authSecret || !learnerAuthSecret || !apiKeyPepper) {
  throw new Error(
    "DATABASE_URL_AUTH_SECRET_LEARNER_AUTH_SECRET_AND_API_KEY_PEPPER_REQUIRED",
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
  learnerAuthSecret,
  apiKeyPepper,
  publicApiUrl: process.env.PUBLIC_API_URL ?? "http://127.0.0.1:4000",
  observability,
});
try {
  const processed = await runBoundedMaintenance(runtime.billing.billing);
  observability.logger.info({ processed }, "billing maintenance complete");
  const stopIntegrationWorker = startIntegrationWorker(
    runtime.db,
    runtime.clock,
    observability.logger,
  );
  await new Promise<void>((resolve) => {
    const stop = () => {
      stopIntegrationWorker();
      resolve();
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
