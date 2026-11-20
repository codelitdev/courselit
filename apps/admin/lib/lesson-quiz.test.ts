import { describe, expect, it } from "bun:test";
import {
  DEFAULT_PASSING_GRADE,
  emptyQuizContent,
  LESSON_CONFLICT_MESSAGE,
  lessonSaveErrorMessage,
  quizContentError,
  quizContentFromEditor,
  quizEditorState,
} from "./lesson-quiz";

const saved = {
  id: "qz_1",
  passingGrade: 80,
  questions: [
    {
      id: "q1",
      text: "Pick",
      options: [
        { id: "o1", text: "Yes", correct: true },
        { id: "o2", text: "No", correct: false },
      ],
    },
  ],
};

describe("quiz editor state", () => {
  it("round-trips saved content and keeps every ID", () => {
    const state = quizEditorState(saved);
    expect(state).toMatchObject({ id: "qz_1", graded: true, passingGrade: 80 });
    expect(quizContentFromEditor(state)).toEqual(saved);
  });

  it("saves no pass mark while grading is off and restores it when back on", () => {
    const state = quizEditorState(saved);
    const ungraded = { ...state, graded: false };
    expect(quizContentFromEditor(ungraded)).toMatchObject({ passingGrade: null });
    expect(quizContentFromEditor({ ...ungraded, graded: true })).toMatchObject({
      passingGrade: 80,
    });
  });

  it("reads an ungraded quiz with the default pass mark ready", () => {
    const state = quizEditorState({ ...saved, passingGrade: null });
    expect(state).toMatchObject({ graded: false, passingGrade: DEFAULT_PASSING_GRADE });
  });

  it("gives a new quiz valid IDs", () => {
    const content = emptyQuizContent() as {
      id: string;
      passingGrade: null;
      questions: Array<{ id: string; options: Array<{ id: string }> }>;
    };
    expect(content.passingGrade).toBeNull();
    for (const id of [
      content.id,
      content.questions[0]!.id,
      content.questions[0]!.options[0]!.id,
    ]) {
      expect(id).toMatch(/^[A-Za-z0-9_-]{1,64}$/);
    }
  });
});

describe("quizContentError", () => {
  it("accepts valid content and explains what the API would refuse", () => {
    expect(quizContentError(saved)).toBeUndefined();
    expect(quizContentError(emptyQuizContent())).toBe(
      "Each question must have at least two options.",
    );
    const noCorrect = structuredClone(saved);
    noCorrect.questions[0]!.options[0]!.correct = false;
    expect(quizContentError(noCorrect)).toBe(
      "Each question must have at least one correct answer.",
    );
  });
});

describe("lessonSaveErrorMessage", () => {
  it("explains a content version conflict", () => {
    expect(
      lessonSaveErrorMessage(409, {
        code: "conflict",
        message: "Conflict",
        details: { reason: "content_version_mismatch" },
      }),
    ).toBe(LESSON_CONFLICT_MESSAGE);
    expect(lessonSaveErrorMessage(400, { message: "Bad input" })).toBe("Bad input");
    expect(lessonSaveErrorMessage(500, null)).toBe("Unable to save the lesson.");
  });
});
