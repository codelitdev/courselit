import { describe, expect, it } from "bun:test";
import {
  quizEvaluationError,
  quizEvaluationSummary,
  readLearnerQuiz,
  submitQuizAttempt,
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
    ).toBe("Score: 50.00% · Passing grade: 70%");
    expect(
      quizEvaluationSummary({ quizId: "qz_1", pass: true, score: 0, passingGrade: null }),
    ).toBe("Score: 0.00%");
  });

  it("explains a changed quiz and the attempt limit", () => {
    expect(quizEvaluationError(409, "quiz_changed")).toContain("Loading the new quiz");
    expect(quizEvaluationError(429, null)).toContain("wait a few minutes");
    expect(quizEvaluationError(403, null)).toBe("This quiz is not available yet.");
    expect(quizEvaluationError(500, null)).toBe("Unable to evaluate the quiz.");
  });
});

describe("submitQuizAttempt", () => {
  const input = {
    productId: "p1",
    lessonId: "l1",
    quizId: "qz_1",
    answers: { q1: ["o1"] },
    headers: (extra?: Record<string, string>) => new Headers(extra),
  };

  it("sends the quiz ID and answers by ID and returns the evaluation", async () => {
    let request: { url: string; body: unknown } | null = null;
    const fetcher = (async (url: string, init: RequestInit) => {
      request = { url, body: JSON.parse(String(init.body)) };
      return Response.json({ quizId: "qz_1", pass: true, score: 100, passingGrade: 70 });
    }) as unknown as typeof fetch;
    expect(await submitQuizAttempt(input, fetcher)).toEqual({
      kind: "evaluated",
      evaluation: { quizId: "qz_1", pass: true, score: 100, passingGrade: 70 },
    });
    expect(request).toEqual({
      url: "/api/v1/learner/products/p1/lessons/l1/evaluation",
      body: { quizId: "qz_1", answers: { q1: ["o1"] } },
    });
  });

  it("asks for a reload when the quiz changed", async () => {
    const fetcher = (async () =>
      Response.json({ details: { reason: "quiz_changed" } }, { status: 409 })) as unknown as typeof fetch;
    expect(await submitQuizAttempt(input, fetcher)).toEqual({ kind: "quiz_changed" });
  });

  it("explains other failures", async () => {
    const limited = (async () =>
      new Response("{}", { status: 429 })) as unknown as typeof fetch;
    expect(await submitQuizAttempt(input, limited)).toEqual({
      kind: "failed",
      message: quizEvaluationError(429, null),
    });
    const malformed = (async () => Response.json({ ok: true })) as unknown as typeof fetch;
    expect(await submitQuizAttempt(input, malformed)).toEqual({
      kind: "failed",
      message: "Unable to evaluate the quiz.",
    });
  });
});
