import React from "react";
import { Section } from "@courselit/components-library";
import { useEffect, useState } from "react";
import {
    LESSON_QUIZ_ADD_QUESTION,
    LESSON_QUIZ_PASSING_GRADE_LABEL,
    LESSON_QUIZ_QUESTION_PLACEHOLDER,
} from "../../../../../../ui-config/strings";
import { QuestionBuilder } from "./question-builder";
import { Question, Quiz } from "@courselit/common-models";
import { DEFAULT_PASSING_GRADE } from "../../../../../../ui-config/constants";
import { Form, FormField } from "@courselit/components-library";
import { FormEvent } from "react";
import { Button } from "@components/ui/button";
import { Label } from "@components/ui/label";
import { Switch } from "@components/ui/switch";

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
        content.questions && setQuestions(content.questions);
        content.passingGrade && setPassingGradePercentage(content.passingGrade);
        content.requiresPassingGrade &&
            setPassingGradeRequired(content.requiresPassingGrade);
    }, [content]);

    useEffect(() => {
        onChange({
            questions,
            requiresPassingGrade: passingGradeRequired,
            passingGrade: passingGradePercentage,
        });
    }, [questions, passingGradeRequired, passingGradePercentage]);

    const addNewOption = (index: number) => {
        const question = questions[index];
        question.options = [
            ...question.options,
            { text: "", correctAnswer: false },
        ];
        setQuestions([...questions]);
    };

    const setCorrectAnswer =
        (questionIndex: number) => (index: number, checked: boolean) => {
            questions[questionIndex].options[index].correctAnswer = checked;
            setQuestions([...questions]);
        };

    const setOptionText =
        (questionIndex: number) => (index: number, text: string) => {
            questions[questionIndex].options[index].text = text;
            setQuestions([...questions]);
        };

    const setQuestionText = (index: number) => (text: string) => {
        questions[index].text = text;
        setQuestions([...questions]);
    };

    const removeOption = (questionIndex: number) => (index: number) => {
        questions[questionIndex].options.splice(index, 1);
        setQuestions([...questions]);
    };

    const deleteQuestion = (questionIndex: number) => {
        questions.splice(questionIndex, 1);
        setQuestions([...questions]);
    };

    const addNewQuestion = () =>
        setQuestions([
            ...questions,
            {
                text: `${LESSON_QUIZ_QUESTION_PLACEHOLDER} #${
                    questions.length + 1
                }`,
                options: [{ text: "", correctAnswer: false }],
            },
        ]);

    return (
        <div className="flex flex-col gap-8 mb-8">
            <Form className="flex flex-col gap-4">
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
            </Form>
            <div>
                <Button
                    variant="outline"
                    onClick={(e: FormEvent<HTMLInputElement>) => {
                        e.preventDefault();
                        addNewQuestion();
                    }}
                >
                    {LESSON_QUIZ_ADD_QUESTION}
                </Button>
            </div>
            <Form className="flex flex-col gap-8">
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
                <FormField
                    type="number"
                    label={LESSON_QUIZ_PASSING_GRADE_LABEL}
                    value={passingGradePercentage}
                    onChange={(e) =>
                        setPassingGradePercentage(parseInt(e.target.value))
                    }
                    disabled={!passingGradeRequired}
                    min={0}
                    max={100}
                />
                {/* <div className="flex items-center gap-2">
                    <Checkbox
                        checked={passingGradeRequired}
                        onChange={(value: boolean) =>
                            setPassingGradeRequired(value)
                        }
                    />
                    <p>{LESSON_QUIZ_GRADED_TEXT}</p>
                </div>
                <FormField
                    type="number"
                    label={LESSON_QUIZ_PASSING_GRADE_LABEL}
                    value={passingGradePercentage}
                    onChange={(e) =>
                        setPassingGradePercentage(parseInt(e.target.value))
                    }
                    disabled={!passingGradeRequired}
                    min={0}
                    max={100}
                /> */}
            </Form>
        </div>
    );
}
