import { describe, expect, it } from "bun:test";
import {
  addressPreview,
  COUNTRIES,
  countryFromLocale,
  draftFromPostalAddress,
  emptyMailingAddress,
  formatPostalAddress,
  postalAddressFromDraft,
  validateMailingAddress,
} from "./mailing-address";

const indore = {
  line1: "F-102 Shanti Dham Society",
  city: "Indore",
  region: "Madhya Pradesh",
  postalCode: "452020",
  country: "IN",
};

describe("mailing address", () => {
  it("requires a street address and postal code", () => {
    const address = emptyMailingAddress();
    expect(Object.keys(validateMailingAddress(address)).sort()).toEqual([
      "line1",
      "postalCode",
    ]);
    address.line1 = "18 Harbour Lane";
    address.postalCode = "BS1 4RN";
    expect(validateMailingAddress(address)).toEqual({});
    expect(validateMailingAddress({ ...address, line1: "   " })).toHaveProperty("line1");
  });

  it("formats one part per line, skipping empty parts", () => {
    expect(
      formatPostalAddress({
        line1: "18 Harbour Lane",
        city: "Bristol",
        postalCode: "BS1 4RN",
        country: "GB",
      }),
    ).toBe("18 Harbour Lane\nBristol, BS1 4RN\nUnited Kingdom");
    expect(formatPostalAddress({ ...indore, line2: "Limbodi" })).toBe(
      "F-102 Shanti Dham Society\nLimbodi\nIndore, Madhya Pradesh, 452020\nIndia",
    );
  });

  it("saves trimmed parts and leaves out empty optional ones", () => {
    const draft = {
      ...emptyMailingAddress("IN"),
      line1: "  F-102 Shanti Dham Society ",
      city: "Indore",
      postalCode: "452020",
      region: "   ",
    };
    expect(postalAddressFromDraft(draft)).toEqual({
      line1: "F-102 Shanti Dham Society",
      city: "Indore",
      postalCode: "452020",
      country: "IN",
    });
  });

  it("fills the form from a saved address, or starts empty", () => {
    expect(draftFromPostalAddress(indore)).toEqual({ ...indore, line2: "" });
    expect(draftFromPostalAddress(null, "DE")).toEqual(emptyMailingAddress("DE"));
    expect(postalAddressFromDraft(draftFromPostalAddress(indore))).toEqual(indore);
  });

  it("previews the address being typed, or nothing while empty", () => {
    expect(addressPreview(emptyMailingAddress("IN"))).toBeNull();
    expect(addressPreview(draftFromPostalAddress(indore))).toEqual(indore);
  });

  it("picks the country from the browser locale", () => {
    expect(countryFromLocale("en-IN")).toBe("IN");
    expect(countryFromLocale("de_DE")).toBe("DE");
    expect(countryFromLocale("pt-BR")).toBe("BR");
    expect(countryFromLocale("en")).toBe("US");
    expect(countryFromLocale("es-419")).toBe("US");
    expect(countryFromLocale(null)).toBe("US");
  });

  it("lists every country by name, sorted", () => {
    expect(COUNTRIES).toHaveLength(249);
    expect(COUNTRIES.find((item) => item.value === "IN")?.label).toBe("India");
    const labels = COUNTRIES.map((item) => item.label);
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b, "en")));
    expect(COUNTRIES.every((item) => item.label !== item.value)).toBe(true);
  });
});
