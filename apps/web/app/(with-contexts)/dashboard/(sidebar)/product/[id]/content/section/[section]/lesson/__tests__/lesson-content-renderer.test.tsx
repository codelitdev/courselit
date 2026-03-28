import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LessonContentRenderer } from "../lesson-content-renderer";
import { Constants } from "@courselit/common-models";
import { AddressContext, ProfileContext } from "@components/contexts";
import "@testing-library/jest-dom";

// Mock dependencies
jest.mock("@courselit/text-editor", () => {
    const React = jest.requireActual("react");
    return {
        Editor: ({ onChange, initialContent }: any) =>
            React.createElement(
                "div",
                { "data-testid": "text-editor" },
                React.createElement("textarea", {
                    "data-testid": "text-editor-input",
                    onChange: (e: any) =>
                        onChange({ type: "doc", content: e.target.value }),
                    value: initialContent?.content || "",
                }),
            ),
        emptyDoc: { type: "doc", content: [] },
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

jest.mock("@courselit/components-library", () => {
    const React = jest.requireActual("react");
    return {
        MediaSelector: ({ onSelection, onRemove }: any) =>
            React.createElement(
                "div",
                { "data-testid": "media-selector" },
                React.createElement(
                    "button",
                    {
                        onClick: () =>
                            onSelection({
                                originalFileName: "test.mp4",
                                mediaId: "123",
                            }),
                    },
                    "Select Media",
                ),
                React.createElement(
                    "button",
                    { onClick: onRemove },
                    "Remove Media",
                ),
            ),
        useToast: () => ({
            toast: jest.fn(),
        }),
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

jest.mock("@components/public/lesson-viewer/embed-viewer", () => {
    const React = jest.requireActual("react");
    return {
        __esModule: true,
        default: ({ content }: any) =>
            React.createElement(
                "div",
                { "data-testid": "embed-viewer" },
                content.value,
            ),
    };
});

jest.mock("@courselit/utils", () => ({
    FetchBuilder: jest.fn().mockImplementation(() => ({
        setUrl: jest.fn().mockReturnThis(),
        setPayload: jest.fn().mockReturnThis(),
        setIsGraphQLEndpoint: jest.fn().mockReturnThis(),
        build: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({}),
    })),
}));

describe("LessonContentRenderer", () => {
    const mockOnContentChange = jest.fn();
    const mockOnLessonChange = jest.fn();
    const defaultProps = {
        lesson: {},
        errors: {},
        onContentChange: mockOnContentChange,
        onLessonChange: mockOnLessonChange,
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AddressContext.Provider
            value={{ backend: "http://localhost:3000", frontend: "" }}
        >
            <ProfileContext.Provider
                value={
                    { profile: { userId: "1", email: "test@test.com" } } as any
                }
            >
                {children}
            </ProfileContext.Provider>
        </AddressContext.Provider>
    );

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("renders text editor for TEXT lesson type", () => {
        render(
            <LessonContentRenderer
                {...defaultProps}
                lesson={{ type: Constants.LessonType.TEXT }}
            />,
            { wrapper },
        );

        expect(screen.getByTestId("text-editor")).toBeInTheDocument();
    });

    it("renders embed viewer for EMBED lesson type", async () => {
        render(
            <LessonContentRenderer
                {...defaultProps}
                lesson={{
                    type: Constants.LessonType.EMBED,
                    content: {
                        value: "https://youtube.com/watch?v=123",
                    } as any,
                }}
            />,
            { wrapper },
        );

        expect(
            screen.getByPlaceholderText(/e.g. YouTube video URL/i),
        ).toBeInTheDocument();
        await waitFor(() => {
            expect(screen.getByTestId("embed-viewer")).toBeInTheDocument();
        });
    });

    it("renders quiz builder for QUIZ lesson type", () => {
        render(
            <LessonContentRenderer
                {...defaultProps}
                lesson={{ type: Constants.LessonType.QUIZ }}
            />,
            { wrapper },
        );

        expect(screen.getByText("Add Question")).toBeInTheDocument();
    });

    it("renders media selector for VIDEO lesson type", () => {
        render(
            <LessonContentRenderer
                {...defaultProps}
                lesson={{
                    type: Constants.LessonType.VIDEO,
                    lessonId: "1",
                    title: "Test Lesson",
                }}
            />,
            { wrapper },
        );

        expect(screen.getByTestId("media-selector")).toBeInTheDocument();
    });

    it("renders media selector for AUDIO lesson type", () => {
        render(
            <LessonContentRenderer
                {...defaultProps}
                lesson={{
                    type: Constants.LessonType.AUDIO,
                    lessonId: "1",
                    title: "Test Lesson",
                }}
            />,
            { wrapper },
        );

        expect(screen.getByTestId("media-selector")).toBeInTheDocument();
    });

    it("renders media selector for PDF lesson type", () => {
        render(
            <LessonContentRenderer
                {...defaultProps}
                lesson={{
                    type: Constants.LessonType.PDF,
                    lessonId: "1",
                    title: "Test Lesson",
                }}
            />,
            { wrapper },
        );

        expect(screen.getByTestId("media-selector")).toBeInTheDocument();
    });

    it("renders media selector for FILE lesson type", () => {
        render(
            <LessonContentRenderer
                {...defaultProps}
                lesson={{
                    type: Constants.LessonType.FILE,
                    lessonId: "1",
                    title: "Test Lesson",
                }}
            />,
            { wrapper },
        );

        expect(screen.getByTestId("media-selector")).toBeInTheDocument();
    });

    it("handles content change in text editor", () => {
        render(
            <LessonContentRenderer
                {...defaultProps}
                lesson={{ type: Constants.LessonType.TEXT }}
            />,
            { wrapper },
        );

        const input = screen.getByTestId("text-editor-input");
        fireEvent.change(input, { target: { value: "New content" } });

        expect(mockOnContentChange).toHaveBeenCalledWith({
            type: "doc",
            content: "New content",
        });
    });

    it("handles content change in embed url", () => {
        render(
            <LessonContentRenderer
                {...defaultProps}
                lesson={{ type: Constants.LessonType.EMBED }}
            />,
            { wrapper },
        );

        const input = screen.getByPlaceholderText(/e.g. YouTube video URL/i);
        fireEvent.change(input, { target: { value: "https://new-url.com" } });

        // The useEffect in the component triggers the change
        expect(mockOnContentChange).toHaveBeenCalledWith({
            value: "https://new-url.com",
        });
    });

    it("renders quiz builder for QUIZ lesson type", () => {
        render(
            <LessonContentRenderer
                {...defaultProps}
                lesson={{ type: Constants.LessonType.QUIZ }}
            />,
            { wrapper },
        );

        // Verify QuizBuilder is rendered (it contains "Add Question" button)
        expect(screen.getByText("Add Question")).toBeInTheDocument();
    });

    it("handles media selection", async () => {
        render(
            <LessonContentRenderer
                {...defaultProps}
                lesson={{
                    type: Constants.LessonType.VIDEO,
                    lessonId: "1",
                    title: "Test Lesson",
                }}
            />,
            { wrapper },
        );

        fireEvent.click(screen.getByText("Select Media"));

        expect(mockOnLessonChange).toHaveBeenCalledWith(
            expect.objectContaining({
                media: expect.objectContaining({
                    originalFileName: "test.mp4",
                }),
            }),
        );
    });
});
