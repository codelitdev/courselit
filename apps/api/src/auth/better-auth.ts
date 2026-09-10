import { oauthProviderResourceClient } from "@better-auth/oauth-provider/resource-client";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import * as authSchema from "../db/schema/auth.generated.js";
import * as learnerAuthSchema from "../db/schema/learner-auth.generated.js";
import type { AppDb } from "../types.js";
import {
  AUTH_BASE_PATH,
  adminAuthOptions,
  authUrls,
  LEARNER_AUTH_BASE_PATH,
  learnerAuthOptions,
} from "./options.js";

export function createAdminAuth(input: {
  db: AppDb;
  publicApiUrl: string;
  secret: string;
  webOrigin?: string;
}) {
  if (input.secret.length < 32) {
    throw new Error("better_auth_secret_too_short");
  }
  const urls = authUrls(input.publicApiUrl, input.webOrigin);
  const auth = betterAuth(
    adminAuthOptions({
      publicApiUrl: input.publicApiUrl,
      secret: input.secret,
      webOrigin: input.webOrigin,
      database: drizzleAdapter(input.db, {
        provider: "pg",
        schema: authSchema,
      }),
    }),
  );
  const oauthResourceClient = oauthProviderResourceClient(auth);
  return {
    auth,
    oauthResourceClient,
    ...urls,
    authBasePath: AUTH_BASE_PATH,
  };
}

export type AdminAuth = ReturnType<typeof createAdminAuth>;

/**
 * Better Auth realm for learners. It intentionally has a different cookie
 * namespace, secret, and database schema from the admin/team realm.
 */
export function createLearnerAuth(input: {
  db: AppDb;
  publicApiUrl: string;
  secret: string;
  webOrigin?: string;
}) {
  if (input.secret.length < 32) {
    throw new Error("better_auth_learner_secret_too_short");
  }
  const urls = authUrls(input.publicApiUrl, input.webOrigin, LEARNER_AUTH_BASE_PATH);
  const auth = betterAuth(
    learnerAuthOptions({
      publicApiUrl: input.publicApiUrl,
      secret: input.secret,
      webOrigin: input.webOrigin,
      database: drizzleAdapter(input.db, {
        provider: "pg",
        schema: learnerAuthSchema,
      }),
    }),
  );
  return {
    auth,
    ...urls,
    authBasePath: LEARNER_AUTH_BASE_PATH,
  };
}

export type LearnerAuth = ReturnType<typeof createLearnerAuth>;
