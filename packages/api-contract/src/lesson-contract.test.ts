import { describe, expect, it } from "bun:test";
import {
  createLessonBodySchema,
  learnerLessonContentSchema,
  lessonSchema,
  lessonSummarySchema,
  updateLessonBodySchema,
} from "./index.js";

describe("lesson contract", () => {
  it("takes the page, SCORM and file types only, page by default", () => {
    expect(createLessonBodySchema.parse({ title: "A" }).type).toBe("page");
    for (const type of ["page", "scorm", "file"]) {
      expect(createLessonBodySchema.safeParse({ title: "A", type }).success).toBe(true);
    }
    for (const type of ["text", "video", "audio", "pdf", "embed", "quiz"]) {
      expect(createLessonBodySchema.safeParse({ title: "A", type }).success).toBe(
        false,
      );
    }
  });

  it("takes content or markdown, not both", () => {
    expect(
      createLessonBodySchema.safeParse({ title: "A", markdown: "Hi" }).success,
    ).toBe(true);
    expect(
      createLessonBodySchema.safeParse({ title: "A", markdown: "Hi", content: {} })
        .success,
    ).toBe(false);
    expect(
      updateLessonBodySchema.safeParse({
        markdown: "Hi",
        content: {},
        expectedContentVersion: 1,
      }).success,
    ).toBe(false);
    expect(updateLessonBodySchema.safeParse({ downloadable: true }).data).toEqual({});
  });

  it("keeps content out of list items and in single-lesson reads", () => {
    expect(Object.keys(lessonSummarySchema.shape)).not.toContain("content");
    expect(Object.keys(lessonSummarySchema.shape)).not.toContain("markdown");
    expect(Object.keys(lessonSchema.shape)).toEqual(
      expect.arrayContaining(["content", "markdown"]),
    );
  });

  it("refuses learner content that carries answers (L1)", () => {
    const page = (correct?: boolean) => ({
      type: "doc",
      content: [
        {
          type: "quiz",
          attrs: {
            id: "qz",
            passingGrade: null,
            questions: [
              {
                id: "q",
                text: "Q",
                multiple: false,
                options: [
                  { id: "a", text: "A", ...(correct === undefined ? {} : { correct }) },
                ],
              },
            ],
          },
        },
      ],
    });
    expect(learnerLessonContentSchema.safeParse(page()).success).toBe(true);
    expect(learnerLessonContentSchema.safeParse(page(true)).success).toBe(false);
    expect(learnerLessonContentSchema.safeParse(page(false)).success).toBe(false);
  });
});
