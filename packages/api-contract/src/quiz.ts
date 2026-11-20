/**
 * The quiz shape shared by the quiz lesson today and the Quiz block of a
 * lesson page later (docs/wip/lesson-pages.md, section 5). Everything here is
 * pure, so the API, the admin editor and the storefront use the same rules.
 *
 * Authors see `correct` on every option. Learners only ever get the output of
 * `stripQuizAnswers`, whose type and schema have no `correct` field (L1).
 */
import { z } from "zod";

/** IDs of quizzes, questions and options (L7). */
export const QUIZ_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export const QUIZ_LIMITS = {
  questions: 100,
  optionsPerQuestion: 20,
} as const;

export type QuizOption = { id: string; text: string; correct: boolean };
export type QuizQuestion = { id: string; text: string; options: QuizOption[] };
export type Quiz = {
  id: string;
  /** 0–100. Without a pass mark every attempt passes. */
  passingGrade: number | null;
  questions: QuizQuestion[];
};

export type LearnerQuizOption = { id: string; text: string };
export type LearnerQuizQuestion = {
  id: string;
  text: string;
  /** More than one option is correct, so the learner may pick several. */
  multiple: boolean;
  options: LearnerQuizOption[];
};
export type LearnerQuiz = {
  id: string;
  passingGrade: number | null;
  questions: LearnerQuizQuestion[];
};

/** Chosen option IDs per question ID. */
export type QuizAnswers = Record<string, string[]>;

export type QuizValidationReason =
  | "quiz_invalid"
  | "quiz_id_invalid"
  | "quiz_id_duplicate"
  | "quiz_passing_grade_invalid"
  | "quiz_questions_required"
  | "quiz_too_many_questions"
  | "quiz_question_text_required"
  | "quiz_options_required"
  | "quiz_too_many_options"
  | "quiz_option_text_required"
  | "quiz_correct_answer_required";

export type QuizValidationResult =
  | { ok: true; value: Quiz }
  | { ok: false; reason: QuizValidationReason; path: string };

export type QuizIdKind = "quiz" | "question" | "option";

