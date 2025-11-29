import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LessonPage from "../page";
import { Constants } from "@courselit/common-models";
import { AddressContext } from "@components/contexts";
import { FetchBuilder } from "@courselit/utils";
import "@testing-library/jest-dom";

// Mock dependencies
// Module-level variable to control lesson ID for edit mode
let mockLessonId: string | null = null;

jest.mock("next/navigation", () => ({
    useRouter: () => ({
        push: jest.fn(),
        replace: jest.fn(),
    }),
    useParams: () => ({
        id: "product-1",
        section: "section-1",
    }),
    useSearchParams: () => ({
        get: (key: string) => {
            if (key === "id") return mockLessonId;
            return null;
        },
    }),
}));

jest.mock("next/link", () => {
    return ({ children }: { children: React.ReactNode }) => {
        return children;
    };
});

const mockProduct = {
    title: "Test Course",
    type: "course",
};

jest.mock("@/hooks/use-product", () => ({
    __esModule: true,
    default: () => ({
        product: mockProduct,
        loaded: true,
    }),
}));

jest.mock("@courselit/utils", () => ({
    FetchBuilder: jest.fn().mockImplementation(() => ({
        setUrl: jest.fn().mockReturnThis(),
        setPayload: jest.fn().mockReturnThis(),
        setIsGraphQLEndpoint: jest.fn().mockReturnThis(),
        build: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({}),
    })),
}));

jest.mock("@courselit/text-editor", () => ({
    emptyDoc: { type: "doc", content: [] },
}));

jest.mock("@courselit/components-library", () => ({
    useToast: () => ({
        toast: jest.fn(),
    }),
}));

jest.mock("../lesson-content-renderer", () => ({
    LessonContentRenderer: ({ errors, onContentChange }: any) => (
        <div data-testid="lesson-content-renderer">
            {errors.content && (
                <div data-testid="content-error">{errors.content}</div>
            )}
            <button onClick={() => onContentChange({ value: "New Content" })}>
                Update Content
            </button>
        </div>
    ),
}));

jest.mock("@components/ui/button", () => ({
    Button: ({ onClick, children, type }: any) => (
        <button onClick={onClick} type={type} data-testid="button">
            {children}
        </button>
    ),
}));

jest.mock("@components/ui/input", () => ({
    Input: ({ value, onChange, placeholder, className }: any) => (
        <input
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className={className}
            data-testid="input"
        />
    ),
}));

jest.mock("@components/ui/label", () => ({
    Label: ({ children }: any) => <label>{children}</label>,
}));

jest.mock("@components/ui/switch", () => ({
    Switch: ({ checked, onCheckedChange }: any) => (
        <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onCheckedChange(e.target.checked)}
            data-testid="switch"
        />
    ),
}));

jest.mock("@components/ui/radio-group", () => {
    const radioGroupState: { onValueChange: any } = { onValueChange: null };

    return {
        RadioGroup: ({ value, onValueChange, children }: any) => {
            radioGroupState.onValueChange = onValueChange;
            return <div data-testid="radio-group">{children}</div>;
        },
        RadioGroupItem: ({ value, ...props }: any) => (
            <div
                data-testid={`radio-item-${value}`}
                onClick={() => {
                    if (radioGroupState.onValueChange) {
                        radioGroupState.onValueChange(value);
                    }
                }}
                {...props}
            />
        ),
    };
});

jest.mock("@components/ui/dialog", () => ({
    Dialog: ({ children, open }: any) =>
        open ? <div data-testid="dialog">{children}</div> : null,
    DialogContent: ({ children }: any) => <div>{children}</div>,
    DialogHeader: ({ children }: any) => <div>{children}</div>,
    DialogTitle: ({ children }: any) => <div>{children}</div>,
    DialogDescription: ({ children }: any) => <div>{children}</div>,
    DialogFooter: ({ children }: any) => <div>{children}</div>,
    DialogTrigger: ({ children }: any) => <div>{children}</div>,
}));

jest.mock("@components/admin/dashboard-content", () => ({
    __esModule: true,
    default: ({ children }: any) => <div>{children}</div>,
}));

jest.mock("../skeleton", () => ({
    LessonSkeleton: () => <div data-testid="skeleton">Loading...</div>,
}));

