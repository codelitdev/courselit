"use client";

import { useEffect, useState } from "react";
import { StatusBanner } from "@/components/status-banner";
import { isMailingAddressMissing } from "@/lib/email-readiness";

/** Reports whether the school still lacks a mailing address, or null while
 * that is unknown. Email providers require the address in every message, so
 * sending is blocked until it is set. */
export function useMailingAddressMissing(schoolId?: string | null): boolean | null {
  const [missing, setMissing] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    void fetch("/api/v1/school/mails/settings", {
      credentials: "include",
      cache: "no-store",
      headers: schoolId ? { "x-school-id": schoolId } : undefined,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { mailingAddress?: string | null } | null) => {
        // Stay silent when the settings can't be read; the API still checks.
        if (active) setMissing(body ? isMailingAddressMissing(body) : null);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [schoolId]);

  return missing;
}

/** Asks for the mailing address up front, before the creator writes an email
 * they then can't send. */
export function MailingAddressNotice({
  missing,
  action,
  className,
}: {
  missing: boolean | null;
  /** What the address is needed for, e.g. "send this broadcast". */
  action: string;
  className?: string;
}) {
  if (!missing) return null;
  return (
    <StatusBanner
      actionLabel="Add mailing address"
      actionHref="/marketing/settings"
      // Every screen that shows it already spaces its children.
      className={className ?? ""}
    >
      Add your mailing address before you {action}. Every marketing email has to
      include a postal address.
    </StatusBanner>
  );
}