const ID_PREFIX: Record<QuizIdKind, string> = {
  quiz: "qz_",
  question: "q_",
  option: "o_",
};
const ID_ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/** A random ID such as `q_3fZk9P0aQm1x`, matching QUIZ_ID_PATTERN. */
export function createQuizId(kind: QuizIdKind): string {
  const bytes = new Uint8Array(12);
  globalThis.crypto.getRandomValues(bytes);
  let suffix = "";
  for (const byte of bytes) suffix += ID_ALPHABET[byte % ID_ALPHABET.length];
  return `${ID_PREFIX[kind]}${suffix}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

/**
 * Reads author input into the canonical quiz shape. Unknown fields are
 * dropped. Missing IDs are filled in (pass `fillIds: false` to require them,
 * e.g. for stored content); malformed or duplicate IDs are refused.
 */
export function normalizeQuiz(
  input: unknown,
  options: { fillIds?: boolean; newId?: (kind: QuizIdKind) => string } = {},
): QuizValidationResult {
  const fillIds = options.fillIds ?? true;
  const newId = options.newId ?? createQuizId;
  const fail = (reason: QuizValidationReason, path: string): QuizValidationResult => ({
    ok: false,
    reason,
    path,
  });
  if (!isRecord(input)) return fail("quiz_invalid", "");

  const seen = new Set<string>();
  const readId = (
    value: unknown,
    kind: QuizIdKind,
  ): { id: string } | { reason: "quiz_id_invalid" | "quiz_id_duplicate" } => {
    let id: string;
    if (value === undefined || value === null || value === "") {
      if (!fillIds) return { reason: "quiz_id_invalid" };
      do id = newId(kind);
      while (seen.has(id));
    } else if (typeof value === "string" && QUIZ_ID_PATTERN.test(value)) {
      id = value;
    } else {
      return { reason: "quiz_id_invalid" };
    }
    if (seen.has(id)) return { reason: "quiz_id_duplicate" };
    seen.add(id);
    return { id };
  };

  const quizId = readId(input.id, "quiz");
  if ("reason" in quizId) return fail(quizId.reason, "id");

  let passingGrade: number | null = null;
  if (input.passingGrade !== undefined && input.passingGrade !== null) {
    if (
      typeof input.passingGrade !== "number" ||
      !Number.isFinite(input.passingGrade) ||
      input.passingGrade < 0 ||
      input.passingGrade > 100
    ) {
      return fail("quiz_passing_grade_invalid", "passingGrade");
    }
    passingGrade = input.passingGrade;
  }

  if (!Array.isArray(input.questions) || input.questions.length === 0) {
    return fail("quiz_questions_required", "questions");
  }
  if (input.questions.length > QUIZ_LIMITS.questions) {
    return fail("quiz_too_many_questions", "questions");
  }

  const questions: QuizQuestion[] = [];
  for (const [questionIndex, questionValue] of input.questions.entries()) {
    const questionPath = `questions.${questionIndex}`;
    if (!isRecord(questionValue)) return fail("quiz_question_text_required", questionPath);
    const questionId = readId(questionValue.id, "question");
    if ("reason" in questionId) return fail(questionId.reason, `${questionPath}.id`);
    if (typeof questionValue.text !== "string" || !questionValue.text.trim()) {
      return fail("quiz_question_text_required", `${questionPath}.text`);
    }
    if (!Array.isArray(questionValue.options) || questionValue.options.length < 2) {
      return fail("quiz_options_required", `${questionPath}.options`);
    }
    if (questionValue.options.length > QUIZ_LIMITS.optionsPerQuestion) {
      return fail("quiz_too_many_options", `${questionPath}.options`);
    }
    const quizOptions: QuizOption[] = [];
    for (const [optionIndex, optionValue] of questionValue.options.entries()) {
      const optionPath = `${questionPath}.options.${optionIndex}`;
      if (!isRecord(optionValue)) return fail("quiz_option_text_required", optionPath);
      const optionId = readId(optionValue.id, "option");
      if ("reason" in optionId) return fail(optionId.reason, `${optionPath}.id`);
      if (typeof optionValue.text !== "string" || !optionValue.text.trim()) {
        return fail("quiz_option_text_required", `${optionPath}.text`);
      }
      quizOptions.push({
        id: optionId.id,
        text: optionValue.text,
        correct: optionValue.correct === true,
      });
    }
    if (!quizOptions.some((option) => option.correct)) {
      return fail("quiz_correct_answer_required", `${questionPath}.options`);
    }
    questions.push({ id: questionId.id, text: questionValue.text, options: quizOptions });
  }

  return { ok: true, value: { id: quizId.id, passingGrade, questions } };
}

/** Stored quiz content, which always has its IDs; `null` when unusable. */
export function readStoredQuiz(content: unknown): Quiz | null {
  const result = normalizeQuiz(content, { fillIds: false });
  return result.ok ? result.value : null;
}

/** The learner's view of a quiz: no `correct`, by construction (L1). */
export function stripQuizAnswers(quiz: Quiz): LearnerQuiz {
  return {
    id: quiz.id,
    passingGrade: quiz.passingGrade,
    questions: quiz.questions.map((question) => ({
      id: question.id,
      text: question.text,
      multiple: question.options.filter((option) => option.correct).length > 1,
      options: question.options.map((option) => ({ id: option.id, text: option.text })),
    })),
  };
}

export type QuizScore =
  | { ok: true; value: { score: number; pass: boolean } }
  | { ok: false; reason: "answers_missing_or_invalid" | "quiz_content_invalid" };

/**
 * Scores an attempt: one point for each correct option chosen, as CourseLit
 * always has, with two rules so that choosing every option can't pass a quiz:
 *
 * - a question with one correct option accepts at most one chosen option;
 *   more refuses the attempt (the storefront shows radio buttons there);
 * - in a question with several correct options, each wrong option chosen
 *   cancels one correct one, and the question never goes below zero.
 *
 * Answers naming a question or an option the quiz doesn't have are refused.
 */
export function scoreQuiz(quiz: Quiz, answers: QuizAnswers): QuizScore {
  const questions = new Map(quiz.questions.map((question) => [question.id, question]));
  const chosenByQuestion = new Map<string, Set<string>>();
  for (const [questionId, optionIds] of Object.entries(answers)) {
    const question = questions.get(questionId);
    if (!question || !Array.isArray(optionIds)) {
      return { ok: false, reason: "answers_missing_or_invalid" };
    }
    const known = new Set(question.options.map((option) => option.id));
    if (optionIds.some((optionId) => !known.has(optionId))) {
      return { ok: false, reason: "answers_missing_or_invalid" };
    }
    const chosen = new Set(optionIds);
    const correctCount = question.options.filter((option) => option.correct).length;
    if (correctCount === 1 && chosen.size > 1) {
      return { ok: false, reason: "answers_missing_or_invalid" };
    }
    chosenByQuestion.set(questionId, chosen);
  }

  let possible = 0;
  let earned = 0;
  for (const question of quiz.questions) {
    const chosen = chosenByQuestion.get(question.id) ?? new Set<string>();
    let right = 0;
    let wrong = 0;
    for (const option of question.options) {
      if (option.correct) possible += 1;
      if (!chosen.has(option.id)) continue;
      if (option.correct) right += 1;
      else wrong += 1;
    }
    earned += Math.max(0, right - wrong);
  }
  if (possible === 0) return { ok: false, reason: "quiz_content_invalid" };
  const score = (earned / possible) * 100;
  return {
    ok: true,
    value: { score, pass: quiz.passingGrade === null || score >= quiz.passingGrade },
  };
}

/** True when any object inside `value` has a `correct` key. */
export function containsQuizAnswers(value: unknown, depth = 0): boolean {
  if (depth > 128 || !value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((item) => containsQuizAnswers(item, depth + 1));
  return Object.entries(value).some(
    ([key, child]) => key === "correct" || containsQuizAnswers(child, depth + 1),
  );
}

const quizIdSchema = z.string().regex(QUIZ_ID_PATTERN);

export const learnerQuizSchema = z
  .object({
    id: quizIdSchema,
    passingGrade: z.number().min(0).max(100).nullable(),
    questions: z
      .array(
        z
          .object({
            id: quizIdSchema,
            text: z.string(),
            multiple: z.boolean(),
            options: z
              .array(z.object({ id: quizIdSchema, text: z.string() }).strict())
              .max(QUIZ_LIMITS.optionsPerQuestion),
          })
          .strict(),
      )
      .max(QUIZ_LIMITS.questions),
  })
  .strict();

export const evaluateQuizBodySchema = z.object({
  quizId: quizIdSchema,
  answers: z
    .record(quizIdSchema, z.array(quizIdSchema).max(QUIZ_LIMITS.optionsPerQuestion))
    .refine((answers) => Object.keys(answers).length <= QUIZ_LIMITS.questions, {
      message: "too many answers",
    }),
});

export const quizEvaluationSchema = z.object({
  quizId: z.string(),
  pass: z.boolean(),
  score: z.number(),
  passingGrade: z.number().nullable(),
});
