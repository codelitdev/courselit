import { describe, expect, it } from "bun:test";
import { editedNote } from "./community-edited";

describe("editedNote", () => {
  it("is empty for content that was never edited", () => {
    expect(editedNote(null)).toBeNull();
    expect(editedNote(undefined)).toBeNull();
    expect(editedNote("")).toBeNull();
  });

  it("ignores a date it can't read", () => {
    expect(editedNote("not a date")).toBeNull();
  });

  it("labels edited content and gives the time in its title", () => {
    const note = editedNote("2026-03-06T10:30:00.000Z", "en-US");
    expect(note?.label).toBe("Edited");
    expect(note?.title).toStartWith("Edited Mar 6, 2026");
  });
});
