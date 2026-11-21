import { describe, expect, it } from "bun:test";
import { courseLessonPage } from "./api";

describe("courseLessonPage", () => {
  it("writes the creator's text as a page", () => {
    expect(courseLessonPage("text", "Hello", null)).toMatchObject({
      type: "doc",
      content: [{ type: "paragraph" }],
    });
  });

  it("puts the uploaded video in a Video block", () => {
    expect(courseLessonPage("video", "", "med_1")).toEqual({
      type: "doc",
      content: [{ type: "video", attrs: { media: "med_1" } }],
    });
    expect(courseLessonPage("video", "", null)).toEqual({ type: "doc", content: [] });
  });
});
