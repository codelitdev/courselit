import { describe, expect, it } from "bun:test";
import { selectedSchoolName } from "./courselit-email-editor";

describe("selectedSchoolName", () => {
  it("names the selected school", () => {
    expect(
      selectedSchoolName({
        items: [{ name: "Acme" }, { name: "Hathi", selected: true }],
      }),
    ).toBe("Hathi");
  });

  it("falls back to the first school when none is marked selected", () => {
    expect(selectedSchoolName({ items: [{ name: "Acme" }, { name: "Hathi" }] })).toBe("Acme");
  });

  it("has no name when there are no schools or the name is blank", () => {
    expect(selectedSchoolName(null)).toBeUndefined();
    expect(selectedSchoolName({ items: [] })).toBeUndefined();
    expect(selectedSchoolName({ items: [{ name: "  ", selected: true }] })).toBeUndefined();
  });
});
