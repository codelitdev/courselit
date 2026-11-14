import { createPlatformError, type PlatformError } from "@codelitdev/platform";
import type { SchoolStatus } from "./db/schema/schools.js";

/**
 * Who is calling, as far as a school's state cares:
 * - `owner` and `team`: staff of the school (API keys count as `team`);
 * - `learner`: a signed-in learner of the school;
 * - `public`: anyone on the school's public routes.
 */
export type SchoolStateActor = "owner" | "team" | "learner" | "public";

/** Owner operations that stay open while a school is read-only or offline. */
const OWNER_BILLING_OPERATIONS: ReadonlySet<string> = new Set([
  "getSchoolBillingPlan",
  "startSchoolBillingCheckout",
  "cancelSchoolBillingPlan",
  "resumeSchoolBillingPlan",
]);

/** What a suspended school's owner can still do with the CourseLit plan. */
const SUSPENDED_OWNER_OPERATIONS: ReadonlySet<string> = new Set([
  "getSchoolBillingPlan",
  "cancelSchoolBillingPlan",
  "resumeSchoolBillingPlan",
]);

/**
 * Learner and public writes that stay open during the read-only grace period:
 * signing in and out, and using content the learner already has. Everything
 * else that writes (checkout, joining, posting, uploading, signing up) is
 * refused, so nobody pays or joins a school that is about to be deleted.
 */
const READ_ONLY_LEARNER_WRITES: ReadonlySet<string> = new Set([
  "learnerRequestEmailCode",
  "learnerVerifyEmailCode",
  "learnerStartGoogleSignIn",
  "learnerStartSsoSignIn",
  "consumeSchoolAuthTicket",
  "learnerSignOut",
  "updateLearnerProfile",
  "cancelLearnerProductSubscription",
  "learnerCompleteLesson",
  "evaluateLearnerQuiz",
  "updateLearnerScormRuntime",
  "learnerCreateDownloadLink",
  "markLearnerNotificationRead",
  "markAllLearnerNotificationsRead",
  "updateLearnerNotificationPreference",
]);

const isRead = (method: string) => method === "GET" || method === "HEAD";

/**
 * Whether a school in `status` lets `actor` run `operationId`. It is an
 * allowlist that fails closed: anything not named here is refused while the
 * school is read-only or offline (docs/wip/plan-limits.md, section 3 and S26).
 * `operationId` is null for routes outside the contract, which only reads may
 * pass.
 */
export function schoolStateAllows(input: {
  status: SchoolStatus;
  actor: SchoolStateActor;
  method: string;
  operationId: string | null;
}): boolean {
  const { status, actor, method, operationId } = input;
  const read = isRead(method);
  switch (status) {
    case "active":
    case "maintenance":
    case "migrating":
      return true;
    case "read_only":
      if (read) return true;
      if (operationId === null) return false;
      if (actor === "owner") return OWNER_BILLING_OPERATIONS.has(operationId);
      if (actor === "team") return false;
      return READ_ONLY_LEARNER_WRITES.has(operationId);
    case "pending_checkout":
    case "imported":
      // Offline until the owner picks a plan: no storefront, no learners, no
      // email. Staff can still set the school up, so it's ready when it pays.
      return actor === "owner" || actor === "team";
    case "suspended":
      return (
        actor === "owner" &&
        (read || (operationId !== null && SUSPENDED_OWNER_OPERATIONS.has(operationId)))
      );
    case "deleted":
      return false;
  }
}

/** The error a refused request gets. It names the state, not the plan or usage. */
export function schoolStateError(status: SchoolStatus): PlatformError {
  return createPlatformError("forbidden", {
    safeDetails: {
      reason:
        status === "read_only"
          ? "school_read_only"
          : status === "suspended"
            ? "school_suspended"
            : "school_unavailable",
    },
  });
}
