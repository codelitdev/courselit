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
import { Button, Checkbox, Grid, Typography } from "@mui/material";
import { ChangeEvent, useState } from "react";
import { connect } from "react-redux";
import {
    QUIZ_FAIL_MESSAGE,
    QUIZ_PASS_MESSAGE,
    QUIZ_VIEWER_EVALUATE_BTN,
    QUIZ_VIEWER_EVALUATE_BTN_LOADING,
} from "../../../ui-config/strings";

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
        optionIndex: number
    ) => {
        const addOptionToQuestion = (
            questionIndex: number,
            optionIndex: number
        ) => {
            answers[questionIndex].push(optionIndex);
            setAnswers([...answers]);
        };

        const removeOptionFromQuestion = (
            questionIndex: number,
            optionIndex: number
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
                                `${QUIZ_PASS_MESSAGE} ${score} points.`
                            )
                        )
                    );
                } else {
                    dispatch(
                        setAppMessage(
                            new AppMessage(
                                `${QUIZ_FAIL_MESSAGE} ${score} points. Requires ${passingGrade} points.`
                            )
                        )
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
        <Grid container direction="column" component="form" onSubmit={evaluate}>
            {questions.map((question: Question, questionIndex: number) => (
                <Grid
                    item
                    sx={{
                        marginBottom: 1,
                        paddingTop: 1,
                        paddingBottom: 1,
                        paddingRight: 2,
                        paddingLeft: 2,
                        border: "1px solid #eee",
                        borderRadius: 3,
                    }}
                    component="fieldset"
                    key={questionIndex}
                >
                    <Grid container direction="column">
                        <Grid
                            item
                            sx={{
                                marginBottom: 1,
                            }}
                        >
                            <Typography variant="h6" component="legend">
                                {question.text}
                            </Typography>
                        </Grid>
                        {question.options.map((option, index: number) => (
                            <Grid item key={index}>
                                <Grid
                                    container
                                    direction="row"
                                    alignItems="center"
                                    sx={{
                                        marginBottom: 1,
                                    }}
                                >
                                    <Grid item>
                                        <Checkbox
                                            checked={option.correctAnswer}
                                            onChange={(
                                                e: ChangeEvent<HTMLInputElement>
                                            ) =>
                                                setAnswerForQuestion(
                                                    e.target.checked,
                                                    questionIndex,
                                                    index
                                                )
                                            }
                                        />
                                    </Grid>
                                    <Grid item xs>
                                        <Typography component="label">
                                            {option.text}
                                        </Typography>
                                    </Grid>
                                </Grid>
                            </Grid>
                        ))}
                    </Grid>
                </Grid>
            ))}
            <Grid item>
                <Button type="submit" disabled={loading}>
                    {loading
                        ? QUIZ_VIEWER_EVALUATE_BTN_LOADING
                        : QUIZ_VIEWER_EVALUATE_BTN}
                </Button>
            </Grid>
        </Grid>
    );
}

const mapStateToProps = (state: AppState) => ({
    address: state.address,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
    dispatch: dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(QuizViewer);
