"use client";

import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/codelit/button";
import { Checkbox } from "@/components/ui/codelit/checkbox";
import { Input } from "@/components/ui/codelit/input";

type QuizOptionValue = { text: string; correctAnswer?: boolean };
type QuizQuestionValue = {
  text: string;
  options: QuizOptionValue[];
  type?: "single" | "multiple";
};
type QuizOption = QuizOptionValue & { id: string };
type QuizQuestion = Omit<QuizQuestionValue, "options"> & {
  options: QuizOption[];
  id: string;
};
export type QuizContent = {
  questions: QuizQuestionValue[];
  requiresPassingGrade: boolean;
  passingGrade: number;
};
type QuizState = Omit<QuizContent, "questions"> & { questions: QuizQuestion[] };

const newId = (prefix: string) =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? `${prefix}-${crypto.randomUUID()}`
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const emptyQuestion = (number: number): QuizQuestion => ({
  id: newId(`question-${number}`),
  text: `Question #${number}`,
  options: [{ id: newId("option"), text: "", correctAnswer: false }],
});

function withoutUiIds(quiz: QuizState): QuizContent {
  return {
    ...quiz,
    questions: quiz.questions.map(({ id: _questionId, ...question }) => ({
      ...question,
      options: question.options.map(({ id: _optionId, ...option }) => option),
    })),
  };
}

function normalizeQuiz(value: Record<string, unknown>): QuizState {
  const questions = Array.isArray(value.questions)
    ? value.questions.flatMap((question, questionIndex) => {
        if (!question || typeof question !== "object") return [];
        const record = question as Record<string, unknown>;
        const questionId =
          typeof record.id === "string" ? record.id : `question-${questionIndex}`;
        const options = Array.isArray(record.options)
          ? record.options.flatMap((option, optionIndex) => {
              if (!option || typeof option !== "object") return [];
              const item = option as Record<string, unknown>;
              return [
                {
                  id:
                    typeof item.id === "string"
                      ? item.id
                      : `${questionId}-option-${optionIndex}`,
                  text: typeof item.text === "string" ? item.text : "",
                  correctAnswer: item.correctAnswer === true,
                },
              ];
            })
          : [];
        return [
          {
            id: questionId,
            text: typeof record.text === "string" ? record.text : "",
            options:
              options.length > 0
                ? options
                : [{ id: `${questionId}-option-0`, text: "" }],
            ...(record.type === "multiple" ? { type: "multiple" as const } : {}),
          },
        ];
      })
    : [];
  return {
    questions: questions.length > 0 ? questions : [emptyQuestion(1)],
    requiresPassingGrade: value.requiresPassingGrade === true,
    passingGrade:
      typeof value.passingGrade === "number" && Number.isFinite(value.passingGrade)
        ? Math.min(100, Math.max(0, value.passingGrade))
        : 70,
  };
}

