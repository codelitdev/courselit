import { describe, expect, test } from "bun:test";
import { lessonPageHasQuiz, splitLessonPage } from "./lesson-page";

const quiz = {
  id: "qz_1",
  passingGrade: 70,
  questions: [
    {
      id: "q1",
      text: "Q?",
      multiple: false,
      options: [
        { id: "a", text: "A" },
        { id: "b", text: "B" },
      ],
    },
  ],
};
const paragraph = { type: "paragraph", content: [{ type: "text", text: "Hi" }] };

describe("splitLessonPage", () => {
  test("takes the quiz out of the document, even inside a callout", () => {
    expect(
      splitLessonPage({
        type: "doc",
        content: [
          paragraph,
          { type: "callout", content: [{ type: "quiz", attrs: quiz }] },
        ],
      }),
    ).toEqual({
      document: { type: "doc", content: [paragraph, { type: "callout", content: [] }] },
      quiz,
    });
  });

  test("returns no quiz for a page without one, and nothing for other content", () => {
    expect(splitLessonPage({ type: "doc", content: [paragraph] }).quiz).toBeNull();
    expect(splitLessonPage({ launchUrl: "index.html" })).toEqual({
      document: null,
      quiz: null,
    });
    expect(splitLessonPage(null)).toEqual({ document: null, quiz: null });
  });

  test("ignores a quiz that still carries answers", () => {
    const leaked = {
      ...quiz,
      questions: [
        { ...quiz.questions[0], options: [{ id: "a", text: "A", correct: true }] },
      ],
    };
    expect(
      splitLessonPage({ type: "doc", content: [{ type: "quiz", attrs: leaked }] }).quiz,
    ).toBeNull();
  });
});

describe("lessonPageHasQuiz", () => {
  test("finds nested quizzes", () => {
    expect(
      lessonPageHasQuiz({
        type: "doc",
        content: [{ type: "callout", content: [{ type: "quiz" }] }],
      }),
    ).toBe(true);
    expect(lessonPageHasQuiz({ type: "doc", content: [paragraph] })).toBe(false);
    expect(lessonPageHasQuiz(null)).toBe(false);
  });
});
