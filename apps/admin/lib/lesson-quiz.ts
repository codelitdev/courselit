import {
  createQuizId,
  normalizeQuiz,
  type QuizValidationReason,
} from "@courselit/api-contract/quiz";

export type QuizEditorOption = { id: string; text: string; correct: boolean };
export type QuizEditorQuestion = {
  id: string;
  text: string;
  options: QuizEditorOption[];
};
/**
 * What the quiz editor works on. The pass mark is kept while grading is off
 * so turning it back on restores it; only `quizContentFromEditor` decides
 * what is saved.
 */
export type QuizEditorState = {
  id: string;
  graded: boolean;
  passingGrade: number;
  questions: QuizEditorQuestion[];
};

export const DEFAULT_PASSING_GRADE = 70;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function keepId(value: unknown, kind: "quiz" | "question" | "option"): string {
  return typeof value === "string" && value ? value : createQuizId(kind);
}

export function emptyQuizQuestion(number: number): QuizEditorQuestion {
  return {
    id: createQuizId("question"),
    text: `Question #${number}`,
    options: [{ id: createQuizId("option"), text: "", correct: false }],
  };
}

export function emptyQuizOption(): QuizEditorOption {
  return { id: createQuizId("option"), text: "", correct: false };
}

/** Saved quiz content (or none) as editor state; IDs are kept as they are. */
export function quizEditorState(
  value: Record<string, unknown> | null,
): QuizEditorState {
  const content = value ?? {};
  const questions = Array.isArray(content.questions)
    ? content.questions.flatMap((question): QuizEditorQuestion[] => {
        if (!isRecord(question)) return [];
        const options = Array.isArray(question.options)
          ? question.options.flatMap((option): QuizEditorOption[] =>
              isRecord(option)
                ? [
                    {
                      id: keepId(option.id, "option"),
                      text: typeof option.text === "string" ? option.text : "",
                      correct: option.correct === true,
                    },
                  ]
                : [],
            )
          : [];
        return [
          {
            id: keepId(question.id, "question"),
            text: typeof question.text === "string" ? question.text : "",
            options: options.length > 0 ? options : [emptyQuizOption()],
          },
        ];
      })
    : [];
  const passingGrade =
    typeof content.passingGrade === "number" && Number.isFinite(content.passingGrade)
      ? Math.min(100, Math.max(0, content.passingGrade))
      : null;
  return {
    id: keepId(content.id, "quiz"),
    graded: passingGrade !== null,
    passingGrade: passingGrade ?? DEFAULT_PASSING_GRADE,
    questions: questions.length > 0 ? questions : [emptyQuizQuestion(1)],
  };
}

/** The content the API stores: no pass mark unless the quiz is graded. */
export function quizContentFromEditor(state: QuizEditorState): Record<string, unknown> {
  return {
    id: state.id,
    passingGrade: state.graded ? state.passingGrade : null,
    questions: state.questions.map((question) => ({
      id: question.id,
      text: question.text,
      options: question.options.map((option) => ({
        id: option.id,
        text: option.text,
        correct: option.correct,
      })),
    })),
  };
}

export function emptyQuizContent(): Record<string, unknown> {
  return quizContentFromEditor(quizEditorState(null));
}

const QUIZ_MESSAGES: Record<QuizValidationReason, string> = {
  quiz_invalid: "Please add at least one question to the quiz.",
  quiz_id_invalid: "This quiz has an invalid ID. Reload the lesson and try again.",
  quiz_id_duplicate: "This quiz has a repeated ID. Reload the lesson and try again.",
  quiz_passing_grade_invalid: "The passing grade must be between 0 and 100.",
  quiz_questions_required: "Please add at least one question to the quiz.",
  quiz_too_many_questions: "A quiz can have at most 100 questions.",
  quiz_question_text_required: "All questions must have text.",
  quiz_options_required: "Each question must have at least two options.",
  quiz_too_many_options: "A question can have at most 20 options.",
  quiz_option_text_required: "All options must have text.",
  quiz_correct_answer_required: "Each question must have at least one correct answer.",
};

/** The editor's message for content the API would refuse, if any. */
export function quizContentError(content: Record<string, unknown>): string | undefined {
  const result = normalizeQuiz(content, { fillIds: false });
  return result.ok ? undefined : QUIZ_MESSAGES[result.reason];
}

export const LESSON_CONFLICT_MESSAGE =
  "Someone else changed this lesson's content since you opened it. Reload the page to see their version, then make your changes again. Your edits here were not saved.";

type LessonSaveErrorBody = {
  code?: string;
  message?: string;
  details?: {
    reason?: string;
    message?: string;
    line?: number | null;
    blockReason?: string;
  };
} | null;

/** The message to show for a failed lesson save. */
export function lessonSaveErrorMessage(
  status: number,
  body: LessonSaveErrorBody,
): string {
  const details = body?.details;
  if (status === 409 && details?.reason === "content_version_mismatch") {
    return LESSON_CONFLICT_MESSAGE;
  }
  // The page didn't validate: say what and where (first problem only).
  if (details?.reason === "lesson_content_invalid" && details.message) {
    return typeof details.line === "number"
      ? `Line ${details.line}: ${details.message}`
      : details.message;
  }
  if (details?.reason === "plan_required" && details.blockReason === "trial") {
    return "Embeds can't be added during the trial. Choose a plan to add them.";
  }
  return body?.message ?? "Unable to save the lesson.";
}
