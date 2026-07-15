import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Constants } from "@courselit/common-models";
import CommentSection from "../comment-section";
import { AddressContext, ProfileContext } from "@components/contexts";

const mockToast = jest.fn();
const mockExec = jest.fn();

jest.mock("@courselit/components-library", () => ({
    useToast: () => ({ toast: mockToast }),
    Link: ({ children }: any) => <a>{children}</a>,
}));

jest.mock("@courselit/utils", () => {
    const actual = jest.requireActual("@courselit/utils");
    return {
        ...actual,
        FetchBuilder: jest.fn().mockImplementation(() => ({
            setUrl: jest.fn().mockReturnThis(),
            setPayload: jest.fn().mockReturnThis(),
            setIsGraphQLEndpoint: jest.fn().mockReturnThis(),
            build: jest.fn().mockReturnValue({
                exec: (...args: any[]) => mockExec(...args),
            }),
        })),
    };
});

jest.mock("@/lib/hash-target", () => ({
    focusHashTarget: jest.fn(),
    scrollToHashTarget: jest.fn(() => false),
}));

jest.mock("../../ui/button", () => ({
    Button: ({ children, ...props }: any) => (
        <button {...props}>{children}</button>
    ),
}));

jest.mock("../../ui/textarea", () => ({
    Textarea: (props: any) => <textarea {...props} />,
}));

jest.mock("../../ui/avatar", () => ({
    Avatar: ({ children }: any) => <div>{children}</div>,
    AvatarFallback: ({ children }: any) => <div>{children}</div>,
    AvatarImage: (props: any) => <img {...props} alt={props.alt || "avatar"} />,
}));

jest.mock("../../ui/dropdown-menu", () => ({
    DropdownMenu: ({ children }: any) => <div>{children}</div>,
    DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
    DropdownMenuItem: ({ children, onClick }: any) => (
        <button type="button" onClick={onClick}>
            {children}
        </button>
    ),
    DropdownMenuTrigger: ({ children }: any) => <>{children}</>,
}));

jest.mock("../../ui/dialog", () => ({
    Dialog: ({ children }: any) => <div>{children}</div>,
    DialogContent: ({ children }: any) => <div>{children}</div>,
    DialogTitle: ({ children }: any) => <div>{children}</div>,
    DialogDescription: ({ children }: any) => <div>{children}</div>,
    DialogFooter: ({ children }: any) => <div>{children}</div>,
}));

jest.mock("../../ui/popover", () => ({
    Popover: ({ children }: any) => <div>{children}</div>,
    PopoverTrigger: ({ children }: any) => <>{children}</>,
    PopoverContent: ({ children }: any) => <div>{children}</div>,
}));

const profile = {
    userId: "user-1",
    name: "Test User",
    email: "test@example.com",
};

const membership = {
    status: Constants.MembershipStatus.ACTIVE,
    role: Constants.MembershipRole.POST,
    rejectionReason: undefined,
};

const baseComment = {
    communityId: "comm-1",
    postId: "post-1",
    commentId: "comment-1",
    content: "Hello comment",
    user: {
        userId: "author-1",
        name: "Author",
        avatar: {},
    },
    media: [],
    likesCount: 0,
    hasLiked: false,
    reactions: [] as any[],
    replies: [
        {
            replyId: "reply-1",
            content: "Hello reply",
            user: {
                userId: "author-2",
                name: "Replier",
                avatar: {},
            },
            updatedAt: new Date().toISOString(),
            likesCount: 0,
            hasLiked: false,
            reactions: [] as any[],
            deleted: false,
        },
    ],
    updatedAt: new Date().toISOString(),
    deleted: false,
};

function renderSection() {
    return render(
        <AddressContext.Provider value={{ backend: "http://localhost" } as any}>
            <ProfileContext.Provider value={{ profile } as any}>
                <CommentSection
                    communityId="comm-1"
                    postId="post-1"
                    membership={membership as any}
                    onPostUpdated={jest.fn()}
                />
            </ProfileContext.Provider>
        </AddressContext.Provider>,
    );
}

describe("CommentSection reactions", () => {
    beforeEach(() => {
        mockExec.mockReset();
        mockToast.mockReset();

        // loadPost, loadComments
        mockExec
            .mockResolvedValueOnce({
                post: { commentsCount: 1 },
            })
            .mockResolvedValueOnce({
                comments: [baseComment],
            });
    });

    it("optimistically shows a comment reaction pill when user reacts", async () => {
        mockExec.mockResolvedValueOnce({
            comment: {
                ...baseComment,
                reactions: [
                    {
                        emoji: "👍",
                        count: 1,
                        hasReacted: true,
                        reactors: [
                            {
                                userId: profile.userId,
                                name: profile.name,
                                avatar: {},
                            },
                        ],
                    },
                ],
            },
        });

        renderSection();

        await waitFor(() => {
            expect(screen.getByText("Hello comment")).toBeTruthy();
        });

        // Open picker on the comment (first add-reaction control)
        // Click via mocked popover emoji button for 👍
        // Emoji picker renders emoji buttons; click 👍 from the first picker set
        const thumbsButtons = screen.getAllByRole("button", { name: "👍" });
        fireEvent.click(thumbsButtons[0]);

        await waitFor(() => {
            // Optimistic or server: pill with count
            expect(screen.getByText("1")).toBeTruthy();
        });
    });

    it("optimistically shows a reply reaction when user reacts on a reply", async () => {
        mockExec.mockResolvedValueOnce({
            comment: {
                ...baseComment,
                replies: [
                    {
                        ...baseComment.replies[0],
                        reactions: [
                            {
                                emoji: "❤️",
                                count: 1,
                                hasReacted: true,
                                reactors: [
                                    {
                                        userId: profile.userId,
                                        name: profile.name,
                                        avatar: {},
                                    },
                                ],
                            },
                        ],
                        likesCount: 1,
                        hasLiked: true,
                    },
                ],
            },
        });

        renderSection();

        await waitFor(() => {
            expect(screen.getByText("Hello reply")).toBeTruthy();
        });

        // Heart emoji buttons from pickers on comment + reply
        const heartButtons = screen.getAllByRole("button", { name: "❤️" });
        // Last picker set is under the reply bar
        fireEvent.click(heartButtons[heartButtons.length - 1]);

        await waitFor(() => {
            expect(screen.getByText("1")).toBeTruthy();
        });
    });
});
