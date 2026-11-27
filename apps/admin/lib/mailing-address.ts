/**
 * The postal address every marketing email carries in its footer: the fields
 * the "Get ready to send email" form asks for, and the footer text SendLit
 * makes of them. No React, so it can be unit tested.
 */

import {
  formatPostalAddress,
  isPostalCountryCode,
  POSTAL_COUNTRY_CODES,
  type PostalAddress,
  postalCountryName,
} from "@sendlit/email-blocks/postal-address";

// SendLit owns the country list and how an address becomes footer text, so
// the form, its preview and the emails that are sent all agree.
export { formatPostalAddress, type PostalAddress };

/** Every country, by English name, for the Country field. */
export const COUNTRIES: ReadonlyArray<{ value: string; label: string }> =
  POSTAL_COUNTRY_CODES.map((code) => ({
    value: code,
    label: postalCountryName(code),
  })).sort((a, b) => a.label.localeCompare(b.label, "en"));

const DEFAULT_COUNTRY = "US";

/** The form's fields: every part a string, so inputs stay controlled. */
export type MailingAddressDraft = Required<PostalAddress>;

export type MailingAddressErrors = Partial<Record<"line1" | "postalCode", string>>;

/** The country from a browser locale tag such as `en-IN`, or the United
 * States when the tag names none. */
export function countryFromLocale(tag: string | undefined | null): string {
  const region = String(tag ?? "")
    .split(/[-_]/)
    .find((part, index) => index > 0 && /^[A-Za-z]{2}$/.test(part))
    ?.toUpperCase();
  return region && isPostalCountryCode(region) ? region : DEFAULT_COUNTRY;
}

export function emptyMailingAddress(country = DEFAULT_COUNTRY): MailingAddressDraft {
  return { line1: "", line2: "", city: "", region: "", postalCode: "", country };
}

/** The form, filled in from the saved address, or empty for `country`. */
export function draftFromPostalAddress(
  address: PostalAddress | null | undefined,
  country = DEFAULT_COUNTRY,
): MailingAddressDraft {
  if (!address) return emptyMailingAddress(country);
  return {
    line1: address.line1 ?? "",
    line2: address.line2 ?? "",
    city: address.city ?? "",
    region: address.region ?? "",
    postalCode: address.postalCode ?? "",
    country: address.country || country,
  };
}

/** What gets saved: trimmed parts, leaving out the empty optional ones. */
export function postalAddressFromDraft(draft: MailingAddressDraft): PostalAddress {
  const optional = (value: string) => value.trim() || undefined;
  const address: PostalAddress = { line1: draft.line1.trim(), country: draft.country };
  for (const key of ["line2", "city", "region", "postalCode"] as const) {
    const value = optional(draft[key]);
    if (value) address[key] = value;
  }
  return address;
}

export function validateMailingAddress(
  address: MailingAddressDraft,
): MailingAddressErrors {
  const errors: MailingAddressErrors = {};
  if (!address.line1.trim()) errors.line1 = "Add the street address.";
  if (!address.postalCode.trim()) errors.postalCode = "Add a postal code.";
  return errors;
}

/** The address to preview, or null until something is typed. */
export function addressPreview(draft: MailingAddressDraft): PostalAddress | null {
  const typed = [draft.line1, draft.line2, draft.city, draft.region, draft.postalCode].some(
    (part) => part.trim(),
  );
  return typed ? postalAddressFromDraft(draft) : null;
}
