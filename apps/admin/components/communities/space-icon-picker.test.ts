import { describe, expect, it } from "bun:test";
import { SPACE_ICONS } from "@courselit/api-contract/space-icons";
import { Megaphone, MessagesSquare } from "lucide-react";
import { SPACE_ICON_COMPONENTS, spaceIconFor } from "./space-icon-picker";

describe("spaceIconFor", () => {
  it("draws the chosen icon, and the default for anything else", () => {
    expect(spaceIconFor("Megaphone")).toBe(Megaphone);
    for (const name of [null, undefined, "", "NotAnIcon", "megaphone"]) {
      expect(spaceIconFor(name)).toBe(MessagesSquare);
    }
  });

  it("has an icon for every name in the shared list", () => {
    for (const { name } of SPACE_ICONS) expect(SPACE_ICON_COMPONENTS[name]).toBeDefined();
  });
});
