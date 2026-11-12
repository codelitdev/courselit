"use client";

import { ViewInBrowserSetting as ViewInBrowserSwitch } from "@sendlit/email-blocks";

/** Saves the mail service's "View in browser" switch through CourseLit's API. */
export function ViewInBrowserSetting({
  schoolId,
  sequenceId,
  checked,
  onSaved,
  disabled,
}: {
  schoolId: string;
  sequenceId: string;
  checked: boolean;
  onSaved: (viewInBrowser: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <ViewInBrowserSwitch
      checked={checked}
      disabled={disabled}
      onCheckedChange={async (viewInBrowser) => {
        const response = await fetch(
          `/api/v1/school/mails/sequences/${encodeURIComponent(sequenceId)}`,
          {
            method: "PATCH",
            credentials: "include",
            cache: "no-store",
            headers: { "content-type": "application/json", "x-school-id": schoolId },
            body: JSON.stringify({ viewInBrowser }),
          },
        );
        if (!response.ok) throw new Error("Couldn't save this setting. Try again.");
        onSaved(viewInBrowser);
      }}
    />
  );
}
