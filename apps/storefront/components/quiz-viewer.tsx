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
import { learnerHeaders } from "@/lib/school";

type QuizOption = { text: string };
type QuizQuestion = {
  text: string;
  type?: "single" | "multiple";
  options: QuizOption[];
};

type QuizContent = {
  questions: QuizQuestion[];
};

type Evaluation = {
  pass: boolean;
  score: number;
  requiresPassingGrade: boolean;
  passingGrade: number;
};

function readQuizContent(value: Record<string, unknown>): QuizContent | null {
  if (!Array.isArray(value.questions)) return null;
  const questions = value.questions.flatMap((question) => {
    if (!question || typeof question !== "object" || Array.isArray(question)) {
      return [];
    }
    const record = question as Record<string, unknown>;
    if (typeof record.text !== "string" || !Array.isArray(record.options)) return [];
    const options = record.options.flatMap((option) => {
      if (!option || typeof option !== "object" || Array.isArray(option)) return [];
      const optionRecord = option as Record<string, unknown>;
      return typeof optionRecord.text === "string" ? [{ text: optionRecord.text }] : [];
    });
    if (options.length === 0) return [];
    return [
      {
        text: record.text,
        type: record.type === "multiple" ? ("multiple" as const) : ("single" as const),
        options,
      },
    ];
  });
  return questions.length > 0 ? { questions } : null;
}

export function QuizViewer({
  productId,
  lessonId,
  content,
}: {
  productId: string;
  lessonId: string;
  content: Record<string, unknown>;
}) {
  const quiz = readQuizContent(content);
  const [answers, setAnswers] = useState<number[][]>(
    () => quiz?.questions.map(() => []) ?? [],
  );
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!quiz)
    return (
      <LearnerText2 className="text-muted-foreground">
        This quiz is unavailable.
      </LearnerText2>
    );

  function selectOption(questionIndex: number, optionIndex: number, multiple: boolean) {
    setEvaluation(null);
    setAnswers((current) =>
      current.map((selected, index) => {
        if (index !== questionIndex) return selected;
        if (!multiple) return [optionIndex];
        return selected.includes(optionIndex)
          ? selected.filter((value) => value !== optionIndex)
          : [...selected, optionIndex];
      }),
    );
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
          body: JSON.stringify({ answers }),
        },
      );
      if (!response.ok) {
        setError(
          response.status === 403
            ? "This quiz is not available yet."
            : "Unable to evaluate the quiz.",
        );
        return;
      }
      setEvaluation((await response.json()) as Evaluation);
    } catch {
      setError("Unable to evaluate the quiz.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <LearnerCard>
      <LearnerCardContent className="grid gap-5">
        {quiz.questions.map((question, questionIndex) => {
          const multiple = question.type === "multiple";
          return (
            <fieldset className="grid gap-3" key={`${questionIndex}-${question.text}`}>
              <legend className="font-medium">
                {questionIndex + 1}. {question.text}
              </legend>
              {question.options.map((option, optionIndex) => {
                const inputId = `quiz-${lessonId}-${questionIndex}-${optionIndex}`;
                const checked = answers[questionIndex]?.includes(optionIndex) ?? false;
                return (
                  <LearnerLabel
                    className="flex items-center gap-2"
                    htmlFor={inputId}
                    key={inputId}
                  >
                    <LearnerInput
                      checked={checked}
                      id={inputId}
                      name={`quiz-${lessonId}-${questionIndex}`}
                      onChange={() =>
                        selectOption(questionIndex, optionIndex, multiple)
                      }
                      type={multiple ? "checkbox" : "radio"}
                    />
                    <LearnerText2 component="span">{option.text}</LearnerText2>
                  </LearnerLabel>
                );
              })}
            </fieldset>
          );
        })}
        {error ? (
          <LearnerText2 role="alert" className="text-destructive">
            {error}
          </LearnerText2>
        ) : null}
        {evaluation ? (
          <LearnerText2 role="status">
            {evaluation.pass ? "Passed" : "Not passed"} · Score:{" "}
            {evaluation.score.toFixed(2)}%
            {evaluation.requiresPassingGrade
              ? ` · Passing grade: ${evaluation.passingGrade}%`
              : ""}
          </LearnerText2>
        ) : null}
        <Button disabled={submitting} type="button" onClick={() => void submit()}>
          {submitting ? "Evaluating…" : "Submit quiz"}
        </Button>
      </LearnerCardContent>
    </LearnerCard>
  );
}
