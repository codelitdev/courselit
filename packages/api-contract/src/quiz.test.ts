import { describe, expect, it } from "bun:test";
import {
  containsQuizAnswers,
  createQuizId,
  evaluateQuizBodySchema,
  learnerQuizSchema,
  normalizeQuiz,
  QUIZ_ID_PATTERN,
  QUIZ_LIMITS,
  type Quiz,
  readStoredQuiz,
  scoreQuiz,
  stripQuizAnswers,
} from "./quiz.js";

function quiz(overrides: Partial<Quiz> = {}): Quiz {
  return {
    id: "qz_1",
    passingGrade: 70,
    questions: [
      {
        id: "q1",
        text: "One correct answer",
        options: [
          { id: "q1a", text: "Correct", correct: true },
          { id: "q1b", text: "Wrong", correct: false },
        ],
      },
      {
        id: "q2",
        text: "Two correct answers",
        options: [
          { id: "q2a", text: "Correct one", correct: true },
          { id: "q2b", text: "Correct two", correct: true },
          { id: "q2c", text: "Wrong", correct: false },
        ],
      },
    ],
    ...overrides,
  };
}

function counter() {
  let next = 0;
  return (kind: string) => `${kind}_${++next}`;
}

describe("createQuizId", () => {
  it("makes IDs that match the ID pattern and differ", () => {
    const ids = new Set(Array.from({ length: 50 }, () => createQuizId("option")));
    expect(ids.size).toBe(50);
    for (const id of ids) expect(QUIZ_ID_PATTERN.test(id)).toBe(true);
    expect(createQuizId("quiz").startsWith("qz_")).toBe(true);
  });
});

