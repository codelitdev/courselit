"use client";

import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/codelit/button";
import { Checkbox } from "@/components/ui/codelit/checkbox";
import { Input } from "@/components/ui/codelit/input";
import {
  emptyQuizOption,
  emptyQuizQuestion,
  type QuizEditorOption,
  type QuizEditorQuestion,
  type QuizEditorState,
  quizContentFromEditor,
  quizEditorState,
} from "@/lib/lesson-quiz";

type QuizOption = QuizEditorOption;
type QuizQuestion = QuizEditorQuestion;

export function QuizEditor({
  value,
  onChange,
}: {
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
}) {
  const [quiz, setQuiz] = useState(() => quizEditorState(value));

  function update(next: QuizEditorState) {
    setQuiz(next);
    onChange(quizContentFromEditor(next));
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
              options: [...question.options, emptyQuizOption()],
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
              questions: [...quiz.questions, emptyQuizQuestion(quiz.questions.length + 1)],
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
            checked={quiz.graded}
            onCheckedChange={(checked) => update({ ...quiz, graded: checked === true })}
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
            disabled={!quiz.graded}
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
                checked={option.correct}
                onCheckedChange={(checked) =>
                  onOptionChange(optionIndex, {
                    ...option,
                    correct: checked === true,
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
