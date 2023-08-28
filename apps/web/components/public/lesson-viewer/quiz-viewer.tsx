import {
    Address,
    AppMessage,
    Question,
    Quiz as QuizViewer,
} from "@courselit/common-models";
import {
    actionCreators,
    AppDispatch,
    AppState,
} from "@courselit/state-management";
import { setAppMessage } from "@courselit/state-management/dist/action-creators";
import { FetchBuilder } from "@courselit/utils";
import { ChangeEvent, useState } from "react";
import { connect } from "react-redux";
import {
    QUIZ_FAIL_MESSAGE,
    QUIZ_PASS_MESSAGE,
    QUIZ_VIEWER_EVALUATE_BTN,
    QUIZ_VIEWER_EVALUATE_BTN_LOADING,
} from "../../../ui-config/strings";
import { Form, FormSubmit } from "@courselit/components-library";

const { networkAction } = actionCreators;

interface QuizViewerProps {
    lessonId: string;
    content: QuizViewer;
    dispatch: AppDispatch;
    address: Address;
}

function QuizViewer({ content, lessonId, dispatch, address }: QuizViewerProps) {
    const { questions } = content;
    const [answers, setAnswers] = useState<number[][]>([
        ...content.questions.map((item) => []),
    ]);
    const [loading, setLoading] = useState(false);

    const setAnswerForQuestion = (
        checked: boolean,
        questionIndex: number,
        optionIndex: number,
    ) => {
        const addOptionToQuestion = (
            questionIndex: number,
            optionIndex: number,
        ) => {
            answers[questionIndex].push(optionIndex);
            setAnswers([...answers]);
        };

        const removeOptionFromQuestion = (
            questionIndex: number,
            optionIndex: number,
        ) => {
            const index = answers[questionIndex].indexOf(optionIndex);
            answers[questionIndex].splice(index, 1);
            setAnswers([...answers]);
        };

        if (checked) {
            addOptionToQuestion(questionIndex, optionIndex);
        } else {
            removeOptionFromQuestion(questionIndex, optionIndex);
        }
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
            dispatch(networkAction(true));
            setLoading(true);
            const response = await fetch.exec();

            if (response.result) {
                const { pass, score, passingGrade } = response.result;
                if (pass) {
                    dispatch(
                        setAppMessage(
                            new AppMessage(
                                `${QUIZ_PASS_MESSAGE} ${score} points.`,
                            ),
                        ),
                    );
                } else {
                    dispatch(
                        setAppMessage(
                            new AppMessage(
                                `${QUIZ_FAIL_MESSAGE} ${score} points. Requires ${passingGrade} points.`,
                            ),
                        ),
                    );
                }
            }
        } catch (err: any) {
            dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            dispatch(networkAction(false));
            setLoading(false);
        }
    };

    return (
        <Form onSubmit={evaluate}>
            {questions.map((question: Question, questionIndex: number) => (
                <fieldset
                    className="flex flex-col py-2 px-4 mb-4 border rounded border-slate-200"
                    key={questionIndex}
                >
                    <h2 className="font-medium text-xl mb-2">
                        {question.text}
                    </h2>
                    {question.options.map((option, index: number) => (
                        <div className="flex items-center mb-2" key={index}>
                            <input
                                type="checkbox"
                                className="mr-2"
                                checked={option.correctAnswer}
                                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                    setAnswerForQuestion(
                                        e.target.checked,
                                        questionIndex,
                                        index,
                                    )
                                }
                            />
                            <label>{option.text}</label>
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

const mapStateToProps = (state: AppState) => ({
    address: state.address,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
    dispatch: dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(QuizViewer);