describe("normalizeQuiz", () => {
  it("keeps valid content and returns the canonical shape", () => {
    const input = { ...quiz(), extra: "dropped" };
    const result = normalizeQuiz(input);
    expect(result).toEqual({ ok: true, value: quiz() });
  });

  it("fills missing quiz, question and option IDs", () => {
    const result = normalizeQuiz(
      {
        questions: [
          {
            text: "Pick one",
            options: [
              { text: "A", correct: true },
              { id: "kept", text: "B" },
            ],
          },
        ],
      },
      { newId: counter() },
    );
    expect(result).toEqual({
      ok: true,
      value: {
        id: "quiz_1",
        passingGrade: null,
        questions: [
          {
            id: "question_2",
            text: "Pick one",
            options: [
              { id: "option_3", text: "A", correct: true },
              { id: "kept", text: "B", correct: false },
            ],
          },
        ],
      },
    });
  });

  it("never fills in an ID that the content already uses", () => {
    const ids = ["taken", "taken", "fresh_q", "fresh_o"];
    const result = normalizeQuiz(
      {
        id: "taken",
        questions: [
          {
            text: "Q",
            options: [
              { text: "A", correct: true },
              { id: "b", text: "B" },
            ],
          },
        ],
      },
      { newId: () => ids.shift()! },
    );
    expect(result.ok && result.value.questions[0]!.id).toBe("fresh_q");
  });

  it("refuses malformed and duplicate IDs", () => {
    expect(normalizeQuiz({ ...quiz(), id: "has space" })).toMatchObject({
      ok: false,
      reason: "quiz_id_invalid",
      path: "id",
    });
    expect(normalizeQuiz({ ...quiz(), id: "x".repeat(65) })).toMatchObject({
      reason: "quiz_id_invalid",
    });
    expect(normalizeQuiz({ ...quiz(), id: 42 })).toMatchObject({
      reason: "quiz_id_invalid",
    });
    const duplicateQuestion = quiz();
    duplicateQuestion.questions[1]!.id = "q1";
    expect(normalizeQuiz(duplicateQuestion)).toMatchObject({
      reason: "quiz_id_duplicate",
      path: "questions.1.id",
    });
    const duplicateOption = quiz();
    duplicateOption.questions[1]!.options[0]!.id = "q1a";
    expect(normalizeQuiz(duplicateOption)).toMatchObject({
      reason: "quiz_id_duplicate",
      path: "questions.1.options.0.id",
    });
    // An ID equal to an error code is still just an ID.
    expect(normalizeQuiz({ ...quiz(), id: "quiz_id_invalid" }).ok).toBe(true);
  });

  it("requires IDs when asked to, as for stored content", () => {
    const { id: _id, ...withoutId } = quiz();
    expect(normalizeQuiz(withoutId, { fillIds: false })).toMatchObject({
      reason: "quiz_id_invalid",
    });
    expect(readStoredQuiz(withoutId)).toBeNull();
    expect(readStoredQuiz(quiz())).toEqual(quiz());
  });

  it("treats a missing pass mark as none and refuses one outside 0-100", () => {
    const { passingGrade: _grade, ...withoutGrade } = quiz();
    expect(normalizeQuiz(withoutGrade)).toMatchObject({
      ok: true,
      value: { passingGrade: null },
    });
    expect(normalizeQuiz({ ...quiz(), passingGrade: 0 })).toMatchObject({
      value: { passingGrade: 0 },
    });
    for (const passingGrade of [-1, 101, "70", Number.NaN]) {
      expect(normalizeQuiz({ ...quiz(), passingGrade })).toMatchObject({
        reason: "quiz_passing_grade_invalid",
      });
    }
  });

  it("enforces the content rules the editor shows", () => {
    expect(normalizeQuiz(null)).toMatchObject({ reason: "quiz_invalid" });
    expect(normalizeQuiz({ questions: [] })).toMatchObject({
      reason: "quiz_questions_required",
    });
    const blankQuestion = quiz();
    blankQuestion.questions[0]!.text = "  ";
    expect(normalizeQuiz(blankQuestion)).toMatchObject({
      reason: "quiz_question_text_required",
    });
    const oneOption = quiz();
    oneOption.questions[0]!.options.pop();
    expect(normalizeQuiz(oneOption)).toMatchObject({ reason: "quiz_options_required" });
    const blankOption = quiz();
    blankOption.questions[0]!.options[1]!.text = "";
    expect(normalizeQuiz(blankOption)).toMatchObject({
      reason: "quiz_option_text_required",
    });
    const noCorrect = quiz();
    noCorrect.questions[0]!.options[0]!.correct = false;
    expect(normalizeQuiz(noCorrect)).toMatchObject({
      reason: "quiz_correct_answer_required",
    });
  });

  it("limits questions and options", () => {
    const option = (correct: boolean) => ({ text: "Option", correct });
    const question = (options: number) => ({
      text: "Question",
      options: [option(true), ...Array.from({ length: options - 1 }, () => option(false))],
    });
    expect(
      normalizeQuiz({ questions: Array.from({ length: QUIZ_LIMITS.questions }, () => question(2)) })
        .ok,
    ).toBe(true);
    expect(
      normalizeQuiz({
        questions: Array.from({ length: QUIZ_LIMITS.questions + 1 }, () => question(2)),
      }),
    ).toMatchObject({ reason: "quiz_too_many_questions" });
    expect(
      normalizeQuiz({ questions: [question(QUIZ_LIMITS.optionsPerQuestion)] }).ok,
    ).toBe(true);
    expect(
      normalizeQuiz({ questions: [question(QUIZ_LIMITS.optionsPerQuestion + 1)] }),
    ).toMatchObject({ reason: "quiz_too_many_options" });
  });
});

describe("stripQuizAnswers", () => {
  it("drops every correct flag and marks multiple-answer questions", () => {
    const stripped = stripQuizAnswers(quiz());
    expect(stripped).toEqual({
      id: "qz_1",
      passingGrade: 70,
      questions: [
        {
          id: "q1",
          text: "One correct answer",
          multiple: false,
          options: [
            { id: "q1a", text: "Correct" },
            { id: "q1b", text: "Wrong" },
          ],
        },
        {
          id: "q2",
          text: "Two correct answers",
          multiple: true,
          options: [
            { id: "q2a", text: "Correct one" },
            { id: "q2b", text: "Correct two" },
            { id: "q2c", text: "Wrong" },
          ],
        },
      ],
    });
    expect(containsQuizAnswers(stripped)).toBe(false);
    expect(learnerQuizSchema.safeParse(stripped).success).toBe(true);
  });

  it("is the only shape the learner schema accepts", () => {
    expect(learnerQuizSchema.safeParse(quiz()).success).toBe(false);
  });
});

