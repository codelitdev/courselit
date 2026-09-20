import { describe, expect, it } from "bun:test";
import { contract, COURSELIT_PERMISSIONS } from "@courselit/api-contract";
import {
  getOperationPolicy,
  OPERATION_POLICIES,
  type OperationPolicy,
  type TeamOperationPolicy,
} from "./operation-policy.js";

describe("fail-closed operation policy coverage", () => {
  it("registers every single operation in the api contract", () => {
    const contractOpIds = Object.keys(contract);
    expect(contractOpIds.length).toBeGreaterThan(50);

    const missing: string[] = [];
    for (const opId of contractOpIds) {
      const policy = getOperationPolicy(opId);
      if (!policy) {
        missing.push(opId);
      }
    }
    expect(missing).toEqual([]);
  });

  it("fails closed for unknown or unregistered operations", () => {
    expect(getOperationPolicy("unknown.operation")).toBeNull();
    expect(getOperationPolicy("")).toBeNull();
  });

  it("validates that all required permissions are known catalog permissions", () => {
    const validPermSet = new Set<string>(COURSELIT_PERMISSIONS);
    for (const [opId, policy] of Object.entries(OPERATION_POLICIES)) {
      if (policy.audience === "school") {
        const teamPolicy = policy as TeamOperationPolicy;
        for (const perm of teamPolicy.requiredPermissions ?? []) {
          expect(validPermSet.has(perm)).toBe(true);
        }
      }
    }
  });

  it("enforces session-only and recent-auth constraints for team lifecycle operations", () => {
    const transferPolicy = OPERATION_POLICIES["transferSchoolOwnership"] as TeamOperationPolicy;
    expect(transferPolicy.audience).toBe("school");
    expect(transferPolicy.ownerOnly).toBe(true);
    expect(transferPolicy.allowedCredentials).toEqual(["session"]);
    expect(transferPolicy.recentAuthentication).toBe(true);

    const invitePolicy = OPERATION_POLICIES["createSchoolTeamInvitation"] as TeamOperationPolicy;
    expect(invitePolicy.allowedCredentials).toEqual(["session"]);

    const memberUpdatePolicy = OPERATION_POLICIES["updateSchoolTeamMember"] as TeamOperationPolicy;
    expect(memberUpdatePolicy.allowedCredentials).toEqual(["session"]);

    const memberRemovePolicy = OPERATION_POLICIES["removeSchoolTeamMember"] as TeamOperationPolicy;
    expect(memberRemovePolicy.allowedCredentials).toEqual(["session"]);

    const leavePolicy = OPERATION_POLICIES["leaveSchoolTeam"] as TeamOperationPolicy;
    expect(leavePolicy.allowedCredentials).toEqual(["session"]);
  });
});
