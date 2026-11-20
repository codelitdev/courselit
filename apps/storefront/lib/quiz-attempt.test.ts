import { describe, expect, it } from "bun:test";
import {
  quizEvaluationError,
  quizEvaluationSummary,
  readLearnerQuiz,
  toggleQuizAnswer,
} from "./quiz-attempt";

const learnerQuiz = {
  id: "qz_1",
  passingGrade: 70,
  questions: [
    {
      id: "q1",
      text: "Pick",
      multiple: false,
      options: [
        { id: "o1", text: "Yes" },
        { id: "o2", text: "No" },
      ],
    },
  ],
};

describe("readLearnerQuiz", () => {
  it("reads the stripped quiz and nothing else", () => {
    expect(readLearnerQuiz(learnerQuiz)).toEqual(learnerQuiz);
    expect(readLearnerQuiz({ type: "doc", content: [] })).toBeNull();
    expect(readLearnerQuiz({ ...learnerQuiz, questions: [] })).toBeNull();
    // The old index-based shape is not a quiz any more.
    expect(
      readLearnerQuiz({ questions: [{ text: "Pick", options: [{ text: "Yes" }] }] }),
    ).toBeNull();
  });
});

describe("toggleQuizAnswer", () => {
  it("replaces the choice for single-answer questions", () => {
    const first = toggleQuizAnswer({}, "q1", "o1", false);
    expect(toggleQuizAnswer(first, "q1", "o2", false)).toEqual({ q1: ["o2"] });
  });

  it("adds and removes choices for multiple-answer questions", () => {
    const one = toggleQuizAnswer({ q2: ["a"] }, "q1", "o1", true);
    const two = toggleQuizAnswer(one, "q1", "o2", true);
    expect(two).toEqual({ q2: ["a"], q1: ["o1", "o2"] });
    expect(toggleQuizAnswer(two, "q1", "o1", true)).toEqual({ q2: ["a"], q1: ["o2"] });
  });
});

describe("quiz evaluation copy", () => {
  it("shows the pass mark only when there is one", () => {
    expect(
      quizEvaluationSummary({ quizId: "qz_1", pass: false, score: 50, passingGrade: 70 }),
    ).toBe("Not passed · Score: 50.00% · Passing grade: 70%");
    expect(
      quizEvaluationSummary({ quizId: "qz_1", pass: true, score: 0, passingGrade: null }),
    ).toBe("Passed · Score: 0.00%");
  });

  it("explains a changed quiz and the attempt limit", () => {
    expect(quizEvaluationError(409, "quiz_changed")).toContain("Reload the page");
    expect(quizEvaluationError(429, null)).toContain("wait a few minutes");
    expect(quizEvaluationError(403, null)).toBe("This quiz is not available yet.");
    expect(quizEvaluationError(500, null)).toBe("Unable to evaluate the quiz.");
  });
});
