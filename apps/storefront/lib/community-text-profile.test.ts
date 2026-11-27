import { describe, expect, it } from "bun:test";
import { validateContent } from "@frontlit/text-editor/blocks";
import { communityEditorProfile, communityTextProfile } from "./community-text-profile";

const doc = (...content: unknown[]) => ({ type: "doc", content });
const text = (value: string, marks?: unknown[]) => ({
  type: "text",
  text: value,
  ...(marks ? { marks } : {}),
});

const allowed = doc(
  { type: "paragraph", content: [text("hi", [{ type: "bold" }, { type: "italic" }])] },
  { type: "heading", attrs: { level: 2 }, content: [text("Section")] },
  { type: "heading", attrs: { level: 3 }, content: [text("Sub")] },
  {
    type: "bulletList",
    content: [
      { type: "listItem", content: [{ type: "paragraph", content: [text("a")] }] },
    ],
  },
  { type: "blockquote", content: [{ type: "paragraph", content: [text("q")] }] },
);

const refused = {
  "heading 1": { type: "heading", attrs: { level: 1 }, content: [text("Big")] },
  image: { type: "image", attrs: { src: "https://example.com/a.png" } },
  "code block": { type: "codeBlock", content: [text("x = 1")] },
  divider: { type: "horizontalRule" },
};

describe("communityTextProfile", () => {
  it("allows basic rich text", () => {
    expect(validateContent(communityTextProfile, allowed).diagnostics).toEqual([]);
  });

  for (const [name, node] of Object.entries(refused)) {
    it(`refuses a ${name}`, () => {
      expect(validateContent(communityTextProfile, doc(node)).diagnostics).not.toEqual(
        [],
      );
    });
  }
});

describe("communityEditorProfile", () => {
  it("edits new, plain-text and in-profile content with the community profile", () => {
    for (const content of [undefined, null, "Older plain text", allowed]) {
      expect(communityEditorProfile(content)).toBe(communityTextProfile);
    }
  });

  it("keeps the default profile for content it would otherwise drop", () => {
    expect(communityEditorProfile(doc(refused.image))).toBeUndefined();
    expect(communityEditorProfile(doc(refused["heading 1"]))).toBeUndefined();
  });
});
