"use client";

import type { LearnerQuiz, QuizAnswers } from "@courselit/api-contract/quiz";
import { useId, useState } from "react";
import {
  LearnerBadge,
  LearnerButton,
  LearnerCard,
  LearnerCardContent,
  LearnerCheckbox,
  LearnerHeader4,
  LearnerLabel,
  LearnerRadioGroup,
  LearnerRadioGroupItem,
  LearnerText1,
  LearnerText2,
} from "@/components/themed-page-builder";
import {
  type QuizEvaluation,
  quizEvaluationError,
  quizEvaluationSummary,
  submitQuizAttempt,
  toggleQuizAnswer,
} from "@/lib/quiz-attempt";
import { learnerHeaders } from "@/lib/school";

/**
 * The learner's quiz, drawn where the author placed the Quiz block. It holds
 * the questions without answers (L1), sends `{ quizId, answers }` and shows
 * only the score and pass or fail (section 5.5), with unlimited retries.
 * `gradable` is false in previews: grading needs an enrolled learner.
 */
export function LessonQuiz({
  quiz,
  productId,
  lessonId,
  gradable,
  onQuizChanged,
  onPassed,
}: {
  quiz: LearnerQuiz;
  productId: string;
  lessonId: string;
  gradable: boolean;
  onQuizChanged: () => void;
  onPassed?: () => void;
}) {
  const baseId = useId();
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [evaluation, setEvaluation] = useState<QuizEvaluation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function select(questionId: string, optionId: string, multiple: boolean) {
    setEvaluation(null);
    setAnswers((current) => toggleQuizAnswer(current, questionId, optionId, multiple));
  }

  async function submit() {
    setError(null);
    setSubmitting(true);
    const result = await submitQuizAttempt({
      productId,
      lessonId,
      quizId: quiz.id,
      answers,
      headers: learnerHeaders,
    });
    setSubmitting(false);
    if (result.kind === "quiz_changed") {
      setError(quizEvaluationError(409, "quiz_changed"));
      onQuizChanged();
      return;
    }
    if (result.kind === "failed") {
      setError(result.message);
      return;
    }
    setEvaluation(result.evaluation);
    if (result.evaluation.pass) onPassed?.();
  }

  return (
    <LearnerCard data-lesson-quiz={quiz.id}>
      <LearnerCardContent className="grid gap-6">
        <div className="grid gap-1">
          <LearnerHeader4>Quiz</LearnerHeader4>
          {quiz.passingGrade !== null ? (
            <LearnerText2 className="text-muted-foreground">
              Score {quiz.passingGrade}% or more to pass.
            </LearnerText2>
          ) : null}
        </div>
        {quiz.questions.map((question, index) => {
          const labelId = `${baseId}-${question.id}`;
          const selected = answers[question.id] ?? [];
          return (
            <div className="grid gap-3" key={question.id}>
              <LearnerText1 id={labelId}>
                {index + 1}. {question.text}
              </LearnerText1>
              {question.multiple ? (
                // biome-ignore lint/a11y/useSemanticElements: mirrors the radio group's ARIA grouping; a fieldset brings its own browser chrome.
                <div role="group" aria-labelledby={labelId} className="grid gap-2">
                  <LearnerText2 className="text-muted-foreground">
                    Choose all that apply.
                  </LearnerText2>
                  {question.options.map((option) => {
                    const inputId = `${labelId}-${option.id}`;
                    return (
                      <div className="flex items-center gap-2" key={option.id}>
                        <LearnerCheckbox
                          id={inputId}
                          checked={selected.includes(option.id)}
                          disabled={!gradable}
                          onCheckedChange={() => select(question.id, option.id, true)}
                        />
                        <LearnerLabel htmlFor={inputId}>{option.text}</LearnerLabel>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <LearnerRadioGroup
                  aria-labelledby={labelId}
                  className="grid gap-2"
                  disabled={!gradable}
                  value={selected[0] ?? ""}
                  onValueChange={(optionId) => select(question.id, optionId, false)}
                >
                  {question.options.map((option) => {
                    const inputId = `${labelId}-${option.id}`;
                    return (
                      <div className="flex items-center gap-2" key={option.id}>
                        <LearnerRadioGroupItem id={inputId} value={option.id} />
                        <LearnerLabel htmlFor={inputId}>{option.text}</LearnerLabel>
                      </div>
                    );
                  })}
                </LearnerRadioGroup>
              )}
            </div>
          );
        })}
        {error ? (
          <LearnerText2 role="alert" className="text-destructive">
            {error}
          </LearnerText2>
        ) : null}
        {evaluation ? (
          <div role="status" className="flex flex-wrap items-center gap-2">
            <LearnerBadge variant={evaluation.pass ? "default" : "destructive"}>
              {evaluation.pass ? "Passed" : "Not passed"}
            </LearnerBadge>
            <LearnerText2>{quizEvaluationSummary(evaluation)}</LearnerText2>
          </div>
        ) : null}
        {gradable ? (
          <LearnerButton
            className="w-fit"
            disabled={submitting}
            type="button"
            onClick={() => void submit()}
          >
            {submitting ? "Checking…" : "Submit answers"}
          </LearnerButton>
        ) : (
          <LearnerText2 className="text-muted-foreground">
            Enrolled learners answer this quiz to complete the lesson.
          </LearnerText2>
        )}
      </LearnerCardContent>
    </LearnerCard>
  );
}
