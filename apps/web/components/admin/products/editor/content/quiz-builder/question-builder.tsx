import React from "react";
import { Question } from "@courselit/common-models";
import { Delete, ExpandLess, ExpandMore } from "@courselit/icons";
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
import {
    Checkbox,
    IconButton,
    Button,
    Tooltip,
    FormField,
} from "@courselit/components-library";
import { FormEvent } from "react";

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
            <div className="flex items-center justify-between">
                <h3 className="font-medium">
                    {`${LESSON_QUIZ_CONTENT_HEADER} #${index + 1}`}
                </h3>
                <div className="flex gap-2">
                    {index > 0 && (
                        <Tooltip title={QUESTION_BUILDER_DELETE_TOOLTIP}>
                            <IconButton
                                variant="soft"
                                onClick={() => deleteQuestion(index)}
                            >
                                <Delete />
                            </IconButton>
                        </Tooltip>
                    )}
                    <Tooltip title={QUESTION_BUILDER_EXPAND_TOOLTIP}>
                        <IconButton
                            variant="soft"
                            onClick={() => setCollapsed(false)}
                        >
                            <ExpandMore />
                        </IconButton>
                    </Tooltip>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h3 className="font-medium">
                    {`${LESSON_QUIZ_CONTENT_HEADER} #${index + 1}`}
                </h3>
                <div className="flex gap-2">
                    {index > 0 && (
                        <Tooltip title={QUESTION_BUILDER_DELETE_TOOLTIP}>
                            <IconButton
                                variant="soft"
                                onClick={() => deleteQuestion(index)}
                            >
                                <Delete />
                            </IconButton>
                        </Tooltip>
                    )}
                    <Tooltip title={QUESTION_BUILDER_COLLAPSE_TOOLTIP}>
                        <IconButton
                            variant="soft"
                            onClick={() => setCollapsed(true)}
                        >
                            <ExpandLess />
                        </IconButton>
                    </Tooltip>
                </div>
            </div>
            <FormField
                value={details.text}
                onChange={(e) => setQuestionText(e.target.value)}
            />
            <h4 className="font-medium text-slate-500">
                {LESSON_QUIZ_OPTIONS_HEADER}
            </h4>
            {details.options.map((option: Option, index: number) => (
                <div className="flex items-center gap-2" key={index}>
                    <Tooltip title={QUESTION_BUILDER_CORRECT_ANS_TOOLTIP}>
                        <Checkbox
                            checked={option.correctAnswer}
                            onChange={(value: boolean) =>
                                setCorrectOption(index, value)
                            }
                        />
                    </Tooltip>
                    <FormField
                        value={option.text}
                        onChange={(e) => setOptionText(index, e.target.value)}
                        className="w-full"
                    />
                    <IconButton
                        onClick={() => removeOption(index)}
                        variant="soft"
                    >
                        <Delete />
                    </IconButton>
                </div>
            ))}
            <div>
                <Button
                    component="button"
                    onClick={(e: FormEvent<HTMLInputElement>) => {
                        e.preventDefault();
                        addNewOption();
                    }}
                    variant="soft"
                    tabIndex={0}
                >
                    {LESSON_QUIZ_ADD_OPTION_BTN}
                </Button>
            </div>
        </div>
    );
}