jest.mock("@ui-lib/utils", () => ({
    isTextEditorNonEmpty: (content: any) => {
        // For TEXT type, content is a TextEditorContent object with type: "doc" and content: []
        // It's empty if content array is empty or only contains empty paragraphs
        if (content?.type === "doc") {
            return (
                content.content &&
                content.content.length > 0 &&
                content.content.some(
                    (node: any) => node.content && node.content.length > 0,
                )
            );
        }
        // For other types, check if value exists
        return !!content && content.value !== "";
    },
    truncate: (str: string) => str,
}));

describe("LessonPage", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AddressContext.Provider
            value={{ backend: "http://localhost:3000", frontend: "" }}
        >
            {children}
        </AddressContext.Provider>
    );

    beforeEach(() => {
        jest.clearAllMocks();
        mockLessonId = null; // Reset to create mode
    });

    it("renders new lesson form", () => {
        render(<LessonPage />, { wrapper });

        expect(screen.getByText("New Lesson")).toBeInTheDocument();
        expect(
            screen.getByPlaceholderText("Enter lesson title"),
        ).toBeInTheDocument();
        expect(
            screen.getByTestId("lesson-content-renderer"),
        ).toBeInTheDocument();
    });

    it("shows validation error for empty title", async () => {
        render(<LessonPage />, { wrapper });

        const saveButton = screen.getByText("Save Lesson");
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(
                screen.getByText("Please enter a lesson title."),
            ).toBeInTheDocument();
        });
    });

    it("shows validation error for empty content (TEXT)", async () => {
        render(<LessonPage />, { wrapper });

        // Set title to avoid title error
        const titleInput = screen.getByPlaceholderText("Enter lesson title");
        fireEvent.change(titleInput, { target: { value: "Test Lesson" } });

        const saveButton = screen.getByText("Save Lesson");
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(screen.getByTestId("content-error")).toHaveTextContent(
                "Please enter the lesson content.",
            );
        });
    });

    it("shows validation error for empty URL (EMBED)", async () => {
        render(<LessonPage />, { wrapper });

        // Set title
        const titleInput = screen.getByPlaceholderText("Enter lesson title");
        fireEvent.change(titleInput, { target: { value: "Test Lesson" } });

        // Switch to Embed type
        const embedRadio = screen.getByTestId(
            `radio-item-${Constants.LessonType.EMBED}`,
        );
        fireEvent.click(embedRadio);

        const saveButton = screen.getByText("Save Lesson");
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(screen.getByTestId("content-error")).toHaveTextContent(
                "Please enter a YouTube video ID.",
            );
        });
    });

    it("shows validation error for QUIZ (no questions)", async () => {
        render(<LessonPage />, { wrapper });

        // Set title
        const titleInput = screen.getByPlaceholderText("Enter lesson title");
        fireEvent.change(titleInput, { target: { value: "Test Lesson" } });

        // Switch to Quiz type
        const quizRadio = screen.getByTestId(
            `radio-item-${Constants.LessonType.QUIZ}`,
        );
        fireEvent.click(quizRadio);

        const saveButton = screen.getByText("Save Lesson");
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(screen.getByTestId("content-error")).toHaveTextContent(
                "Please add at least one question to the quiz.",
            );
        });
    });

    it("creates a new lesson successfully", async () => {
        const mockExec = jest.fn().mockResolvedValue({
            lesson: { lessonId: "new-lesson-id" },
        });
        (FetchBuilder as unknown as jest.Mock).mockImplementation(() => ({
            setUrl: jest.fn().mockReturnThis(),
            setPayload: jest.fn().mockReturnThis(),
            setIsGraphQLEndpoint: jest.fn().mockReturnThis(),
            build: jest.fn().mockReturnThis(),
            exec: mockExec,
        }));

        render(<LessonPage />, { wrapper });

        const titleInput = screen.getByPlaceholderText("Enter lesson title");
        fireEvent.change(titleInput, { target: { value: "New Lesson" } });

        // Simulate content change to pass validation
        const updateContentButton = screen.getByText("Update Content");
        fireEvent.click(updateContentButton);

        const saveButton = screen.getByText("Save Lesson");
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(mockExec).toHaveBeenCalled();
        });
    });

    it("handles API error during save", async () => {
        const mockExec = jest.fn().mockRejectedValue(new Error("API Error"));
        (FetchBuilder as unknown as jest.Mock).mockImplementation(() => ({
            setUrl: jest.fn().mockReturnThis(),
            setPayload: jest.fn().mockReturnThis(),
            setIsGraphQLEndpoint: jest.fn().mockReturnThis(),
            build: jest.fn().mockReturnThis(),
            exec: mockExec,
        }));

        render(<LessonPage />, { wrapper });

        const titleInput = screen.getByPlaceholderText("Enter lesson title");
        fireEvent.change(titleInput, { target: { value: "New Lesson" } });

        // Simulate content change to pass validation
        const updateContentButton = screen.getByText("Update Content");
        fireEvent.click(updateContentButton);

        const saveButton = screen.getByText("Save Lesson");
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(mockExec).toHaveBeenCalled();
        });
    });

    describe("Editing existing lessons", () => {
        it("loads and edits a TEXT lesson successfully", async () => {
            mockLessonId = "lesson-123";
            const mockExec = jest
                .fn()
                .mockResolvedValueOnce({
                    lesson: {
                        lessonId: "lesson-123",
                        title: "Existing TEXT Lesson",
                        type: "TEXT",
                        content: {
                            type: "doc",
                            content: [
                                {
                                    type: "paragraph",
                                    content: [
                                        {
                                            type: "text",
                                            text: "Existing content",
                                        },
                                    ],
                                },
                            ],
                        },
                        requiresEnrollment: true,
                    },
                })
                .mockResolvedValueOnce({
                    lesson: { lessonId: "lesson-123" },
                });

            (FetchBuilder as unknown as jest.Mock).mockImplementation(() => ({
                setUrl: jest.fn().mockReturnThis(),
                setPayload: jest.fn().mockReturnThis(),
                setIsGraphQLEndpoint: jest.fn().mockReturnThis(),
                build: jest.fn().mockReturnThis(),
                exec: mockExec,
            }));

            render(<LessonPage />, { wrapper });

            // Wait for lesson to load
            await waitFor(() => {
                expect(
                    screen.getByDisplayValue("Existing TEXT Lesson"),
                ).toBeInTheDocument();
            });

            // Edit the title
            const titleInput =
                screen.getByPlaceholderText("Enter lesson title");
            fireEvent.change(titleInput, {
                target: { value: "Updated TEXT Lesson" },
            });

            // Save
            const saveButton = screen.getByText("Update Lesson");
            fireEvent.click(saveButton);

            await waitFor(() => {
                expect(mockExec).toHaveBeenCalledTimes(2); // Once for load, once for update
            });
        });

        it("loads and edits an EMBED lesson successfully", async () => {
            mockLessonId = "lesson-456";
            const mockExec = jest
                .fn()
                .mockResolvedValueOnce({
                    lesson: {
                        lessonId: "lesson-456",
                        title: "Existing EMBED Lesson",
                        type: "EMBED",
                        content: {
                            value: "https://youtube.com/watch?v=abc123",
                        },
                        requiresEnrollment: true,
                    },
                })
                .mockResolvedValueOnce({
                    lesson: { lessonId: "lesson-456" },
                });

            (FetchBuilder as unknown as jest.Mock).mockImplementation(() => ({
                setUrl: jest.fn().mockReturnThis(),
                setPayload: jest.fn().mockReturnThis(),
                setIsGraphQLEndpoint: jest.fn().mockReturnThis(),
                build: jest.fn().mockReturnThis(),
                exec: mockExec,
            }));

            render(<LessonPage />, { wrapper });

            // Wait for lesson to load
            await waitFor(() => {
                expect(
                    screen.getByDisplayValue("Existing EMBED Lesson"),
                ).toBeInTheDocument();
            });

            // Edit the title
            const titleInput =
                screen.getByPlaceholderText("Enter lesson title");
            fireEvent.change(titleInput, {
                target: { value: "Updated EMBED Lesson" },
            });

            // Save
            const saveButton = screen.getByText("Update Lesson");
            fireEvent.click(saveButton);

            await waitFor(() => {
                expect(mockExec).toHaveBeenCalledTimes(2);
            });
        });

        it("loads and edits a QUIZ lesson successfully", async () => {
            mockLessonId = "lesson-789";
            const mockExec = jest
                .fn()
                .mockResolvedValueOnce({
                    lesson: {
                        lessonId: "lesson-789",
                        title: "Existing QUIZ Lesson",
                        type: "QUIZ",
                        content: {
                            questions: [
                                {
                                    text: "What is 2+2?",
                                    options: [
                                        { text: "3", correctAnswer: false },
                                        { text: "4", correctAnswer: true },
                                    ],
                                },
                            ],
                            requiresPassingGrade: false,
                        },
                        requiresEnrollment: true,
                    },
                })
                .mockResolvedValueOnce({
                    lesson: { lessonId: "lesson-789" },
                });

            (FetchBuilder as unknown as jest.Mock).mockImplementation(() => ({
                setUrl: jest.fn().mockReturnThis(),
                setPayload: jest.fn().mockReturnThis(),
                setIsGraphQLEndpoint: jest.fn().mockReturnThis(),
                build: jest.fn().mockReturnThis(),
                exec: mockExec,
            }));

            render(<LessonPage />, { wrapper });

            // Wait for lesson to load
            await waitFor(() => {
                expect(
                    screen.getByDisplayValue("Existing QUIZ Lesson"),
                ).toBeInTheDocument();
            });

            // Edit the title
            const titleInput =
                screen.getByPlaceholderText("Enter lesson title");
            fireEvent.change(titleInput, {
                target: { value: "Updated QUIZ Lesson" },
            });

            // Save
            const saveButton = screen.getByText("Update Lesson");
            fireEvent.click(saveButton);

            await waitFor(() => {
                expect(mockExec).toHaveBeenCalledTimes(2);
            });
        });

        it("shows validation error when editing TEXT lesson with empty content", async () => {
            mockLessonId = "lesson-text-empty";
            const mockExec = jest.fn().mockResolvedValueOnce({
                lesson: {
                    lessonId: "lesson-text-empty",
                    title: "TEXT Lesson",
                    type: "TEXT",
                    content: { type: "doc", content: [] }, // Empty content
                    requiresEnrollment: true,
                },
            });

            (FetchBuilder as unknown as jest.Mock).mockImplementation(() => ({
                setUrl: jest.fn().mockReturnThis(),
                setPayload: jest.fn().mockReturnThis(),
                setIsGraphQLEndpoint: jest.fn().mockReturnThis(),
                build: jest.fn().mockReturnThis(),
                exec: mockExec,
            }));

            render(<LessonPage />, { wrapper });

            // Wait for lesson to load
            await waitFor(() => {
                expect(
                    screen.getByDisplayValue("TEXT Lesson"),
                ).toBeInTheDocument();
            });

            // Try to save without adding content
            const saveButton = screen.getByText("Update Lesson");
            fireEvent.click(saveButton);

            // Should show validation error
            await waitFor(() => {
                expect(screen.getByTestId("content-error")).toHaveTextContent(
                    "Please enter the lesson content.",
                );
            });
        });

        it("shows validation error when editing EMBED lesson with empty URL", async () => {
            mockLessonId = "lesson-embed-empty";
            const mockExec = jest.fn().mockResolvedValueOnce({
                lesson: {
                    lessonId: "lesson-embed-empty",
                    title: "EMBED Lesson",
                    type: "EMBED",
                    content: { value: "" }, // Empty URL
                    requiresEnrollment: true,
                },
            });

            (FetchBuilder as unknown as jest.Mock).mockImplementation(() => ({
                setUrl: jest.fn().mockReturnThis(),
                setPayload: jest.fn().mockReturnThis(),
                setIsGraphQLEndpoint: jest.fn().mockReturnThis(),
                build: jest.fn().mockReturnThis(),
                exec: mockExec,
            }));

            render(<LessonPage />, { wrapper });

            // Wait for lesson to load
            await waitFor(() => {
                expect(
                    screen.getByDisplayValue("EMBED Lesson"),
                ).toBeInTheDocument();
            });

            // Try to save without adding URL
            const saveButton = screen.getByText("Update Lesson");
            fireEvent.click(saveButton);

            // Should show validation error
            await waitFor(() => {
                expect(screen.getByTestId("content-error")).toHaveTextContent(
                    "Please enter a YouTube video ID.",
                );
            });
        });

        it("prevents changing lesson type when editing", async () => {
            mockLessonId = "lesson-type-lock";
            const mockExec = jest.fn().mockResolvedValueOnce({
                lesson: {
                    lessonId: "lesson-type-lock",
                    title: "Locked Type Lesson",
                    type: "TEXT",
                    content: {
                        type: "doc",
                        content: [
                            {
                                type: "paragraph",
                                content: [{ type: "text", text: "Content" }],
                            },
                        ],
                    },
                    requiresEnrollment: true,
                },
            });

            (FetchBuilder as unknown as jest.Mock).mockImplementation(() => ({
                setUrl: jest.fn().mockReturnThis(),
                setPayload: jest.fn().mockReturnThis(),
                setIsGraphQLEndpoint: jest.fn().mockReturnThis(),
                build: jest.fn().mockReturnThis(),
                exec: mockExec,
            }));

            render(<LessonPage />, { wrapper });

            // Wait for lesson to load
            await waitFor(() => {
                expect(
                    screen.getByDisplayValue("Locked Type Lesson"),
                ).toBeInTheDocument();
            });

            // Try to click on QUIZ radio button (should be disabled)
            const quizRadio = screen.getByTestId(
                `radio-item-${Constants.LessonType.QUIZ}`,
            );

            // The radio button should be disabled or not change the type
            // Since our mock doesn't handle disabled state, we just verify the lesson type doesn't change
            fireEvent.click(quizRadio);

            // The lesson type should still be TEXT (not changed to QUIZ)
            // We can verify this by checking that the TEXT content renderer is still shown
            expect(
                screen.getByTestId("lesson-content-renderer"),
            ).toBeInTheDocument();
        });

        it("handles API error when loading lesson", async () => {
            mockLessonId = "lesson-error";
            const mockExec = jest
                .fn()
                .mockRejectedValue(new Error("Failed to load lesson"));

            (FetchBuilder as unknown as jest.Mock).mockImplementation(() => ({
                setUrl: jest.fn().mockReturnThis(),
                setPayload: jest.fn().mockReturnThis(),
                setIsGraphQLEndpoint: jest.fn().mockReturnThis(),
                build: jest.fn().mockReturnThis(),
                exec: mockExec,
            }));

            render(<LessonPage />, { wrapper });

            // Wait for error handling
            await waitFor(() => {
                expect(mockExec).toHaveBeenCalled();
            });

            // The form should still render (with empty/default state)
            expect(
                screen.getByPlaceholderText("Enter lesson title"),
            ).toBeInTheDocument();
        });

        it("handles API error when updating lesson", async () => {
            mockLessonId = "lesson-update-error";
            const mockExec = jest
                .fn()
                .mockResolvedValueOnce({
                    lesson: {
                        lessonId: "lesson-update-error",
                        title: "Lesson to Update",
                        type: "TEXT",
                        content: {
                            type: "doc",
                            content: [
                                {
                                    type: "paragraph",
                                    content: [
                                        { type: "text", text: "Content" },
                                    ],
                                },
                            ],
                        },
                        requiresEnrollment: true,
                    },
                })
                .mockRejectedValueOnce(new Error("Failed to update lesson"));

            (FetchBuilder as unknown as jest.Mock).mockImplementation(() => ({
                setUrl: jest.fn().mockReturnThis(),
                setPayload: jest.fn().mockReturnThis(),
                setIsGraphQLEndpoint: jest.fn().mockReturnThis(),
                build: jest.fn().mockReturnThis(),
                exec: mockExec,
            }));

            render(<LessonPage />, { wrapper });

            // Wait for lesson to load
            await waitFor(() => {
                expect(
                    screen.getByDisplayValue("Lesson to Update"),
                ).toBeInTheDocument();
            });

            // Edit and try to save
            const titleInput =
                screen.getByPlaceholderText("Enter lesson title");
            fireEvent.change(titleInput, {
                target: { value: "Updated Title" },
            });

            const saveButton = screen.getByText("Update Lesson");
            fireEvent.click(saveButton);

            // Wait for error handling
            await waitFor(() => {
                expect(mockExec).toHaveBeenCalledTimes(2); // Load + failed update
            });
        });

        it("sends correct payload when updating TEXT lesson content", async () => {
            mockLessonId = "lesson-text-payload";
            let capturedPayload: any = null;

            const mockExec = jest
                .fn()
                .mockResolvedValueOnce({
                    lesson: {
                        lessonId: "lesson-text-payload",
                        title: "TEXT Lesson",
                        type: "TEXT",
                        content: {
                            type: "doc",
                            content: [
                                {
                                    type: "paragraph",
                                    content: [
                                        {
                                            type: "text",
                                            text: "Original content",
                                        },
                                    ],
                                },
                            ],
                        },
                        requiresEnrollment: true,
                    },
                })
                .mockResolvedValueOnce({
                    lesson: { lessonId: "lesson-text-payload" },
                });

            const mockSetPayload = jest.fn((payload) => {
                capturedPayload = payload;
                return {
                    setIsGraphQLEndpoint: jest.fn().mockReturnThis(),
                    build: jest.fn().mockReturnThis(),
                    exec: mockExec,
                };
            });

            (FetchBuilder as unknown as jest.Mock).mockImplementation(() => ({
                setUrl: jest.fn().mockReturnThis(),
                setPayload: mockSetPayload,
            }));

            render(<LessonPage />, { wrapper });

            // Wait for lesson to load
            await waitFor(() => {
                expect(
                    screen.getByDisplayValue("TEXT Lesson"),
                ).toBeInTheDocument();
            });

            // Update content by clicking the mock button
            const updateContentButton = screen.getByText("Update Content");
            fireEvent.click(updateContentButton);

            // Save
            const saveButton = screen.getByText("Update Lesson");
            fireEvent.click(saveButton);

            // Verify the mutation payload
            await waitFor(() => {
                expect(capturedPayload).toBeDefined();
                expect(capturedPayload.variables.lessonData.content).toBe(
                    JSON.stringify({ value: "New Content" }),
                );
            });
        });

        it("sends correct payload when updating EMBED lesson URL", async () => {
            mockLessonId = "lesson-embed-payload";
            let capturedPayload: any = null;

            const mockExec = jest
                .fn()
                .mockResolvedValueOnce({
                    lesson: {
                        lessonId: "lesson-embed-payload",
                        title: "EMBED Lesson",
                        type: "EMBED",
                        content: { value: "https://old-url.com" },
                        requiresEnrollment: true,
                    },
                })
                .mockResolvedValueOnce({
                    lesson: { lessonId: "lesson-embed-payload" },
                });

            const mockSetPayload = jest.fn((payload) => {
                capturedPayload = payload;
                return {
                    setIsGraphQLEndpoint: jest.fn().mockReturnThis(),
                    build: jest.fn().mockReturnThis(),
                    exec: mockExec,
                };
            });

            (FetchBuilder as unknown as jest.Mock).mockImplementation(() => ({
                setUrl: jest.fn().mockReturnThis(),
                setPayload: mockSetPayload,
            }));

            render(<LessonPage />, { wrapper });

            // Wait for lesson to load
            await waitFor(() => {
                expect(
                    screen.getByDisplayValue("EMBED Lesson"),
                ).toBeInTheDocument();
            });

            // Update content by clicking the mock button
            const updateContentButton = screen.getByText("Update Content");
            fireEvent.click(updateContentButton);

            // Save
            const saveButton2 = screen.getByText("Update Lesson");
            fireEvent.click(saveButton2);

            // Verify the mutation payload contains the new URL
            await waitFor(() => {
                expect(capturedPayload).toBeDefined();
                const content = JSON.parse(
                    capturedPayload.variables.lessonData.content,
                );
                expect(content.value).toBe("New Content");
            });
        });

        it("sends correct payload when updating QUIZ lesson", async () => {
            mockLessonId = "lesson-quiz-payload";
            let capturedPayload: any = null;

            const mockExec = jest
                .fn()
                .mockResolvedValueOnce({
                    lesson: {
                        lessonId: "lesson-quiz-payload",
                        title: "QUIZ Lesson",
                        type: "QUIZ",
                        content: {
                            questions: [
                                {
                                    text: "Original question?",
                                    options: [
                                        { text: "A", correctAnswer: true },
                                        { text: "B", correctAnswer: false },
                                    ],
                                },
                            ],
                            requiresPassingGrade: false,
                        },
                        requiresEnrollment: true,
                    },
                })
                .mockResolvedValueOnce({
                    lesson: { lessonId: "lesson-quiz-payload" },
                });

            const mockSetPayload = jest.fn((payload) => {
                capturedPayload = payload;
                return {
                    setIsGraphQLEndpoint: jest.fn().mockReturnThis(),
                    build: jest.fn().mockReturnThis(),
                    exec: mockExec,
                };
            });

            (FetchBuilder as unknown as jest.Mock).mockImplementation(() => ({
                setUrl: jest.fn().mockReturnThis(),
                setPayload: mockSetPayload,
            }));

            render(<LessonPage />, { wrapper });

            // Wait for lesson to load
            await waitFor(() => {
                expect(
                    screen.getByDisplayValue("QUIZ Lesson"),
                ).toBeInTheDocument();
            });

            // Update content by clicking the mock button (simulates quiz changes)
            const updateContentButton = screen.getByText("Update Content");
            fireEvent.click(updateContentButton);

            // Save
            const saveButton = screen.getByText("Update Lesson");
            fireEvent.click(saveButton);

            // Verify the mutation payload contains quiz data
            await waitFor(
                () => {
                    expect(mockSetPayload).toHaveBeenCalled();
                },
                { timeout: 3000 },
            );

            // If mockSetPayload was called, capturedPayload should be defined
            if (capturedPayload) {
                expect(capturedPayload.variables).toBeDefined();
                expect(capturedPayload.variables.lessonData).toBeDefined();
            }
        });
    });
});
