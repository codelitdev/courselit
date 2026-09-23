import { describe, expect, it } from "bun:test";
import {
  COURSELIT_PERMISSIONS,
  COURSELIT_PERMISSION_IMPLICATIONS,
  COURSELIT_PERMISSION_PRESETS,
  COURSELIT_PERMISSION_PRESET_IDS,
  OWNER_PERMISSIONS,
  computeEffectiveCourseLitPermissions,
  expandCourseLitPermissionPreset,
  filterDelegableCourseLitPermissions,
  normalizeCourseLitPermissions,
  type CourseLitPermission,
} from "@courselit/api-contract";

describe("team permissions catalog and algebra", () => {
  it("contains exactly 35 stable permissions and no school:admin", () => {
    expect(COURSELIT_PERMISSIONS).toHaveLength(35);
    expect((COURSELIT_PERMISSIONS as readonly string[]).includes("school:admin")).toBe(false);
    expect(OWNER_PERMISSIONS).toEqual([...COURSELIT_PERMISSIONS]);
  });

  it("normalizes permissions deterministically and ignores unknown strings", () => {
    const normalized = normalizeCourseLitPermissions([
      "products:write",
      "not_a_real_permission",
      "members:read",
      "school:admin",
    ]);
    expect(normalized).toEqual(["members:read", "products:write"]);
  });

  it("computes transitive closure for implications cycle-safely", () => {
    // products:publish -> products:write -> products:read
    const effectivePublish = computeEffectiveCourseLitPermissions(["products:publish"]);
    expect(effectivePublish).toContain("products:publish");
    expect(effectivePublish).toContain("products:write");
    expect(effectivePublish).toContain("products:read");

    // commerce:refund -> commerce:manage -> commerce:read
    const effectiveRefund = computeEffectiveCourseLitPermissions(["commerce:refund"]);
    expect(effectiveRefund).toContain("commerce:refund");
    expect(effectiveRefund).toContain("commerce:manage");
    expect(effectiveRefund).toContain("commerce:read");

    // mails:send -> mails:write -> mails:read
    const effectiveMail = computeEffectiveCourseLitPermissions(["mails:send"]);
    expect(effectiveMail).toContain("mails:send");
    expect(effectiveMail).toContain("mails:write");
    expect(effectiveMail).toContain("mails:read");

    // communities:moderate -> communities:write -> communities:read
    const effectiveComm = computeEffectiveCourseLitPermissions(["communities:moderate"]);
    expect(effectiveComm).toContain("communities:moderate");
    expect(effectiveComm).toContain("communities:write");
    expect(effectiveComm).toContain("communities:read");
  });

  it("expands each preset to the documented permission grants", () => {
    const fullAccess = expandCourseLitPermissionPreset("full_access");
    expect(fullAccess).toEqual([...COURSELIT_PERMISSIONS]);

    const contentManager = expandCourseLitPermissionPreset("content_manager");
    expect(contentManager).toContain("products:write");
    expect(contentManager).toContain("storefront:publish");
    expect(contentManager).toContain("media:delete");
    expect(contentManager).toContain("certificates:write");
    expect(contentManager).not.toContain("members:invite");

    const communityManager = expandCourseLitPermissionPreset("community_manager");
    expect(communityManager).toContain("communities:moderate");
    expect(communityManager).toContain("contacts:read");
    expect(communityManager).not.toContain("products:write");

    const support = expandCourseLitPermissionPreset("support");
    expect(support).toContain("products:read");
    expect(support).toContain("contacts:write");
    expect(support).toContain("communities:moderate");
    expect(support).toContain("commerce:read");
    expect(support).not.toContain("products:write");

    const marketing = expandCourseLitPermissionPreset("marketing");
    expect(marketing).toContain("storefront:publish");
    expect(marketing).toContain("mails:send");
    expect(marketing).toContain("contacts:write");
    expect(marketing).not.toContain("products:delete");

    const readOnly = expandCourseLitPermissionPreset("read_only");
    for (const perm of readOnly) {
      expect(perm.endsWith(":read")).toBe(true);
    }

    const custom = expandCourseLitPermissionPreset("custom", ["products:read", "media:read"]);
    expect(custom).toEqual(["products:read", "media:read"]);
  });

  it("delegation allows full catalog for owner and restricts non-owner to effective set", () => {
    const ownerDelegable = filterDelegableCourseLitPermissions([], true);
    expect(ownerDelegable).toEqual([...COURSELIT_PERMISSIONS]);

    const staffEffective: CourseLitPermission[] = ["products:read", "products:write"];
    const staffDelegable = filterDelegableCourseLitPermissions(staffEffective, false);
    expect(staffDelegable).toEqual(["products:read", "products:write"]);
    expect(staffDelegable).not.toContain("products:delete");
  });
});
