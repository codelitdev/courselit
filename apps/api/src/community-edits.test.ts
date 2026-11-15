import { describe, expect, it } from "bun:test";
import { commentWasEdited, postWasEdited } from "./community-edits.js";

const post = { title: "Hello", content: "Body", gifUrls: ["a.gif"] };

describe("postWasEdited", () => {
  it("is false when nothing readers see changed", () => {
    expect(postWasEdited(post, { ...post }, { before: ["m1"], after: undefined })).toBe(
      false,
    );
    expect(
      postWasEdited(post, { ...post }, { before: ["m1", "m2"], after: ["m2", "m1"] }),
    ).toBe(false);
  });

  it("is true when the title, content, GIFs or media change", () => {
    const none = { before: [], after: undefined };
    expect(postWasEdited(post, { ...post, title: "Hi" }, none)).toBe(true);
    expect(postWasEdited(post, { ...post, content: "New" }, none)).toBe(true);
    expect(postWasEdited(post, { ...post, gifUrls: [] }, none)).toBe(true);
    expect(postWasEdited(post, { ...post }, { before: ["m1"], after: [] })).toBe(true);
  });
});

describe("commentWasEdited", () => {
  it("follows the content and media", () => {
    const none = { before: [], after: undefined };
    expect(commentWasEdited({ content: "a" }, { content: "a" }, none)).toBe(false);
    expect(commentWasEdited({ content: "a" }, { content: "b" }, none)).toBe(true);
    expect(
      commentWasEdited(
        { content: "a" },
        { content: "a" },
        { before: [], after: ["m1"] },
      ),
    ).toBe(true);
  });
});
