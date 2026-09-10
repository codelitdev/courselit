import http from "node:http";
import { createObservability, type Observability } from "@codelitdev/observability";
import { type Clock, frozenClock, systemClock } from "@codelitdev/platform";
import { PGlite } from "@electric-sql/pglite";
import { toNodeHandler } from "better-auth/node";
import { drizzle as drizzlePostgres } from "drizzle-orm/node-postgres";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { Pool } from "pg";
import type { Logger } from "pino";
import { createAdminAuth, createLearnerAuth } from "./auth/better-auth.js";
import {
  type BillingBundle,
  composeBilling,
  rebindFakeProviderMemory,
} from "./billing.js";
import { migrationsFolder } from "./db/migrate.js";
import * as billingSchema from "./db/schema/billing.generated.js";
import * as schema from "./db/schema/index.js";
import type { DispatchDeps } from "./deps.js";
import { type MediaLitClient, MemoryMediaLitClient } from "./media.js";
import { createMediaLitClientFromEnv } from "./media-lit-client.js";
import type { PaymentProvider } from "./payments.js";
import { TELEMETRY_PROPERTY_ALLOWLIST } from "./permissions.js";
import type { AppDb } from "./types.js";
import { createUnsplashClientFromEnv, type UnsplashClient } from "./unsplash.js";

export type Runtime = DispatchDeps & {
  client: PGlite | Pool;
  logger: Logger;
  authServer: http.Server | null;
  close(): Promise<void>;
};

export async function createPgliteRuntime(options: {
  clock?: Clock;
  apiKeyPepper?: string;
  serviceName?: string;
  publicApiUrl?: string;
  webOrigin?: string;
  logger?: Logger;
  observability?: Observability;
  authSecret?: string;
  learnerAuthSecret?: string;
  learnerWebOrigin?: string;
  billingMode?: "cloud" | "oss";
  customDomainVerifier?: (hostname: string, token: string) => Promise<boolean>;
  mediaLit?: MediaLitClient;
  unsplash?: UnsplashClient;
  paymentProvider?: PaymentProvider;
}): Promise<Runtime> {
  const client = new PGlite();
  const db = drizzle(client, {
    schema: { ...schema, ...billingSchema },
  }) as AppDb;
  await migrate(db, { migrationsFolder });
  const clock = options.clock ?? systemClock;
  const billingMode = options.billingMode ?? "cloud";
  let handler: ReturnType<typeof toNodeHandler> | undefined;
  let authServer: http.Server | null = null;
  let publicApiUrl = options.publicApiUrl;
  if (!publicApiUrl) {
    authServer = http.createServer((req, res) => {
      if (!handler) {
        res.statusCode = 503;
        res.end();
        return;
      }
      void handler(req, res);
    });
    await new Promise<void>((resolve) => {
      authServer!.listen(0, "127.0.0.1", () => resolve());
    });
    const address = authServer.address();
    if (!address || typeof address === "string") {
      throw new Error("auth_listen_failed");
    }
    publicApiUrl = `http://127.0.0.1:${address.port}`;
  }
  const webOrigin = options.webOrigin ?? publicApiUrl;
  const billing = composeBilling(db, clock, {
    mode: billingMode,
    webOrigin,
  });
  const auth = createAdminAuth({
    db,
    publicApiUrl,
    webOrigin,
    secret: options.authSecret ?? "test-secret-that-is-at-least-thirty-two-characters",
  });
  const learnerAuth = createLearnerAuth({
    db,
    publicApiUrl,
    webOrigin: options.learnerWebOrigin ?? webOrigin,
    secret:
      options.learnerAuthSecret ??
      "test-learner-secret-that-is-at-least-thirty-two-characters",
  });
  const adminHandler = toNodeHandler(auth.auth);
  const learnerHandler = toNodeHandler(learnerAuth.auth);
  handler = async (req, res) => {
    const requestPath = req.url?.split("?", 1)[0] ?? "";
    await (requestPath.startsWith(learnerAuth.authBasePath)
      ? learnerHandler(req, res)
      : adminHandler(req, res));
  };
  const importTables = await client.query(
    "select tablename from pg_tables where schemaname = 'public'",
  );
  if (importTables.rows.length === 0) {
    throw new Error("migrations_did_not_create_tables");
  }
  const observability =
    options.observability ??
    createObservability({
      serviceName: options.serviceName ?? "courselit-api",
      environment: "test",
      logs: { level: "silent" },
      contextPolicy: {
        propertyAllowlist: TELEMETRY_PROPERTY_ALLOWLIST,
      },
    });
  return {
    client,
    db,
    clock,
    apiKeyPepper: options.apiKeyPepper ?? "test-pepper-please-rotate",
    billing,
    billingMode,
    mediaLit: options.mediaLit ?? new MemoryMediaLitClient(() => clock.now()),
    unsplash: options.unsplash ?? createUnsplashClientFromEnv(),
    serviceName: options.serviceName ?? "courselit-api",
    databaseReady: true,
    logger: options.logger ?? observability.logger,
    observability,
    customDomainVerifier: options.customDomainVerifier,
    paymentProvider: options.paymentProvider,
    auth,
    learnerAuth,
    authServer,
    async close() {
      await new Promise<void>((resolve) => {
        if (!authServer) {
          resolve();
          return;
        }
        authServer.close(() => resolve());
      });
      await client.close();
    },
  };
}