export function QuizEditor({
  value,
  onChange,
}: {
  value: Record<string, unknown>;
  onChange: (value: QuizContent) => void;
}) {
  const [quiz, setQuiz] = useState(() => normalizeQuiz(value));

  function update(next: QuizState) {
    setQuiz(next);
    onChange(withoutUiIds(next));
  }

  function updateQuestion(index: number, next: QuizQuestion) {
    update({
      ...quiz,
      questions: quiz.questions.map((question, questionIndex) =>
        questionIndex === index ? next : question,
      ),
    });
  }

  function updateOption(questionIndex: number, optionIndex: number, next: QuizOption) {
    const question = quiz.questions[questionIndex];
    if (!question) return;
    updateQuestion(questionIndex, {
      ...question,
      options: question.options.map((option, currentIndex) =>
        currentIndex === optionIndex ? next : option,
      ),
    });
  }

  return (
    <div className="space-y-5 rounded-xl border bg-card p-5">
      {quiz.questions.map((question, questionIndex) => (
        <QuestionEditor
          key={question.id}
          question={question}
          index={questionIndex}
          // The production builder keeps the first question and lets users
          // remove only subsequent questions.
          canDelete={questionIndex > 0}
          onChange={(next) => updateQuestion(questionIndex, next)}
          onDelete={() =>
            update({
              ...quiz,
              questions: quiz.questions.filter((_, index) => index !== questionIndex),
            })
          }
          onOptionChange={(optionIndex, next) =>
            updateOption(questionIndex, optionIndex, next)
          }
          onAddOption={() =>
            updateQuestion(questionIndex, {
              ...question,
              options: [
                ...question.options,
                { id: newId("option"), text: "", correctAnswer: false },
              ],
            })
          }
          onRemoveOption={(optionIndex) =>
            updateQuestion(questionIndex, {
              ...question,
              options: question.options.filter((_, index) => index !== optionIndex),
            })
          }
        />
      ))}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            update({
              ...quiz,
              questions: [...quiz.questions, emptyQuestion(quiz.questions.length + 1)],
            })
          }
        >
          <Plus className="size-4" /> Add Question
        </Button>
      </div>
      <div className="border-t pt-5">
        <div className="flex items-center gap-3 text-sm font-medium">
          <Checkbox
            id="quiz-requires-passing-grade"
            checked={quiz.requiresPassingGrade}
            onCheckedChange={(checked) =>
              update({ ...quiz, requiresPassingGrade: checked === true })
            }
          />
          <label htmlFor="quiz-requires-passing-grade">Graded Quiz</label>
        </div>
        <div className="field mt-4 block max-w-xs">
          <span>Passing grade (%)</span>
          <Input
            id="quiz-passing-grade"
            type="number"
            min={0}
            max={100}
            value={quiz.passingGrade}
            disabled={!quiz.requiresPassingGrade}
            onChange={(event) =>
              update({
                ...quiz,
                passingGrade: Math.min(100, Math.max(0, Number(event.target.value))),
              })
            }
          />
        </div>
      </div>
    </div>
  );
}

function QuestionEditor({
  question,
  index,
  canDelete,
  onChange,
  onDelete,
  onOptionChange,
  onAddOption,
  onRemoveOption,
}: {
  question: QuizQuestion;
  index: number;
  canDelete: boolean;
  onChange: (question: QuizQuestion) => void;
  onDelete: () => void;
  onOptionChange: (index: number, option: QuizOption) => void;
  onAddOption: () => void;
  onRemoveOption: (index: number) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <section className="rounded-lg border p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Question #{index + 1}</h2>
        <div className="flex gap-1">
          {canDelete ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onDelete}
              aria-label="Delete question"
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed((current) => !current)}
            aria-label={collapsed ? "Expand question" : "Collapse question"}
          >
            {collapsed ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronUp className="size-4" />
            )}
          </Button>
        </div>
      </div>
      {!collapsed ? (
        <div className="mt-4 space-y-3">
          <Input
            value={question.text}
            onChange={(event) => onChange({ ...question, text: event.target.value })}
            placeholder="Enter question"
          />
          {question.options.map((option, optionIndex) => (
            <div className="flex items-center gap-2" key={option.id}>
              <Checkbox
                checked={option.correctAnswer === true}
                onCheckedChange={(checked) =>
                  onOptionChange(optionIndex, {
                    ...option,
                    correctAnswer: checked === true,
                  })
                }
                aria-label={`Mark option ${optionIndex + 1} correct`}
              />
              <Input
                value={option.text}
                onChange={(event) =>
                  onOptionChange(optionIndex, { ...option, text: event.target.value })
                }
                placeholder={`Option ${optionIndex + 1}`}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onRemoveOption(optionIndex)}
                aria-label="Delete option"
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={onAddOption}>
            <Plus className="size-4" /> Add option
          </Button>
        </div>
      ) : null}
    </section>
  );
}
