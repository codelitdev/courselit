import React, { ChangeEvent } from "react";
import { Question } from "@courselit/common-models";
import { Delete, ExpandLess, ExpandMore } from "@mui/icons-material";
import {
    Button,
    Checkbox,
    Grid,
    IconButton,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import { useState } from "react";
import {
    LESSON_QUIZ_ADD_OPTION_BTN,
    LESSON_QUIZ_CONTENT_HEADER,
    LESSON_QUIZ_OPTIONS_HEADER,
    QUESTION_BUILDER_COLLAPSE_TOOLTIP,
    QUESTION_BUILDER_CORRECT_ANS_TOOLTIP,
    QUESTION_BUILDER_DELETE_TOOLTIP,
    QUESTION_BUILDER_EXPAND_TOOLTIP,
} from "../../../../../../ui-config/strings";

interface QuestionProps {
    details: Question;
    index: number;
    removeOption: (index: number) => void;
    setQuestionText: (text: string) => void;
    setOptionText: (index: number, text: string) => void;
    setCorrectOption: (index: number, checked: boolean) => void;
    addNewOption: () => void;
    deleteQuestion: (index: number) => void;
}

export function QuestionBuilder({
    details,
    index,
    setOptionText,
    setQuestionText,
    removeOption,
    addNewOption,
    setCorrectOption,
    deleteQuestion,
}: QuestionProps) {
    const [collapsed, setCollapsed] = useState(false);

    if (collapsed) {
        return (
            <Grid
                container
                alignItems="center"
                sx={{
                    paddingTop: 1,
                    paddingBottom: 1,
                    paddingLeft: 2,
                    paddingRight: 2,
                    border: "1px solid #eee",
                    borderRadius: 3,
                }}
            >
                <Grid item xs>
                    <Typography
                        variant="subtitle1"
                        sx={{ fontWeight: "bolder" }}
                    >
                        {`${LESSON_QUIZ_CONTENT_HEADER} #${index + 1}`}
                    </Typography>
                </Grid>
                <Grid item>
                    {index > 0 && (
                        <Tooltip title={QUESTION_BUILDER_DELETE_TOOLTIP}>
                            <IconButton onClick={() => deleteQuestion(index)}>
                                <Delete />
                            </IconButton>
                        </Tooltip>
                    )}
                    <Tooltip title={QUESTION_BUILDER_EXPAND_TOOLTIP}>
                        <IconButton onClick={() => setCollapsed(false)}>
                            <ExpandMore />
                        </IconButton>
                    </Tooltip>
                </Grid>
            </Grid>
        );
    }

    return (
        <Grid
            container
            direction="column"
            sx={{
                marginBottom: 1,
                paddingTop: 1,
                paddingBottom: 1,
                paddingRight: 2,
                paddingLeft: 2,
                border: "1px solid #eee",
                borderRadius: 3,
            }}
        >
            <Grid
                item
                xs
                sx={{
                    marginBottom: 2,
                }}
            >
                <Grid container alignItems="center">
                    <Grid item xs sx={{ marginRight: 1 }}>
                        <Typography
                            variant="subtitle1"
                            sx={{ fontWeight: "bolder" }}
                        >
                            {`${LESSON_QUIZ_CONTENT_HEADER} #${index + 1}`}
                        </Typography>
                    </Grid>
                    <Grid item>
                        {index > 0 && (
                            <Tooltip title={QUESTION_BUILDER_DELETE_TOOLTIP}>
                                <IconButton
                                    onClick={() => deleteQuestion(index)}
                                >
                                    <Delete />
                                </IconButton>
                            </Tooltip>
                        )}
                        <Tooltip title={QUESTION_BUILDER_COLLAPSE_TOOLTIP}>
                            <IconButton onClick={() => setCollapsed(true)}>
                                <ExpandLess />
                            </IconButton>
                        </Tooltip>
                    </Grid>
                </Grid>
            </Grid>
            <Grid item sx={{ marginBottom: 1 }}>
                <TextField
                    value={details.text}
                    label={LESSON_QUIZ_CONTENT_HEADER}
                    fullWidth
                    onChange={(e) => setQuestionText(e.target.value)}
                    maxRows={5}
                    multiline={true}
                />
            </Grid>
            <Grid
                item
                sx={{
                    marginBottom: 1,
                }}
            >
                <Typography
                    variant="subtitle2"
                    color="textSecondary"
                    sx={{
                        fontWeight: "bolder",
                    }}
                >
                    {LESSON_QUIZ_OPTIONS_HEADER}
                </Typography>
            </Grid>
            {details.options.map((option: Option, index: number) => (
                <Grid
                    container
                    direction="row"
                    alignItems="center"
                    sx={{
                        marginBottom: 1,
                    }}
                    key={index}
                >
                    <Grid item>
                        <Tooltip
                            title={QUESTION_BUILDER_CORRECT_ANS_TOOLTIP}
                            tabIndex={0}
                        >
                            <Checkbox
                                checked={option.correctAnswer}
                                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                    setCorrectOption(index, e.target.checked)
                                }
                                inputProps={{ tabIndex: 0 }}
                            />
                        </Tooltip>
                    </Grid>
                    <Grid item xs>
                        <TextField
                            value={option.text}
                            onChange={(e) =>
                                setOptionText(index, e.target.value)
                            }
                            fullWidth
                        />
                    </Grid>
                    <Grid item>
                        <IconButton onClick={() => removeOption(index)}>
                            <Delete />
                        </IconButton>
                    </Grid>
                </Grid>
            ))}
            <Grid
                item
                sx={{
                    marginTop: 1,
                }}
            >
                <Button
                    onClick={() => addNewOption()}
                    variant="outlined"
                    tabIndex={0}
                >
                    {LESSON_QUIZ_ADD_OPTION_BTN}
                </Button>
            </Grid>
        </Grid>
    );
}
