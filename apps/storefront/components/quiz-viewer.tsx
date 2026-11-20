"use client";

import { useState } from "react";
import {
  LearnerButton as Button,
  LearnerCard,
  LearnerCardContent,
  LearnerInput,
  LearnerLabel,
  LearnerText2,
} from "@/components/themed-page-builder";
import type { QuizAnswers } from "@courselit/api-contract/quiz";
import {
  type QuizEvaluation,
  quizEvaluationError,
  quizEvaluationSummary,
  readLearnerQuiz,
  toggleQuizAnswer,
} from "@/lib/quiz-attempt";
import { learnerHeaders } from "@/lib/school";

export function QuizViewer({
  productId,
  lessonId,
  content,
}: {
  productId: string;
  lessonId: string;
  content: Record<string, unknown>;
}) {
  const quiz = readLearnerQuiz(content);
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [evaluation, setEvaluation] = useState<QuizEvaluation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!quiz)
    return (
      <LearnerText2 className="text-muted-foreground">
        This quiz is unavailable.
      </LearnerText2>
    );

  function selectOption(questionId: string, optionId: string, multiple: boolean) {
    setEvaluation(null);
    setAnswers((current) => toggleQuizAnswer(current, questionId, optionId, multiple));
  }

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch(
        `/api/v1/learner/products/${encodeURIComponent(productId)}/lessons/${encodeURIComponent(lessonId)}/evaluation`,
        {
          method: "POST",
          credentials: "include",
          headers: learnerHeaders({ "content-type": "application/json" }),
          body: JSON.stringify({ quizId: quiz?.id, answers }),
        },
      );
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          details?: { reason?: string };
        } | null;
        setError(quizEvaluationError(response.status, body?.details?.reason ?? null));
        return;
      }
      setEvaluation((await response.json()) as QuizEvaluation);
    } catch {
      setError("Unable to evaluate the quiz.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <LearnerCard>
      <LearnerCardContent className="grid gap-5">
        {quiz.questions.map((question, questionIndex) => (
          <fieldset className="grid gap-3" key={question.id}>
            <legend className="font-medium">
              {questionIndex + 1}. {question.text}
            </legend>
            {question.options.map((option) => {
              const inputId = `quiz-${lessonId}-${question.id}-${option.id}`;
              const checked = answers[question.id]?.includes(option.id) ?? false;
              return (
                <LearnerLabel
                  className="flex items-center gap-2"
                  htmlFor={inputId}
                  key={inputId}
                >
                  <LearnerInput
                    checked={checked}
                    id={inputId}
                    name={`quiz-${lessonId}-${question.id}`}
                    onChange={() => selectOption(question.id, option.id, question.multiple)}
                    type={question.multiple ? "checkbox" : "radio"}
                  />
                  <LearnerText2 component="span">{option.text}</LearnerText2>
                </LearnerLabel>
              );
            })}
          </fieldset>
        ))}
        {error ? (
          <LearnerText2 role="alert" className="text-destructive">
            {error}
          </LearnerText2>
        ) : null}
        {evaluation ? (
          <LearnerText2 role="status">{quizEvaluationSummary(evaluation)}</LearnerText2>
        ) : null}
        <Button disabled={submitting} type="button" onClick={() => void submit()}>
          {submitting ? "Evaluating…" : "Submit quiz"}
        </Button>
      </LearnerCardContent>
    </LearnerCard>
  );
}
