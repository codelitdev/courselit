import {
  createQuizId,
  normalizeQuiz,
  QUIZ_LIMITS,
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

/**
 * Every change the quiz editor makes (questions, options, correct answers,
 * the optional pass mark), as in main's quiz builder: the first question
 * stays, and a new question starts with one empty option. Limits follow
 * the API (100 questions, 20 options per question).
 */
export type QuizEditorAction =
  | { type: "addQuestion" }
  | { type: "removeQuestion"; question: number }
  | { type: "setQuestionText"; question: number; text: string }
  | { type: "addOption"; question: number }
  | { type: "removeOption"; question: number; option: number }
  | { type: "setOptionText"; question: number; option: number; text: string }
  | { type: "setOptionCorrect"; question: number; option: number; correct: boolean }
  | { type: "setGraded"; graded: boolean }
  | { type: "setPassingGrade"; value: number };

function mapQuestion(
  state: QuizEditorState,
  index: number,
  map: (question: QuizEditorQuestion) => QuizEditorQuestion,
): QuizEditorState {
  if (!state.questions[index]) return state;
  return {
    ...state,
    questions: state.questions.map((question, current) =>
      current === index ? map(question) : question,
    ),
  };
}

function mapOption(
  state: QuizEditorState,
  questionIndex: number,
  optionIndex: number,
  map: (option: QuizEditorOption) => QuizEditorOption,
): QuizEditorState {
  return mapQuestion(state, questionIndex, (question) =>
    question.options[optionIndex]
      ? {
          ...question,
          options: question.options.map((option, current) =>
            current === optionIndex ? map(option) : option,
          ),
        }
      : question,
  );
}

export function clampPassingGrade(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function quizEditorReducer(
  state: QuizEditorState,
  action: QuizEditorAction,
): QuizEditorState {
  switch (action.type) {
    case "addQuestion":
      if (state.questions.length >= QUIZ_LIMITS.questions) return state;
      return {
        ...state,
        questions: [...state.questions, emptyQuizQuestion(state.questions.length + 1)],
      };
    case "removeQuestion":
      if (action.question <= 0 || !state.questions[action.question]) return state;
      return {
        ...state,
        questions: state.questions.filter((_, index) => index !== action.question),
      };
    case "setQuestionText":
      return mapQuestion(state, action.question, (question) => ({
        ...question,
        text: action.text,
      }));
    case "addOption":
      return mapQuestion(state, action.question, (question) =>
        question.options.length >= QUIZ_LIMITS.optionsPerQuestion
          ? question
          : { ...question, options: [...question.options, emptyQuizOption()] },
      );
    case "removeOption": {
      const options = state.questions[action.question]?.options;
      if (!options || options.length <= 1 || !options[action.option]) return state;
      return mapQuestion(state, action.question, (question) => ({
        ...question,
        options: question.options.filter((_, index) => index !== action.option),
      }));
    }
    case "setOptionText":
      return mapOption(state, action.question, action.option, (option) => ({
        ...option,
        text: action.text,
      }));
    case "setOptionCorrect":
      return mapOption(state, action.question, action.option, (option) => ({
        ...option,
        correct: action.correct,
      }));
    case "setGraded":
      return { ...state, graded: action.graded };
    case "setPassingGrade":
      return { ...state, passingGrade: clampPassingGrade(action.value) };
  }
}

/** Block attributes in the shape `quizContentFromEditor` writes, without filling anything in. */
function quizAttrsShape(attrs: Record<string, unknown> | null) {
  const value = attrs ?? {};
  const list = (items: unknown) => (Array.isArray(items) ? items.filter(isRecord) : []);
  return {
    id: value.id ?? null,
    passingGrade: value.passingGrade ?? null,
    questions: list(value.questions).map((question) => ({
      id: question.id ?? null,
      text: question.text ?? "",
      options: list(question.options).map((option) => ({
        id: option.id ?? null,
        text: option.text ?? "",
        correct: option.correct === true,
      })),
    })),
  };
}

/**
 * Whether the block's attributes already hold what the editor would write.
 * False when they changed elsewhere (undo, another tab's reload) or still
 * lack IDs, which the editor then writes back so saves keep stable IDs.
 */
export function sameQuizContent(
  state: QuizEditorState,
  attrs: Record<string, unknown> | null,
): boolean {
  return (
    JSON.stringify(quizContentFromEditor(state)) ===
    JSON.stringify(quizAttrsShape(attrs))
  );
}
