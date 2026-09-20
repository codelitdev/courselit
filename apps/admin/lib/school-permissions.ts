import type { CourseLitPermission } from "@courselit/api-contract/team-permissions";

export type SchoolWithPermissions = {
  permissions?: readonly CourseLitPermission[] | readonly string[];
};

export function hasSchoolPermission(
  school: SchoolWithPermissions | null | undefined,
  permission: CourseLitPermission,
): boolean {
  const permissions = school?.permissions;
  return Boolean(permissions?.includes(permission));
}

export function hasAnySchoolPermission(
  school: SchoolWithPermissions | null | undefined,
  permissions: readonly CourseLitPermission[],
): boolean {
  return permissions.some((permission) => hasSchoolPermission(school, permission));
}
