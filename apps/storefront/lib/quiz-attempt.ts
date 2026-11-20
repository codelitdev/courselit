import {
  type LearnerQuiz,
  learnerQuizSchema,
  type QuizAnswers,
} from "@courselit/api-contract/quiz";

export type QuizEvaluation = {
  quizId: string;
  pass: boolean;
  score: number;
  passingGrade: number | null;
};

/** Learner lesson content as a quiz, or `null` when it isn't one. */
export function readLearnerQuiz(content: unknown): LearnerQuiz | null {
  const parsed = learnerQuizSchema.safeParse(content);
  return parsed.success && parsed.data.questions.length > 0 ? parsed.data : null;
}

/** Answers after the learner picks (or unpicks) an option. */
export function toggleQuizAnswer(
  answers: QuizAnswers,
  questionId: string,
  optionId: string,
  multiple: boolean,
): QuizAnswers {
  const selected = answers[questionId] ?? [];
  if (!multiple) return { ...answers, [questionId]: [optionId] };
  return {
    ...answers,
    [questionId]: selected.includes(optionId)
      ? selected.filter((value) => value !== optionId)
      : [...selected, optionId],
  };
}

export function quizEvaluationSummary(evaluation: QuizEvaluation): string {
  const result = `${evaluation.pass ? "Passed" : "Not passed"} · Score: ${evaluation.score.toFixed(2)}%`;
  return evaluation.passingGrade === null
    ? result
    : `${result} · Passing grade: ${evaluation.passingGrade}%`;
}

export function quizEvaluationError(status: number, reason: string | null): string {
  if (status === 409 && reason === "quiz_changed") {
    return "This quiz has changed since you opened it. Reload the page to take the new quiz.";
  }
  if (status === 429) {
    return "You've made many attempts in a short time. Please wait a few minutes and try again.";
  }
  if (status === 403) return "This quiz is not available yet.";
  return "Unable to evaluate the quiz.";
}
