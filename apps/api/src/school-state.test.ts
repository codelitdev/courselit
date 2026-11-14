import { describe, expect, it } from "bun:test";
import { schoolSchema } from "@courselit/api-contract";
import { OPERATION_POLICIES } from "./auth/operation-policy.js";
import { SCHOOL_STATUSES, type SchoolStatus } from "./db/schema/schools.js";
import { type SchoolStateActor, schoolStateAllows } from "./school-state.js";

const allows = (
  status: SchoolStatus,
  actor: SchoolStateActor,
  method: string,
  operationId: string | null,
) => schoolStateAllows({ status, actor, method, operationId });

const ACTORS: SchoolStateActor[] = ["owner", "team", "learner", "public"];

describe("schoolStateAllows", () => {
  it("names only operations that exist in the contract", async () => {
    // A renamed operation must not silently fall out of an allowlist.
    const source = await Bun.file(new URL("./school-state.ts", import.meta.url)).text();
    const named = [...source.matchAll(/^\s+"([a-zA-Z]+)",$/gm)].map((match) => match[1]!);
    expect(named.length).toBeGreaterThan(10);
    for (const operationId of named) {
      expect(operationId in OPERATION_POLICIES).toBe(true);
    }
  });

  it("lets everyone do everything while a school is active, in maintenance or migrating", () => {
    for (const status of ["active", "maintenance", "migrating"] as const) {
      for (const actor of ACTORS) {
        expect(allows(status, actor, "POST", "createCheckoutSession")).toBe(true);
        expect(allows(status, actor, "DELETE", null)).toBe(true);
      }
    }
  });

  it("refuses everything for a deleted school", () => {
    for (const actor of ACTORS) {
      expect(allows("deleted", actor, "GET", "getPublicSiteSettings")).toBe(false);
    }
  });

  describe("read_only (the grace period)", () => {
    it("allows every read", () => {
      for (const actor of ACTORS) {
        expect(allows("read_only", actor, "GET", "getPublicSitePage")).toBe(true);
      }
    });

    it("refuses new purchases, sign-ups, joins, posts and uploads", () => {
      for (const operationId of [
        "createCheckoutSession",
        "learnerCheckout",
        "startLearnerCheckoutSession",
        "startLearnerCommunityCheckout",
        "createLearnerMembership",
        "signUpForLeadMagnet",
        "subscribeNewsletter",
        "createLearnerCommunityPost",
        "createLearnerCommunityComment",
        "authorizeLearnerCommunityMediaUpload",
        "authorizeLearnerAvatarMediaUpload",
      ]) {
        expect(allows("read_only", "learner", "POST", operationId)).toBe(false);
        expect(allows("read_only", "public", "POST", operationId)).toBe(false);
      }
    });

    it("lets learners sign in, use what they have, and cancel their subscriptions", () => {
      for (const operationId of [
        "learnerRequestEmailCode",
        "learnerVerifyEmailCode",
        "consumeSchoolAuthTicket",
        "learnerSignOut",
        "learnerCompleteLesson",
        "updateLearnerProfile",
        "cancelLearnerProductSubscription",
      ]) {
        expect(allows("read_only", "learner", "POST", operationId)).toBe(true);
      }
    });

    it("lets the owner pick a plan but change nothing else", () => {
      expect(allows("read_only", "owner", "POST", "startSchoolBillingCheckout")).toBe(true);
      expect(allows("read_only", "owner", "POST", "resumeSchoolBillingPlan")).toBe(true);
      expect(allows("read_only", "owner", "PATCH", "updateProduct")).toBe(false);
      expect(allows("read_only", "owner", "POST", null)).toBe(false);
    });

    it("gives the rest of the team reads only, and never billing", () => {
      expect(allows("read_only", "team", "GET", "listProducts")).toBe(true);
      expect(allows("read_only", "team", "POST", "startSchoolBillingCheckout")).toBe(false);
      expect(allows("read_only", "team", "PATCH", "updateProduct")).toBe(false);
    });
  });

  describe("offline: pending_checkout and imported", () => {
    it("is closed to learners and the public, even for reads", () => {
      for (const status of ["pending_checkout", "imported"] as const) {
        for (const actor of ["learner", "public"] as const) {
          expect(allows(status, actor, "GET", "getPublicSiteSettings")).toBe(false);
          expect(allows(status, actor, "POST", "learnerRequestEmailCode")).toBe(false);
        }
      }
    });

    it("lets staff set the school up and the owner reach checkout", () => {
      for (const status of ["pending_checkout", "imported"] as const) {
        expect(allows(status, "owner", "GET", "getSchoolBillingPlan")).toBe(true);
        expect(allows(status, "owner", "POST", "startSchoolBillingCheckout")).toBe(true);
        expect(allows(status, "owner", "PATCH", "updateProduct")).toBe(true);
        expect(allows(status, "team", "POST", "createProduct")).toBe(true);
      }
    });
  });

  describe("suspended", () => {
    it("is closed to everyone but the owner; learners can't even sign in", () => {
      for (const actor of ["learner", "public", "team"] as const) {
        expect(allows("suspended", actor, "GET", "getPublicSiteSettings")).toBe(false);
        expect(allows("suspended", actor, "POST", "learnerRequestEmailCode")).toBe(false);
      }
    });

    it("lets the owner read and cancel or resume the plan, but not start a new one", () => {
      expect(allows("suspended", "owner", "GET", "getSchoolBillingPlan")).toBe(true);
      expect(allows("suspended", "owner", "POST", "cancelSchoolBillingPlan")).toBe(true);
      expect(allows("suspended", "owner", "POST", "startSchoolBillingCheckout")).toBe(false);
    });
  });

  it("uses the same statuses as the API contract", () => {
    expect([...schoolSchema.shape.status.options].sort()).toEqual([...SCHOOL_STATUSES].sort());
  });

  it("covers every school status", () => {
    for (const status of SCHOOL_STATUSES) {
      expect(typeof allows(status, "owner", "GET", null)).toBe("boolean");
    }
  });
});