/** Production runtime; migrations are applied by the application deployment. */
export async function createPostgresRuntime(options: {
  databaseUrl: string;
  clock?: Clock;
  apiKeyPepper: string;
  serviceName?: string;
  publicApiUrl: string;
  webOrigin?: string;
  logger?: Logger;
  observability?: Observability;
  authSecret: string;
  learnerAuthSecret: string;
  learnerWebOrigin?: string;
  mediaLit?: MediaLitClient;
  unsplash?: UnsplashClient;
  paymentProvider?: PaymentProvider;
}): Promise<Runtime> {
  const client = new Pool({ connectionString: options.databaseUrl });
  await client.query("select 1");
  const db = drizzlePostgres(client, {
    schema: { ...schema, ...billingSchema },
  }) as unknown as AppDb;
  const clock = options.clock ?? systemClock;
  const billingMode = process.env.BILLING_MODE === "oss" ? "oss" : ("cloud" as const);
  const billing = composeBilling(db, clock, {
    mode: billingMode,
    webOrigin: options.webOrigin,
  });
  if (billingMode === "cloud") {
    await rebindFakeProviderMemory(db, billing.fake);
  }
  const auth = createAdminAuth({
    db,
    publicApiUrl: options.publicApiUrl,
    webOrigin: options.webOrigin,
    secret: options.authSecret,
  });
  const learnerAuth = createLearnerAuth({
    db,
    publicApiUrl: options.publicApiUrl,
    webOrigin: options.learnerWebOrigin ?? options.webOrigin,
    secret: options.learnerAuthSecret,
  });
  const observability =
    options.observability ??
    createObservability({
      serviceName: options.serviceName ?? "courselit-api",
      environment: "production",
      contextPolicy: {
        propertyAllowlist: TELEMETRY_PROPERTY_ALLOWLIST,
      },
    });
  return {
    client,
    db,
    clock,
    apiKeyPepper: options.apiKeyPepper,
    billing,
    billingMode,
    mediaLit: options.mediaLit ?? createMediaLitClientFromEnv(),
    unsplash: options.unsplash ?? createUnsplashClientFromEnv(),
    serviceName: options.serviceName ?? "courselit-api",
    databaseReady: true,
    logger: options.logger ?? observability.logger,
    observability,
    paymentProvider: options.paymentProvider,
    auth,
    learnerAuth,
    authServer: null,
    async close() {
      await client.end();
    },
  };
}

export function freezeRuntimeClock(at: Date): Clock {
  return frozenClock(at);
}

export type { BillingBundle };
