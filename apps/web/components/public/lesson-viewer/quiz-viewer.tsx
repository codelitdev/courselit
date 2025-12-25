import {
    Address,
    Question,
    Quiz as QuizContent,
} from "@courselit/common-models";
import { FetchBuilder } from "@courselit/utils";
import { ChangeEvent, useContext, useState } from "react";
import {
    TOAST_TITLE_ERROR,
    QUIZ_VIEWER_EVALUATE_BTN,
    QUIZ_VIEWER_EVALUATE_BTN_LOADING,
    TOAST_QUIZ_FAIL_MESSAGE,
    TOAST_QUIZ_PASS_MESSAGE,
    QUIZ_SCORE_PREFIX_MESSAGE,
} from "@/ui-config/strings";
import { Form, FormSubmit, useToast } from "@courselit/components-library";
import { Header2, Text1 } from "@courselit/page-primitives";
import { ThemeContext } from "@components/contexts";

interface QuizViewerProps {
    lessonId: string;
    content: QuizContent;
    address: Address;
}

export default function QuizViewer({
    content,
    lessonId,
    address,
}: QuizViewerProps) {
    const { questions } = content;
    const [answers, setAnswers] = useState<number[][]>([
        ...content.questions.map((item) => []),
    ]);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();
    const { theme } = useContext(ThemeContext);

    const setAnswerForQuestion = (
        checked: boolean,
        questionIndex: number,
        optionIndex: number,
    ) => {
        const question = questions[questionIndex];
        const newAnswers = [...answers];

        if (question.type === "single") {
            // For single choice, replace the entire array with the selected option
            newAnswers[questionIndex] = checked ? [optionIndex] : [];
        } else {
            // For multiple choice, add/remove from the array
            if (checked) {
                if (!newAnswers[questionIndex].includes(optionIndex)) {
                    newAnswers[questionIndex].push(optionIndex);
                }
            } else {
                const index = newAnswers[questionIndex].indexOf(optionIndex);
                if (index > -1) {
                    newAnswers[questionIndex].splice(index, 1);
                }
            }
        }

        setAnswers(newAnswers);
    };

    const evaluate = async (e: any) => {
        e.preventDefault();

        const mutation = `
        mutation {
            result: evaluateLesson(
                id: "${lessonId}",
                answers: {
                    answers: ${JSON.stringify(answers)}
                }
            ) {
                pass,
                score,
                requiresPassingGrade,
                passingGrade
            }
        }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload(mutation)
            .setIsGraphQLEndpoint(true)
            .build();

        try {
            setLoading(true);
            const response = await fetch.exec();

            if (response.result) {
                const { pass, score, passingGrade } = response.result;
                if (pass) {
                    toast({
                        title: TOAST_QUIZ_PASS_MESSAGE,
                        description: `${QUIZ_SCORE_PREFIX_MESSAGE} ${score.toFixed(2)} points.`,
                    });
                } else {
                    toast({
                        title: TOAST_QUIZ_FAIL_MESSAGE,
                        description: `${QUIZ_SCORE_PREFIX_MESSAGE} ${score.toFixed(2)} points. Requires ${passingGrade} points.`,
                        variant: "destructive",
                    });
                }
            }
        } catch (err: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Form onSubmit={evaluate}>
            {questions.map((question: Question, questionIndex: number) => (
                <fieldset className="flex flex-col mb-8" key={questionIndex}>
                    <Header2 theme={theme.theme} className="mb-4">
                        {questionIndex + 1}. {question.text}
                    </Header2>
                    {question.options.map((option, index: number) => (
                        <div className="flex items-center mb-2" key={index}>
                            <input
                                type={
                                    question.type === "single"
                                        ? "radio"
                                        : "checkbox"
                                }
                                className="mr-2"
                                name={
                                    question.type === "single"
                                        ? `question-${questionIndex}`
                                        : undefined
                                }
                                checked={answers[questionIndex].includes(index)}
                                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                    setAnswerForQuestion(
                                        e.target.checked,
                                        questionIndex,
                                        index,
                                    )
                                }
                            />
                            <Text1 theme={theme.theme}>{option.text}</Text1>
                        </div>
                    ))}
                </fieldset>
            ))}
            <div>
                <FormSubmit
                    disabled={loading}
                    text={
                        loading
                            ? QUIZ_VIEWER_EVALUATE_BTN_LOADING
                            : QUIZ_VIEWER_EVALUATE_BTN
                    }
                ></FormSubmit>
            </div>
        </Form>
    );
}
