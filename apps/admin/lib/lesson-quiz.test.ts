import { describe, expect, it } from "bun:test";
import { QUIZ_LIMITS } from "@courselit/api-contract/quiz";
import {
  clampPassingGrade,
  DEFAULT_PASSING_GRADE,
  emptyQuizContent,
  quizContentError,
  quizContentFromEditor,
  quizEditorReducer,
  quizEditorState,
  sameQuizContent,
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

describe("quizEditorReducer", () => {
  const start = () => quizEditorState(structuredClone(saved));

  it("adds questions with a fresh ID and one empty option, as main does", () => {
    const next = quizEditorReducer(start(), { type: "addQuestion" });
    expect(next.questions).toHaveLength(2);
    const added = next.questions[1]!;
    expect(added.id).not.toBe("q1");
    expect(added.text).toBe("Question #2");
    expect(added.options).toHaveLength(1);
    expect(added.options[0]).toMatchObject({ text: "", correct: false });
  });

  it("keeps the first question and removes later ones", () => {
    const two = quizEditorReducer(start(), { type: "addQuestion" });
    expect(quizEditorReducer(two, { type: "removeQuestion", question: 0 })).toBe(two);
    const one = quizEditorReducer(two, { type: "removeQuestion", question: 1 });
    expect(one.questions.map((question) => question.id)).toEqual(["q1"]);
  });

  it("edits question and option text and marks options correct", () => {
    let state = quizEditorReducer(start(), {
      type: "setQuestionText",
      question: 0,
      text: "Which?",
    });
    state = quizEditorReducer(state, {
      type: "setOptionText",
      question: 0,
      option: 1,
      text: "Maybe",
    });
    state = quizEditorReducer(state, {
      type: "setOptionCorrect",
      question: 0,
      option: 1,
      correct: true,
    });
    expect(quizContentFromEditor(state)).toEqual({
      id: "qz_1",
      passingGrade: 80,
      questions: [
        {
          id: "q1",
          text: "Which?",
          options: [
            { id: "o1", text: "Yes", correct: true },
            { id: "o2", text: "Maybe", correct: true },
          ],
        },
      ],
    });
  });

  it("adds and removes options but never the last one", () => {
    let state = quizEditorReducer(start(), { type: "addOption", question: 0 });
    expect(state.questions[0]!.options).toHaveLength(3);
    state = quizEditorReducer(state, { type: "removeOption", question: 0, option: 0 });
    state = quizEditorReducer(state, { type: "removeOption", question: 0, option: 0 });
    expect(state.questions[0]!.options).toHaveLength(1);
    expect(
      quizEditorReducer(state, { type: "removeOption", question: 0, option: 0 }),
    ).toBe(state);
  });

  it("stops at the API's limits", () => {
    let state = start();
    for (let i = 0; i < QUIZ_LIMITS.questions + 5; i += 1) {
      state = quizEditorReducer(state, { type: "addQuestion" });
    }
    expect(state.questions).toHaveLength(QUIZ_LIMITS.questions);
    let options = start();
    for (let i = 0; i < QUIZ_LIMITS.optionsPerQuestion + 5; i += 1) {
      options = quizEditorReducer(options, { type: "addOption", question: 0 });
    }
    expect(options.questions[0]!.options).toHaveLength(QUIZ_LIMITS.optionsPerQuestion);
  });

  it("makes the pass mark optional and keeps it in 0–100", () => {
    let state = quizEditorReducer(start(), { type: "setGraded", graded: false });
    expect(quizContentFromEditor(state).passingGrade).toBeNull();
    state = quizEditorReducer(state, { type: "setGraded", graded: true });
    state = quizEditorReducer(state, { type: "setPassingGrade", value: 140 });
    expect(quizContentFromEditor(state).passingGrade).toBe(100);
    expect(clampPassingGrade(-3)).toBe(0);
    expect(clampPassingGrade(Number.NaN)).toBe(0);
    expect(clampPassingGrade(69.6)).toBe(70);
  });

  it("ignores edits to questions or options that don't exist", () => {
    const state = start();
    expect(
      quizEditorReducer(state, { type: "setQuestionText", question: 5, text: "x" }),
    ).toBe(state);
    expect(
      quizEditorReducer(state, {
        type: "setOptionText",
        question: 0,
        option: 9,
        text: "x",
      }).questions[0]!.options,
    ).toEqual(state.questions[0]!.options);
  });
});

describe("sameQuizContent", () => {
  it("matches attributes the editor wrote and spots outside changes", () => {
    const state = quizEditorState(saved);
    expect(sameQuizContent(state, saved)).toBe(true);
    expect(sameQuizContent(state, { ...saved, passingGrade: 50 })).toBe(false);
  });

  it("flags attributes without IDs, so the editor writes its IDs back", () => {
    const withoutIds = {
      passingGrade: null,
      questions: [{ text: "Q", options: [{ text: "A", correct: true }] }],
    };
    const state = quizEditorState(withoutIds);
    expect(sameQuizContent(state, withoutIds)).toBe(false);
    expect(sameQuizContent(state, quizContentFromEditor(state))).toBe(true);
  });
});
