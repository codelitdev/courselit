import React, { startTransition, useEffect, useState } from "react";
import { Section } from "@courselit/components-library";
import {
    LESSON_QUIZ_ADD_QUESTION,
    LESSON_QUIZ_QUESTION_PLACEHOLDER,
} from "@/ui-config/strings";
import { QuestionBuilder } from "./question-builder";
import { Question, Quiz } from "@courselit/common-models";
import { DEFAULT_PASSING_GRADE } from "@/ui-config/constants";
import { FormEvent } from "react";
import { Button } from "@components/ui/button";
import { Label } from "@components/ui/label";
import { Switch } from "@components/ui/switch";
import { Input } from "@components/ui/input";

interface QuizBuilderProps {
    content: Partial<Quiz>;
    onChange: (...args: any[]) => void;
}

export function QuizBuilder({ content, onChange }: QuizBuilderProps) {
    const [questions, setQuestions] = useState<Question[]>(
        (content && content.questions) || [
            {
                text: `${LESSON_QUIZ_QUESTION_PLACEHOLDER} #1`,
                options: [{ text: "", correctAnswer: false }],
            },
        ],
    );
    const [passingGradeRequired, setPassingGradeRequired] = useState(
        (content && content.requiresPassingGrade) || false,
    );
    const [passingGradePercentage, setPassingGradePercentage] = useState(
        (content && content.passingGrade) || DEFAULT_PASSING_GRADE,
    );

    useEffect(() => {
        startTransition(() => {
            if (content.questions) {
                setQuestions(content.questions);
            }
            if (content.passingGrade) {
                setPassingGradePercentage(content.passingGrade);
            }
            if (content.requiresPassingGrade) {
                setPassingGradeRequired(content.requiresPassingGrade);
            }
        });
    }, [content]);

    useEffect(() => {
        onChange({
            questions,
            requiresPassingGrade: passingGradeRequired,
            passingGrade: passingGradePercentage,
        });
    }, [questions, passingGradeRequired, passingGradePercentage, onChange]);

    const addNewOption = (questionIndex: number) => {
        setQuestions((prevQuestions) =>
            prevQuestions.map((question, index) =>
                index === questionIndex
                    ? {
                          ...question,
                          options: [
                              ...question.options,
                              { text: "", correctAnswer: false },
                          ],
                      }
                    : question,
            ),
        );
    };

    const setCorrectAnswer =
        (questionIndex: number) => (index: number, checked: boolean) => {
            setQuestions((prevQuestions) =>
                prevQuestions.map((question, qIdx) =>
                    qIdx === questionIndex
                        ? {
                              ...question,
                              options: question.options.map((option, optIdx) =>
                                  optIdx === index
                                      ? { ...option, correctAnswer: checked }
                                      : option,
                              ),
                          }
                        : question,
                ),
            );
        };

    const setOptionText =
        (questionIndex: number) => (index: number, text: string) => {
            setQuestions((prevQuestions) =>
                prevQuestions.map((question, qIdx) =>
                    qIdx === questionIndex
                        ? {
                              ...question,
                              options: question.options.map((option, optIdx) =>
                                  optIdx === index
                                      ? { ...option, text }
                                      : option,
                              ),
                          }
                        : question,
                ),
            );
        };

    const setQuestionText = (index: number) => (text: string) => {
        setQuestions((prevQuestions) =>
            prevQuestions.map((question, qIdx) =>
                qIdx === index ? { ...question, text } : question,
            ),
        );
    };

    const removeOption = (questionIndex: number) => (index: number) => {
        setQuestions((prevQuestions) =>
            prevQuestions.map((question, qIdx) =>
                qIdx === questionIndex
                    ? {
                          ...question,
                          options: question.options.filter(
                              (_, optIdx) => optIdx !== index,
                          ),
                      }
                    : question,
            ),
        );
    };

    const deleteQuestion = (questionIndex: number) => {
        setQuestions((prevQuestions) =>
            prevQuestions.filter((_, idx) => idx !== questionIndex),
        );
    };

    const addNewQuestion = () =>
        setQuestions((prevQuestions) => [
            ...prevQuestions,
            {
                text: `${LESSON_QUIZ_QUESTION_PLACEHOLDER} #${
                    prevQuestions.length + 1
                }`,
                options: [{ text: "", correctAnswer: false }],
            },
        ]);

    return (
        <div className="flex flex-col gap-8 mb-8">
            <div className="flex flex-col gap-4">
                {questions.map((question: Question, index: number) => (
                    <Section key={index}>
                        <QuestionBuilder
                            details={question}
                            index={index}
                            removeOption={removeOption(index)}
                            setQuestionText={setQuestionText(index)}
                            setOptionText={setOptionText(index)}
                            setCorrectOption={setCorrectAnswer(index)}
                            addNewOption={() => addNewOption(index)}
                            deleteQuestion={deleteQuestion}
                        />
                    </Section>
                ))}
            </div>
            <div>
                <Button
                    variant="outline"
                    onClick={(e: FormEvent<HTMLButtonElement>) => {
                        e.preventDefault();
                        addNewQuestion();
                    }}
                >
                    {LESSON_QUIZ_ADD_QUESTION}
                </Button>
            </div>
            <div className="flex flex-col gap-8">
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label htmlFor="preview" className="font-semibold">
                            Graded Quiz
                        </Label>
                        <p className="text-sm text-muted-foreground">
                            Allow students to preview this lesson
                        </p>
                    </div>
                    <Switch
                        id="preview"
                        checked={passingGradeRequired}
                        onCheckedChange={(checked) =>
                            setPassingGradeRequired(checked)
                        }
                    />
                </div>
                <Input
                    type="number"
                    value={passingGradePercentage}
                    onChange={(e) =>
                        setPassingGradePercentage(parseInt(e.target.value))
                    }
                    disabled={!passingGradeRequired}
                    min={0}
                    max={100}
                />
            </div>
        </div>
    );
}
