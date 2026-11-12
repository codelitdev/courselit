import { describe, expect, it } from "bun:test";
import { MAX_TITLE_DISPLAY_LENGTH, truncateText } from "./truncate";

describe("truncateText", () => {
  it("leaves text within the limit alone", () => {
    expect(truncateText("Welcome", 10)).toBe("Welcome");
    expect(truncateText("x".repeat(10), 10)).toBe("x".repeat(10));
  });

  it("cuts long text to the limit, ending in an ellipsis", () => {
    const result = truncateText("abcdefghijkl", 6);
    expect(result).toBe("abcde…");
    expect(Array.from(result)).toHaveLength(6);
  });

  it("drops trailing spaces before the ellipsis", () => {
    expect(truncateText("abcd    efgh", 6)).toBe("abcd…");
  });

  it("never splits an emoji", () => {
    expect(truncateText("😀😀😀😀", 3)).toBe("😀😀…");
  });

  it("defaults to the page-title length", () => {
    const result = truncateText("y".repeat(200));
    expect(Array.from(result)).toHaveLength(MAX_TITLE_DISPLAY_LENGTH);
  });
});
