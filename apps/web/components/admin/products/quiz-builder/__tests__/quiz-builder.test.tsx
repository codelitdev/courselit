import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { QuizBuilder } from "../index";
import "@testing-library/jest-dom";

// Mock dependencies
jest.mock("@courselit/components-library", () => {
    const React = jest.requireActual("react");
    return {
        Section: ({ children }: any) =>
            React.createElement("div", { "data-testid": "section" }, children),
        Checkbox: ({ checked, onChange }: any) =>
            React.createElement("input", {
                type: "checkbox",
                checked,
                onChange: (e: any) => onChange(e.target.checked),
                "data-testid": "checkbox",
            }),
        IconButton: ({ onClick, children }: any) =>
            React.createElement(
                "button",
                { onClick, "data-testid": "icon-button" },
                children,
            ),
        Tooltip: ({ children, title }: any) =>
            React.createElement(
                "div",
                { title, "data-testid": "tooltip" },
                children,
            ),
    };
});

jest.mock("@ui-config/strings", () => ({
    LESSON_QUIZ_ADD_QUESTION: "Add Question",
    LESSON_QUIZ_QUESTION_PLACEHOLDER: "Question Placeholder",
    LESSON_QUIZ_ADD_OPTION_BTN: "Add Option",
    LESSON_QUIZ_CONTENT_HEADER: "Question",
    LESSON_QUIZ_OPTION_PLACEHOLDER: "Option Placeholder",
    QUESTION_BUILDER_COLLAPSE_TOOLTIP: "Collapse",
    QUESTION_BUILDER_CORRECT_ANS_TOOLTIP: "Correct Answer",
    QUESTION_BUILDER_DELETE_TOOLTIP: "Delete",
    QUESTION_BUILDER_EXPAND_TOOLTIP: "Expand",
}));

jest.mock("@components/ui/button", () => {
    const React = jest.requireActual("react");
    return {
        Button: ({ onClick, children }: any) =>
            React.createElement(
                "button",
                { onClick, "data-testid": "button" },
                children,
            ),
    };
});

jest.mock("@components/ui/label", () => {
    const React = jest.requireActual("react");
    return {
        Label: ({ children }: any) =>
            React.createElement("label", {}, children),
    };
});

jest.mock("@components/ui/switch", () => {
    const React = jest.requireActual("react");
    return {
        Switch: ({ checked, onCheckedChange }: any) =>
            React.createElement("input", {
                type: "checkbox",
                checked,
                onChange: (e: any) => onCheckedChange(e.target.checked),
                "data-testid": "switch",
            }),
    };
});

jest.mock("@components/ui/input", () => {
    const React = jest.requireActual("react");
    return {
        Input: (props: any) =>
            React.createElement("input", { ...props, "data-testid": "input" }),
    };
});

jest.mock("@courselit/icons", () => {
    const React = jest.requireActual("react");
    return {
        ExpandLess: () =>
            React.createElement(
                "span",
                { "data-testid": "icon-expand-less" },
                "ExpandLess",
            ),
        ExpandMore: () =>
            React.createElement(
                "span",
                { "data-testid": "icon-expand-more" },
                "ExpandMore",
            ),
    };
});

jest.mock("lucide-react", () => {
    const React = jest.requireActual("react");
    return {
        Trash: () =>
            React.createElement(
                "span",
                { "data-testid": "icon-trash" },
                "Trash",
            ),
    };
});