describe("scoreQuiz", () => {
  it("gives one point per correct option chosen", () => {
    expect(scoreQuiz(quiz(), { q1: ["q1a"], q2: [] })).toEqual({
      ok: true,
      value: { score: (1 / 3) * 100, pass: false },
    });
    expect(scoreQuiz(quiz(), { q1: ["q1a"], q2: ["q2a", "q2b"] })).toEqual({
      ok: true,
      value: { score: 100, pass: true },
    });
    expect(scoreQuiz(quiz(), {})).toEqual({ ok: true, value: { score: 0, pass: false } });
  });

  it("refuses more than one option on a single-answer question", () => {
    expect(scoreQuiz(quiz(), { q1: ["q1a", "q1b"] })).toEqual({
      ok: false,
      reason: "answers_missing_or_invalid",
    });
  });

  it("cancels a correct option for each wrong one in a multi-answer question", () => {
    // q2: two right, one wrong -> 1 point; q1 right -> 1 point; 2 of 3.
    expect(
      scoreQuiz(quiz(), { q1: ["q1a"], q2: ["q2a", "q2b", "q2c"] }),
    ).toEqual({ ok: true, value: { score: (2 / 3) * 100, pass: false } });
    // One right and one wrong cancel out; a question never goes below zero.
    expect(scoreQuiz(quiz(), { q2: ["q2a", "q2c"] })).toMatchObject({
      value: { score: 0 },
    });
    expect(scoreQuiz(quiz(), { q2: ["q2c"] })).toMatchObject({ value: { score: 0 } });
  });

  it("can't be passed by choosing every option", () => {
    const multiOnly = quiz({ passingGrade: 70, questions: [quiz().questions[1]!] });
    expect(scoreQuiz(multiOnly, { q2: ["q2a", "q2b", "q2c"] })).toEqual({
      ok: true,
      value: { score: 50, pass: false },
    });
    expect(scoreQuiz(quiz(), { q1: ["q1a", "q1b"], q2: ["q2a", "q2b", "q2c"] })).toEqual({
      ok: false,
      reason: "answers_missing_or_invalid",
    });
  });

  it("passes on the pass mark and passes every attempt without one", () => {
    const withMark = quiz({ passingGrade: (2 / 3) * 100 });
    expect(scoreQuiz(withMark, { q2: ["q2a", "q2b"] })).toMatchObject({
      value: { pass: true },
    });
    expect(scoreQuiz(quiz({ passingGrade: null }), {})).toEqual({
      ok: true,
      value: { score: 0, pass: true },
    });
  });

  it("counts a repeated option once", () => {
    expect(scoreQuiz(quiz(), { q1: ["q1a", "q1a"] })).toMatchObject({
      value: { score: (1 / 3) * 100 },
    });
  });

  it("refuses unknown questions and options", () => {
    expect(scoreQuiz(quiz(), { nope: [] })).toEqual({
      ok: false,
      reason: "answers_missing_or_invalid",
    });
    expect(scoreQuiz(quiz(), { q1: ["q2a"] })).toEqual({
      ok: false,
      reason: "answers_missing_or_invalid",
    });
  });
});

describe("evaluateQuizBodySchema", () => {
  it("takes a quiz ID and option IDs per question ID", () => {
    expect(
      evaluateQuizBodySchema.safeParse({ quizId: "qz_1", answers: { q1: ["q1a"] } })
        .success,
    ).toBe(true);
    expect(evaluateQuizBodySchema.safeParse({ answers: { q1: ["q1a"] } }).success).toBe(
      false,
    );
    expect(
      evaluateQuizBodySchema.safeParse({ quizId: "qz_1", answers: [[0]] }).success,
    ).toBe(false);
    expect(
      evaluateQuizBodySchema.safeParse({ quizId: "qz_1", answers: { q1: ["bad id"] } })
        .success,
    ).toBe(false);
  });
});

describe("containsQuizAnswers", () => {
  it("finds a correct key at any depth", () => {
    expect(containsQuizAnswers({ type: "doc", content: [{ attrs: { correct: false } }] })).toBe(
      true,
    );
    expect(containsQuizAnswers({ type: "doc", content: [{ text: "correct" }] })).toBe(false);
  });
});
