import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ProductDiscussionPanel from "../panel";
import {
    AddressContext,
    ProfileContext,
    ThemeContext,
} from "@components/contexts";

const mockToast = jest.fn();
const mockExec = jest.fn();
const payloads: Record<string, any>[] = [];
const scrollIntoView = jest.fn();

jest.mock("@components/contexts", () => {
    const React = jest.requireActual("react");
    return {
        AddressContext: React.createContext(undefined),
        ProfileContext: React.createContext(undefined),
        ThemeContext: React.createContext({ theme: {} }),
    };
});

jest.mock("next/link", () => {
    function MockNextLink({
        children,
        href,
        className,
    }: {
        children: React.ReactNode;
        href: string;
        className?: string;
    }) {
        return (
            <a href={href} className={className}>
                {children}
            </a>
        );
    }

    return MockNextLink;
});

jest.mock("@courselit/components-library", () => ({
    useToast: () => ({
        toast: mockToast,
    }),
}));

jest.mock("@courselit/page-primitives", () => ({
    Button: ({ children, disabled, onClick, type, className }: any) => (
        <button
            className={className}
            disabled={disabled}
            onClick={onClick}
            type={type || "button"}
        >
            {children}
        </button>
    ),
    Caption: ({ children, className }: any) => (
        <span className={className}>{children}</span>
    ),
    Text1: ({ children, className }: any) => (
        <span className={className}>{children}</span>
    ),
    Text2: ({ children, className }: any) => (
        <span className={className}>{children}</span>
    ),
}));

jest.mock("@components/ui/avatar", () => ({
    Avatar: ({ children }: any) => <div>{children}</div>,
    AvatarFallback: ({ children }: any) => <span>{children}</span>,
    AvatarImage: ({ alt }: any) => <span>{alt}</span>,
}));

jest.mock("@courselit/page-blocks", () => ({
    TextRenderer: ({ json }: { json: any }) => (
        <div>{json?.content?.[0]?.content?.[0]?.text}</div>
    ),
}));

jest.mock("@courselit/text-editor", () => ({
    emptyDoc: { type: "doc", content: [] },
    Editor: ({ onChange, placeholder }: any) => (
        <textarea
            aria-label={placeholder}
            onChange={(event) =>
                onChange({
                    type: "doc",
                    content: [
                        {
                            type: "paragraph",
                            content: [
                                { type: "text", text: event.target.value },
                            ],
                        },
                    ],
                })
            }
        />
    ),
}));

jest.mock("@courselit/utils", () => ({
    FetchBuilder: jest.fn().mockImplementation(() => ({
        setUrl: jest.fn().mockReturnThis(),
        setPayload: jest.fn(function (payload) {
            payloads.push(payload);
            return this;
        }),
        setIsGraphQLEndpoint: jest.fn().mockReturnThis(),
        build: jest.fn().mockReturnThis(),
        exec: mockExec,
    })),
}));

jest.mock("../report-reason-dialog", () => ({
    ReportReasonDialog: ({ isOpen, onClose, onSubmit }: any) => {
        if (!isOpen) return null;
        return (
            <div>
                <button onClick={onClose}>Cancel</button>
                <button onClick={() => onSubmit("Mock Reason")}>Submit</button>
            </div>
        );
    },
}));

jest.mock("lucide-react", () => ({
    Flag: () => null,
    ThumbsUp: () => null,
    MessageSquare: () => null,
    MoreVertical: () => null,
    Trash2: () => null,
    X: () => null,
}));

const address = { backend: "http://localhost:3000", frontend: "" };

const doc = (text: string) => ({
    type: "doc",
    content: [
        {
            type: "paragraph",
            content: [{ type: "text", text }],
        },
    ],
});