describe("QuizBuilder", () => {
    const mockOnChange = jest.fn();
    const defaultProps = {
        content: {
            questions: [
                {
                    text: "Question 1",
                    options: [{ text: "Option 1", correctAnswer: false }],
                },
            ],
            requiresPassingGrade: false,
            passingGrade: 0,
        },
        onChange: mockOnChange,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("renders initial questions", () => {
        render(<QuizBuilder {...defaultProps} />);

        expect(screen.getByDisplayValue("Question 1")).toBeInTheDocument();
        expect(screen.getByDisplayValue("Option 1")).toBeInTheDocument();
    });

    it("adds a new question", () => {
        render(<QuizBuilder {...defaultProps} />);

        fireEvent.click(screen.getByText("Add Question"));

        expect(mockOnChange).toHaveBeenCalledWith(
            expect.objectContaining({
                questions: expect.arrayContaining([
                    expect.objectContaining({ text: "Question 1" }),
                    expect.objectContaining({
                        text: "Question Placeholder #2",
                    }),
                ]),
            }),
        );
    });

    it("deletes a question", () => {
        // We need at least 2 questions to show delete button on the second one (index > 0)
        // Or check logic: QuestionBuilder shows delete if index > 0.
        // So we need to add a question first or start with 2.

        const propsWithTwoQuestions = {
            ...defaultProps,
            content: {
                ...defaultProps.content,
                questions: [
                    { text: "Q1", options: [] },
                    { text: "Q2", options: [] },
                ],
            },
        };

        render(<QuizBuilder {...propsWithTwoQuestions} />);

        // Find delete button for second question.
        // It's the Trash icon in the header of the second question.
        // Structure: Section -> QuestionBuilder -> Header -> IconButton -> Trash

        const trashIcons = screen.getAllByTestId("icon-trash");
        // Q1: no delete. Q2: delete.
        // Also options might have delete buttons. Here options are empty.

        const deleteBtn = trashIcons[0].closest("button");
        fireEvent.click(deleteBtn!);

        expect(mockOnChange).toHaveBeenCalledWith(
            expect.objectContaining({
                questions: [expect.objectContaining({ text: "Q1" })],
            }),
        );
    });

    it("updates question text", () => {
        render(<QuizBuilder {...defaultProps} />);

        const input = screen.getByDisplayValue("Question 1");
        fireEvent.change(input, { target: { value: "Updated Question" } });

        expect(mockOnChange).toHaveBeenCalledWith(
            expect.objectContaining({
                questions: [
                    expect.objectContaining({ text: "Updated Question" }),
                ],
            }),
        );
    });

    it("adds an option to a question", () => {
        render(<QuizBuilder {...defaultProps} />);

        fireEvent.click(screen.getByText("Add Option"));

        expect(mockOnChange).toHaveBeenCalledWith(
            expect.objectContaining({
                questions: [
                    expect.objectContaining({
                        options: expect.arrayContaining([
                            expect.objectContaining({ text: "Option 1" }),
                            expect.objectContaining({ text: "" }),
                        ]),
                    }),
                ],
            }),
        );
    });

    it("removes an option from a question", () => {
        render(<QuizBuilder {...defaultProps} />);

        // Find remove option button.
        const trashIcons = screen.getAllByTestId("icon-trash");
        // Only 1 option, so 1 trash icon (since Q1 has no delete button).

        const deleteBtn = trashIcons[0].closest("button");
        fireEvent.click(deleteBtn!);

        expect(mockOnChange).toHaveBeenCalledWith(
            expect.objectContaining({
                questions: [
                    expect.objectContaining({
                        options: [],
                    }),
                ],
            }),
        );
    });

    it("updates option text", () => {
        render(<QuizBuilder {...defaultProps} />);

        const input = screen.getByDisplayValue("Option 1");
        fireEvent.change(input, { target: { value: "Updated Option" } });

        expect(mockOnChange).toHaveBeenCalledWith(
            expect.objectContaining({
                questions: [
                    expect.objectContaining({
                        options: [
                            expect.objectContaining({ text: "Updated Option" }),
                        ],
                    }),
                ],
            }),
        );
    });

    it("sets correct answer", () => {
        render(<QuizBuilder {...defaultProps} />);

        const checkbox = screen.getByTestId("checkbox");
        fireEvent.click(checkbox);

        expect(mockOnChange).toHaveBeenCalledWith(
            expect.objectContaining({
                questions: [
                    expect.objectContaining({
                        options: [
                            expect.objectContaining({ correctAnswer: true }),
                        ],
                    }),
                ],
            }),
        );
    });

    it("toggles graded quiz", () => {
        render(<QuizBuilder {...defaultProps} />);

        fireEvent.click(screen.getByTestId("switch"));

        expect(mockOnChange).toHaveBeenCalledWith(
            expect.objectContaining({
                requiresPassingGrade: true,
            }),
        );
    });

    it("updates passing grade", () => {
        render(
            <QuizBuilder
                {...defaultProps}
                content={{
                    ...defaultProps.content,
                    requiresPassingGrade: true,
                }}
            />,
        );

        // The passing grade input is the number input.
        // We have text inputs for questions/options.
        // We can find by type="number" if we mocked it correctly or by value.
        // Our mock for Input: React.createElement("input", { ...props, "data-testid": "input" })
        // The component passes type="number".

        // Let's find all inputs and filter or just assume the last one?
        // Or better, check props passed to mock.

        // Let's use value.
        // The default passing grade is 70 when 0 is passed (falsy)
        const input = screen.getByDisplayValue("70");
        fireEvent.change(input, { target: { value: "80" } });

        expect(mockOnChange).toHaveBeenCalledWith(
            expect.objectContaining({
                passingGrade: 80,
            }),
        );
    });
});
