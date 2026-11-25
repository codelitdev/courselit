"use client";

import { QUIZ_LIMITS } from "@courselit/api-contract/quiz";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/codelit/button";
import { Checkbox } from "@/components/ui/codelit/checkbox";
import { Input } from "@/components/ui/codelit/input";
import type {
  QuizEditorAction,
  QuizEditorQuestion,
  QuizEditorState,
} from "@/lib/lesson-quiz";

/**
 * The quiz form, as main's quiz builder: questions with options, a checkbox
 * per option to mark it correct (several make a multiple-answer question)
 * and an optional pass mark. State lives with the caller (the Quiz block).
 */
export function QuizEditor({
  quiz,
  dispatch,
  disabled = false,
}: {
  quiz: QuizEditorState;
  dispatch: (action: QuizEditorAction) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="space-y-4">
      {quiz.questions.map((question, questionIndex) => (
        <QuestionEditor
          key={question.id}
          question={question}
          index={questionIndex}
          disabled={disabled}
          // Main's builder keeps the first question; later ones can go.
          canDelete={questionIndex > 0}
          dispatch={dispatch}
        />
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || quiz.questions.length >= QUIZ_LIMITS.questions}
        onClick={() => dispatch({ type: "addQuestion" })}
      >
        <Plus className="size-4" /> Add question
      </Button>
      <div className="flex flex-wrap items-end gap-4 border-t pt-4">
        <div className="flex items-center gap-3 text-sm font-medium">
          <Checkbox
            id={`${id}-graded`}
            checked={quiz.graded}
            disabled={disabled}
            onCheckedChange={(checked) =>
              dispatch({ type: "setGraded", graded: checked === true })
            }
          />
          <label htmlFor={`${id}-graded`}>Graded quiz</label>
        </div>
        <div className="field max-w-[10rem]">
          <label htmlFor={`${id}-passing-grade`}>Passing grade (%)</label>
          <Input
            id={`${id}-passing-grade`}
            type="number"
            min={0}
            max={100}
            value={quiz.passingGrade}
            disabled={disabled || !quiz.graded}
            onChange={(event) =>
              dispatch({ type: "setPassingGrade", value: Number(event.target.value) })
            }
          />
        </div>
        <p className="basis-full text-xs text-muted-foreground">
          {quiz.graded
            ? `Learners need ${quiz.passingGrade}% to pass before they can mark the lesson complete.`
            : "Without a pass mark, every attempt passes."}
        </p>
      </div>
    </div>
  );
}

function QuestionEditor({
  question,
  index,
  canDelete,
  disabled,
  dispatch,
}: {
  question: QuizEditorQuestion;
  index: number;
  canDelete: boolean;
  disabled: boolean;
  dispatch: (action: QuizEditorAction) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const multiple = question.options.filter((option) => option.correct).length > 1;
  return (
    <section className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="m-0 text-sm font-semibold">
          Question #{index + 1}
          {multiple ? (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              Multiple answers
            </span>
          ) : null}
        </p>
        <div className="flex gap-1">
          {canDelete ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => dispatch({ type: "removeQuestion", question: index })}
              aria-label={`Delete question ${index + 1}`}
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
            aria-expanded={!collapsed}
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
            disabled={disabled}
            aria-label={`Question ${index + 1}`}
            onChange={(event) =>
              dispatch({
                type: "setQuestionText",
                question: index,
                text: event.target.value,
              })
            }
            placeholder="Enter question"
          />
          {question.options.map((option, optionIndex) => (
            <div className="flex items-center gap-2" key={option.id}>
              <Checkbox
                checked={option.correct}
                disabled={disabled}
                onCheckedChange={(checked) =>
                  dispatch({
                    type: "setOptionCorrect",
                    question: index,
                    option: optionIndex,
                    correct: checked === true,
                  })
                }
                aria-label={`Mark option ${optionIndex + 1} of question ${index + 1} correct`}
              />
              <Input
                value={option.text}
                disabled={disabled}
                aria-label={`Option ${optionIndex + 1} of question ${index + 1}`}
                onChange={(event) =>
                  dispatch({
                    type: "setOptionText",
                    question: index,
                    option: optionIndex,
                    text: event.target.value,
                  })
                }
                placeholder={`Option ${optionIndex + 1}`}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled || question.options.length <= 1}
                onClick={() =>
                  dispatch({
                    type: "removeOption",
                    question: index,
                    option: optionIndex,
                  })
                }
                aria-label={`Delete option ${optionIndex + 1} of question ${index + 1}`}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={
              disabled || question.options.length >= QUIZ_LIMITS.optionsPerQuestion
            }
            onClick={() => dispatch({ type: "addOption", question: index })}
          >
            <Plus className="size-4" /> Add option
          </Button>
          <p className="text-xs text-muted-foreground">
            Tick every correct option. Learners never see which ones are correct.
          </p>
        </div>
      ) : null}
    </section>
  );
}
