import { describe, expect, it } from "bun:test";
import {
  PAGE_BUILDER_DEFAULT_COPYRIGHT,
  hasOwnCopyright,
  withoutDefaultCopyright,
  withSchoolCopyright,
} from "./copyright";

const year = new Date().getFullYear();
const footer = (copyrightText?: string) => ({
  name: "footer",
  settings: { columns: [], ...(copyrightText === undefined ? {} : { copyrightText }) },
});

describe("footer copyright", () => {
  it("treats empty text and the page builder's placeholder as not the school's own", () => {
    expect(hasOwnCopyright(undefined)).toBe(false);
    expect(hasOwnCopyright("  ")).toBe(false);
    expect(hasOwnCopyright(PAGE_BUILDER_DEFAULT_COPYRIGHT)).toBe(false);
    expect(hasOwnCopyright("© Acme Ltd")).toBe(true);
  });

  it("shows the school's line in the editor unless the school wrote its own", () => {
    const [empty] = withSchoolCopyright([footer()], "Acme");
    const [placeholder] = withSchoolCopyright([footer(PAGE_BUILDER_DEFAULT_COPYRIGHT)], "Acme");
    const [own] = withSchoolCopyright([footer("© Acme Ltd")], "Acme");
    expect(empty!.settings!.copyrightText).toBe(`© ${year} Acme`);
    expect(placeholder!.settings!.copyrightText).toBe(`© ${year} Acme`);
    expect(own!.settings!.copyrightText).toBe("© Acme Ltd");
  });

  it("does not store text that was only filled in as a default", () => {
    const saved = withoutDefaultCopyright(
      [footer(`© ${year} Acme`), footer(PAGE_BUILDER_DEFAULT_COPYRIGHT), footer("© Acme Ltd")],
      "Acme",
    );
    expect("copyrightText" in saved[0]!.settings!).toBe(false);
    expect("copyrightText" in saved[1]!.settings!).toBe(false);
    expect(saved[2]!.settings!.copyrightText).toBe("© Acme Ltd");
  });

  it("leaves other blocks alone and keeps the other footer settings", () => {
    const layout = [{ name: "header", settings: { copyrightText: "x" } }, footer(PAGE_BUILDER_DEFAULT_COPYRIGHT)];
    const out = withoutDefaultCopyright(layout, "Acme");
    expect(out[0]).toEqual(layout[0]!);
    expect(out[1]!.settings).toEqual({ columns: [] });
  });
});
