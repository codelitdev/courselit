import {
  type LearnerQuiz,
  learnerQuizSchema,
  type QuizAnswers,
  quizEvaluationSchema,
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
  // Pass or fail is shown beside it; which answers were right never is (5.5).
  const result = `Score: ${evaluation.score.toFixed(2)}%`;
  return evaluation.passingGrade === null
    ? result
    : `${result} · Passing grade: ${evaluation.passingGrade}%`;
}

export function quizEvaluationError(status: number, reason: string | null): string {
  if (status === 409 && reason === "quiz_changed") {
    return "This quiz has changed since you opened it. Loading the new quiz…";
  }
  if (status === 429) {
    return "You've made many attempts in a short time. Please wait a few minutes and try again.";
  }
  if (status === 403) return "This quiz is not available yet.";
  return "Unable to evaluate the quiz.";
}

export type QuizAttemptResult =
  | { kind: "evaluated"; evaluation: QuizEvaluation }
  | { kind: "quiz_changed" }
  | { kind: "failed"; message: string };

/**
 * Sends one attempt: `{ quizId, answers }` by ID (section 5.3). A 409
 * `quiz_changed` means the author replaced the quiz since the page loaded,
 * so the caller reloads the lesson instead of showing an error.
 */
export async function submitQuizAttempt(
  input: {
    productId: string;
    lessonId: string;
    quizId: string;
    answers: QuizAnswers;
    headers: (extra?: Record<string, string>) => HeadersInit;
  },
  fetcher: typeof fetch = fetch,
): Promise<QuizAttemptResult> {
  try {
    const response = await fetcher(
      `/api/v1/learner/products/${encodeURIComponent(input.productId)}/lessons/${encodeURIComponent(input.lessonId)}/evaluation`,
      {
        method: "POST",
        credentials: "include",
        headers: input.headers({ "content-type": "application/json" }),
        body: JSON.stringify({ quizId: input.quizId, answers: input.answers }),
      },
    );
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        details?: { reason?: string };
      } | null;
      const reason = body?.details?.reason ?? null;
      if (response.status === 409 && reason === "quiz_changed") {
        return { kind: "quiz_changed" };
      }
      return { kind: "failed", message: quizEvaluationError(response.status, reason) };
    }
    const parsed = quizEvaluationSchema.safeParse(await response.json());
    return parsed.success
      ? { kind: "evaluated", evaluation: parsed.data }
      : { kind: "failed", message: "Unable to evaluate the quiz." };
  } catch {
    return { kind: "failed", message: "Unable to evaluate the quiz." };
  }
}
