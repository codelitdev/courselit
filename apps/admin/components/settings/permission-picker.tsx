"use client";

import {
  computeEffectiveCourseLitPermissions,
  COURSELIT_HIGH_IMPACT_PERMISSIONS,
  COURSELIT_PERMISSION_GROUPS,
  expandCourseLitPermissionPreset,
  type CourseLitPermission,
  type CourseLitPermissionPresetId,
} from "@courselit/api-contract/team-permissions";
import { Checkbox } from "@/components/ui/codelit/checkbox";
import { Label } from "@/components/ui/codelit/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/codelit/select";

export const COURSE_PERMISSION_PRESET_LABELS: Record<
  CourseLitPermissionPresetId,
  string
> = {
  full_access: "Full access",
  content_manager: "Content manager",
  community_manager: "Community manager",
  support: "Support",
  marketing: "Marketing",
  read_only: "Read-only",
  custom: "Custom",
};

export function summarizeCourseLitPermissions(
  permissions: readonly CourseLitPermission[],
): string {
  if (permissions.length === 0) return "No product access";
  const labels = Object.entries(COURSE_PERMISSION_PRESET_LABELS) as Array<
    [CourseLitPermissionPresetId, string]
  >;
  for (const [preset, label] of labels) {
    if (preset === "custom") continue;
    const expanded = expandCourseLitPermissionPreset(preset);
    if (
      expanded.length === permissions.length &&
      expanded.every((permission, index) => permission === permissions[index])
    ) {
      return label;
    }
  }
  return `${permissions.length} custom permissions`;
}

function isImpliedBySelection(
  permission: CourseLitPermission,
  selected: readonly CourseLitPermission[],
) {
  return (
    !selected.includes(permission) &&
    computeEffectiveCourseLitPermissions(selected).includes(permission)
  );
}

export function PermissionPicker({
  preset,
  permissions,
  selectable,
  onPresetChange,
  onPermissionsChange,
}: {
  preset: CourseLitPermissionPresetId | "";
  permissions: CourseLitPermission[];
  selectable: readonly CourseLitPermission[];
  onPresetChange: (preset: CourseLitPermissionPresetId) => void;
  onPermissionsChange: (permissions: CourseLitPermission[]) => void;
}) {
  const allowed = new Set(selectable);

  function toggle(permission: CourseLitPermission, checked: boolean) {
    const next = checked
      ? [...new Set([...permissions, permission])]
      : permissions.filter((item) => item !== permission);
    onPresetChange("custom");
    onPermissionsChange(expandCourseLitPermissionPreset("custom", next));
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="course-permission-preset">Permission preset</Label>
        <Select
          value={preset}
          onValueChange={(value) =>
            onPresetChange(value as CourseLitPermissionPresetId)
          }
        >
          <SelectTrigger id="course-permission-preset">
            <SelectValue placeholder="Choose a preset or Custom" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(COURSE_PERMISSION_PRESET_LABELS).map(([id, label]) => (
              <SelectItem key={id} value={id}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {preset === "full_access" && (
        <p className="text-sm text-amber-700">
          Full access includes school settings, member administration, destructive
          actions, and community moderation.
        </p>
      )}

      <div className="space-y-4">
        {COURSELIT_PERMISSION_GROUPS.map((group) => {
          const visible = group.permissions.filter((permission) =>
            allowed.has(permission),
          );
          if (visible.length === 0) return null;
          return (
            <div key={group.id} className="space-y-2">
              <p className="text-sm font-medium">{group.label}</p>
              {visible.map((permission) => {
                const implied = isImpliedBySelection(permission, permissions);
                const checked = permissions.includes(permission) || implied;
                const highImpact = (
                  COURSELIT_HIGH_IMPACT_PERMISSIONS as readonly string[]
                ).includes(permission);
                const inputId = `course-permission-${permission.replace(":", "-")}`;
                return (
                  <label
                    key={permission}
                    htmlFor={inputId}
                    className="flex items-start gap-2 text-sm"
                  >
                    <Checkbox
                      id={inputId}
                      checked={checked}
                      disabled={implied}
                      onCheckedChange={(value) => toggle(permission, value === true)}
                    />
                    <span>
                      {permission}
                      {implied && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          (implied)
                        </span>
                      )}
                      {highImpact && (
                        <span className="ml-1 text-xs text-amber-700">sensitive</span>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
