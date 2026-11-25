import { RESERVED_SUBDOMAINS } from "@courselit/api-contract/school-subdomain";
import type { LegacySchoolChecker } from "./legacy-schools.js";

const SUBDOMAIN_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Whether a value is a well-formed school address label. */
export function isValidSubdomain(value: string): boolean {
  return value.length >= 3 && value.length <= 63 && SUBDOMAIN_PATTERN.test(value);
}

/**
 * Whether a new school may take a label: `reserved` when it names a product
 * or infrastructure host or a classic-app school owns
 * `<label>.<platform domain>`, `unavailable` when the classic app couldn't be
 * asked (treat it as not free), `free` otherwise. Without a checker
 * (`LEGACY_SCHOOL_CHECK_URL` unset) only the fixed list applies.
 */
export type SubdomainReservation = "reserved" | "unavailable" | "free";

/** Whether a label is on the fixed product and infrastructure list. */
export function isReservedProductSubdomain(label: string): boolean {
  return RESERVED_SUBDOMAINS.has(label.trim().toLowerCase());
}

/** The reservation of each label; classic-app checks run in parallel. */
export async function reservationsAmong(
  labels: string[],
  legacy?: LegacySchoolChecker,
): Promise<Map<string, SubdomainReservation>> {
  const results = await Promise.all(
    labels.map(async (label): Promise<[string, SubdomainReservation]> => {
      if (isReservedProductSubdomain(label)) return [label, "reserved"];
      if (!legacy) return [label, "free"];
      const status = await legacy.checkSubdomain(label);
      if (status === "owned") return [label, "reserved"];
      return [label, status === "free" ? "free" : "unavailable"];
    }),
  );
  return new Map(results);
}

export async function subdomainReservation(
  label: string,
  legacy?: LegacySchoolChecker,
): Promise<SubdomainReservation> {
  return (await reservationsAmong([label], legacy)).get(label) ?? "free";
}
