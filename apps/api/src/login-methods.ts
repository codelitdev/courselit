import type { BillingEngine } from "@codelitdev/billing/workflows";
import { type Clock, createPlatformError, type PlatformError } from "@codelitdev/platform";
import { eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { schoolHasFeature } from "./plan-features.js";
import {
  activeSsoConnection,
  endSessionsForMethod,
  platformGoogleAvailable,
  usableSignInMethods,
} from "./sign-in-policy.js";
import { SSO_FEATURE } from "./sso-config.js";
import type { AppDb } from "./types.js";

type Billing = Pick<BillingEngine, "hasFeature" | "commercialState">;
type Result<T> = { ok: true; value: T } | { ok: false; error: PlatformError };
type School = typeof schema.schools.$inferSelect;
type Method = "email" | "google";

export type SchoolLoginMethodsDto = {
  loginMethods: Method[];
  googleAvailable: boolean;
  sso: { active: boolean; displayName: string | null; planAvailable: boolean };
  usable: ("email" | "google" | "sso")[];
};

/**
 * The sign-in methods learners can use right now: what the school turned on,
 * adjusted by what is actually usable. SSO also needs the plan, which the
 * policy check alone doesn't read.
 */
export async function usableLearnerMethods(
  db: AppDb,
  billing: Billing,
  school: School,
): Promise<{ methods: ("email" | "google" | "sso")[]; ssoDisplayName: string | null }> {
  const methods = await usableSignInMethods(db, school);
  const connection = methods.includes("sso") ? await activeSsoConnection(db, school.id) : null;
  const ssoUsable =
    connection !== null && (await schoolHasFeature(billing, school.id, SSO_FEATURE, db));
  return {
    methods: methods.filter((method) => method !== "sso" || ssoUsable),
    ssoDisplayName: ssoUsable ? connection!.displayName : null,
  };
}

export async function readSchoolLoginMethods(
  db: AppDb,
  billing: Billing,
  schoolId: string,
): Promise<Result<SchoolLoginMethodsDto>> {
  const [school] = await db
    .select()
    .from(schema.schools)
    .where(eq(schema.schools.id, schoolId))
    .limit(1);
  if (!school) return { ok: false, error: createPlatformError("not_found") };
  const connection = await activeSsoConnection(db, school.id);
  const usable = await usableLearnerMethods(db, billing, school);
  return {
    ok: true,
    value: {
      loginMethods: school.loginMethods,
      googleAvailable: platformGoogleAvailable(),
      sso: {
        active: connection !== null,
        displayName: connection?.displayName ?? null,
        planAvailable: await schoolHasFeature(billing, school.id, SSO_FEATURE, db),
      },
      usable: usable.methods,
    },
  };
}

/**
 * Turn email codes and Google on or off. At least one of email, Google and an
 * active SSO connection stays on, and Google can be turned on only when the
 * platform has Google keys. Turning a method off ends the sessions made with
 * it, so it takes effect now rather than when they expire.
 */
export async function updateSchoolLoginMethods(
  db: AppDb,
  billing: Billing,
  schoolId: string,
  input: { loginMethods: Method[] },
  clock: Clock,
): Promise<Result<SchoolLoginMethodsDto>> {
  const [school] = await db
    .select()
    .from(schema.schools)
    .where(eq(schema.schools.id, schoolId))
    .limit(1);
  if (!school) return { ok: false, error: createPlatformError("not_found") };
  const next = [...new Set(input.loginMethods)];
  const invalid = (reason: string) => ({
    ok: false as const,
    error: createPlatformError("validation_failed", { safeDetails: { reason } }),
  });
  if (
    next.includes("google") &&
    !school.loginMethods.includes("google") &&
    !platformGoogleAvailable()
  ) {
    return invalid("google_unavailable");
  }
  if (next.length === 0 && !(await activeSsoConnection(db, school.id))) {
    return invalid("last_sign_in_method");
  }
  await db
    .update(schema.schools)
    .set({ loginMethods: next, updatedAt: clock.now() })
    .where(eq(schema.schools.id, school.id));
  for (const method of school.loginMethods) {
    if (!next.includes(method)) await endSessionsForMethod(db, school.id, method);
  }
  return readSchoolLoginMethods(db, billing, schoolId);
}