const initialComment = {
    productId: "course-1",
    entityType: "LESSON",
    entityId: "lesson-1",
    commentId: "comment-1",
    userId: "learner-2",
    content: doc("Root comment"),
    likesCount: 1,
    hasLiked: false,
    replyCount: 1,
    replyNextCursor: undefined,
    hasMoreReplies: false,
    deleted: false,
    createdAt: "2026-06-01T00:00:00.000Z",
    user: { name: "Learner Two" },
    replies: [
        {
            productId: "course-1",
            entityType: "LESSON",
            entityId: "lesson-1",
            commentId: "comment-1",
            replyId: "reply-1",
            userId: "learner-3",
            content: doc("First reply"),
            likesCount: 0,
            hasLiked: false,
            deleted: false,
            createdAt: "2026-06-01T00:00:00.000Z",
            user: { name: "Learner Three" },
        },
    ],
};

function renderPanel() {
    return render(
        <AddressContext.Provider value={address}>
            <ThemeContext.Provider value={{ theme: {} } as any}>
                <ProfileContext.Provider
                    value={{
                        profile: { userId: "learner-1" },
                        setProfile: jest.fn(),
                    }}
                >
                    <ProductDiscussionPanel
                        address={address}
                        productId="course-1"
                        slug="course-slug"
                        entityId="lesson-1"
                    />
                </ProfileContext.Provider>
            </ThemeContext.Provider>
        </AddressContext.Provider>,
    );
}

describe("ProductDiscussionPanel", () => {
    beforeAll(() => {
        Element.prototype.scrollIntoView = scrollIntoView;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        payloads.length = 0;
        window.location.hash = "";
        mockExec.mockImplementation(() => {
            const payload = payloads[payloads.length - 1];
            if (payload.query.includes("GetProductDiscussionComments")) {
                return Promise.resolve({
                    comments: {
                        items: [initialComment],
                        nextCursor: undefined,
                        hasMore: false,
                    },
                });
            }
            if (payload.query.includes("CreateProductDiscussionReply")) {
                return Promise.resolve({
                    reply: {
                        productId: "course-1",
                        entityType: "LESSON",
                        entityId: "lesson-1",
                        commentId: "comment-1",
                        replyId: "reply-2",
                        parentReplyId: "reply-1",
                        userId: "learner-1",
                        content: doc("Replying to a reply"),
                        likesCount: 0,
                        hasLiked: false,
                        deleted: false,
                        createdAt: "2026-06-01T00:00:00.000Z",
                        user: { name: "Learner One" },
                    },
                });
            }
            return Promise.resolve({});
        });
    });

    it("loads the hash target, highlights it, and scrolls it into view", async () => {
        window.location.hash = "#discussion-reply-reply-1";

        renderPanel();

        await waitFor(() => {
            expect(screen.getByText("First reply")).toBeInTheDocument();
        });

        expect(payloads[0].variables).toEqual(
            expect.objectContaining({
                targetContentType: "REPLY",
                targetContentId: "reply-1",
            }),
        );
        expect(document.getElementById("discussion-reply-reply-1")).toHaveClass(
            "bg-yellow-100",
        );
        expect(scrollIntoView).toHaveBeenCalledWith({
            block: "center",
            behavior: "smooth",
        });
    });

    it("stores parentReplyId when replying to an existing reply", async () => {
        renderPanel();

        await waitFor(() => {
            expect(screen.getByText("First reply")).toBeInTheDocument();
        });

        const replyButtons = screen.getAllByText("Reply");
        fireEvent.click(replyButtons[1]);
        fireEvent.change(screen.getByLabelText("Add a reply..."), {
            target: { value: "Replying to a reply" },
        });
        fireEvent.click(screen.getByText("Post Reply"));

        await waitFor(() => {
            expect(screen.getByText("Replying to a reply")).toBeInTheDocument();
        });
        expect(payloads[payloads.length - 1].variables).toEqual(
            expect.objectContaining({
                commentId: "comment-1",
                parentReplyId: "reply-1",
            }),
        );
    });
});
