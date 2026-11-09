import { describe, expect, it } from "bun:test";
import { oppositeSide, textSide } from "./text-side";

describe("text side", () => {
  it("keeps left and right", () => {
    expect(textSide("left")).toBe("left");
    expect(textSide("right")).toBe("right");
  });

  it("reads the removed stacked layouts as a side", () => {
    expect(textSide("top")).toBe("left");
    expect(textSide("bottom")).toBe("right");
  });

  it("defaults to text on the left", () => {
    expect(textSide(undefined)).toBe("left");
    expect(textSide("anything")).toBe("left");
  });

  it("puts the card opposite the text", () => {
    expect(oppositeSide("left")).toBe("right");
    expect(oppositeSide("right")).toBe("left");
  });
});
