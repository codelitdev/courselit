import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ProductDiscussionsManagePage from "../page";
import DiscussionDetailPage from "../[entityId]/page";
import { AddressContext, ThemeContext } from "@components/contexts";

const mockToast = jest.fn();
const mockExec = jest.fn();
const payloads: Record<string, any>[] = [];

jest.mock("next/navigation", () => ({
    useParams: () => ({
        id: "product-1",
        entityId: "lesson-1",
    }),
}));

jest.mock("next/link", () => {
    function MockNextLink({
        children,
        href,
    }: {
        children: React.ReactNode;
        href: string;
    }) {
        return <a href={href}>{children}</a>;
    }

    return MockNextLink;
});

jest.mock("@/hooks/use-product", () => ({
    __esModule: true,
    default: () => ({
        product: {
            title: "Course with discussions",
        },
    }),
}));

jest.mock("@components/admin/dashboard-content", () => ({
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => (
        <div>{children}</div>
    ),
}));

jest.mock("@components/admin/empty-state", () => ({
    __esModule: true,
    default: ({ title }: { title: string }) => <div>{title}</div>,
}));

jest.mock("@courselit/components-library", () => ({
    useToast: () => ({
        toast: mockToast,
    }),
}));

jest.mock("@courselit/page-blocks", () => ({
    TextRenderer: ({ json }: { json: any }) => (
        <div>{json?.content?.[0]?.content?.[0]?.text}</div>
    ),
}));

jest.mock("@courselit/utils", () => ({
    truncate: (value: string) => value,
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

jest.mock("@courselit/text-editor", () => ({
    Editor: ({ placeholder }: any) => (
        <textarea placeholder={placeholder} data-testid="reply-editor" />
    ),
    emptyDoc: { type: "doc", content: [] },
}));

jest.mock("@ui-lib/utils", () => ({
    isTextEditorNonEmpty: (content: any) =>
        Boolean(content?.content?.length > 0),
    formattedLocaleDate: (date: string) => new Date(date).toLocaleDateString(),
}));

jest.mock("@/components/ui/button", () => ({
    Button: ({ children, disabled, onClick }: any) => (
        <button disabled={disabled} onClick={onClick}>
            {children}
        </button>
    ),
}));

jest.mock("@/components/ui/table", () => ({
    Table: ({ children }: any) => <table>{children}</table>,
    TableBody: ({ children }: any) => <tbody>{children}</tbody>,
    TableCell: ({ children, className }: any) => (
        <td className={className}>{children}</td>
    ),
    TableHead: ({ children }: any) => <th>{children}</th>,
    TableHeader: ({ children }: any) => <thead>{children}</thead>,
    TableRow: ({ children, onClick }: any) => (
        <tr onClick={onClick}>{children}</tr>
    ),
}));

jest.mock("@/components/ui/badge", () => ({
    Badge: ({ children }: any) => <span>{children}</span>,
}));

jest.mock("@/components/ui/card", () => ({
    Card: ({ children, className }: any) => (
        <div className={className}>{children}</div>
    ),
    CardHeader: ({ children, className, onClick }: any) => (
        <div className={className} onClick={onClick}>
            {children}
        </div>
    ),
    CardContent: ({ children, className }: any) => (
        <div className={className}>{children}</div>
    ),
}));

jest.mock("@/components/ui/collapsible", () => ({
    Collapsible: ({ children, open }: any) => (
        <div data-open={open}>{children}</div>
    ),
    CollapsibleTrigger: ({ children, asChild }: any) => {
        if (asChild && React.isValidElement(children)) {
            return children;
        }
        return <div>{children}</div>;
    },
    CollapsibleContent: ({ children }: any) => <div>{children}</div>,
}));

jest.mock("lucide-react", () => ({
    Flag: () => null,
    MessageSquare: () => null,
    ShieldAlert: () => null,
    ChevronDown: () => null,
    ChevronRight: () => null,
    ChevronLeft: () => null,
    Reply: () => null,
    X: () => null,
    FlagTriangleRight: () => null,
    ThumbsUp: () => null,
}));

jest.mock("../[entityId]/report-reason-dialog", () => ({
    ReportReasonDialog: ({ isOpen }: any) =>
        isOpen ? <div data-testid="report-dialog" /> : null,
}));

const doc = (text: string) => ({
    type: "doc",
    content: [
        {
            type: "paragraph",
            content: [{ type: "text", text }],
        },
    ],
});

function renderPage() {
    return render(
        <AddressContext.Provider
            value={{ backend: "http://localhost:3000", frontend: "" }}
        >
            <ThemeContext.Provider value={{ theme: {} } as any}>
                <ProductDiscussionsManagePage />
            </ThemeContext.Provider>
        </AddressContext.Provider>,
    );
}

function renderDetailPage() {
    return render(
        <AddressContext.Provider
            value={{ backend: "http://localhost:3000", frontend: "" }}
        >
            <ThemeContext.Provider value={{ theme: {} } as any}>
                <DiscussionDetailPage />
            </ThemeContext.Provider>
        </AddressContext.Provider>,
    );
}

describe("ProductDiscussionsManagePage", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        payloads.length = 0;
        mockExec.mockImplementation(() => {
            const payload = payloads[payloads.length - 1];
            if (payload.query.includes("GetAdminProductDiscussionSummaries")) {
                return Promise.resolve({
                    summaries: {
                        items: [
                            {
                                entityId: "lesson-1",
                                totalCount: 3,
                                commentsCount: 1,
                                repliesCount: 2,
                                lastActivityAt: "2026-06-01T00:00:00.000Z",
                            },
                        ],
                        nextCursor: undefined,
                        hasMore: false,
                    },
                });
            }
            if (payload.query.includes("GetAdminProductDiscussionComments")) {
                return Promise.resolve({
                    comments: {
                        items: [
                            {
                                commentId: "comment-1",
                                userId: "author-1",
                                content: doc("Root comment"),
                                deleted: false,
                                createdAt: "2026-06-01T00:00:00.000Z",
                                replyCount: 2,
                                replyNextCursor: "reply-cursor",
                                hasMoreReplies: true,
                                user: { name: "Author One" },
                                replies: [
                                    {
                                        commentId: "comment-1",
                                        replyId: "reply-1",
                                        userId: "author-2",
                                        content: doc("First reply"),
                                        deleted: true,
                                        createdAt: "2026-06-01T00:00:00.000Z",
                                        user: { name: "Author Two" },
                                    },
                                ],
                            },
                        ],
                        nextCursor: undefined,
                        hasMore: false,
                    },
                });
            }
            if (payload.query.includes("GetAdminProductDiscussionReplies")) {
                return Promise.resolve({
                    replies: {
                        items: [
                            {
                                commentId: "comment-1",
                                replyId: "reply-2",
                                userId: "author-3",
                                content: doc("Second reply"),
                                deleted: false,
                                createdAt: "2026-06-01T00:00:00.000Z",
                                user: { name: "Author Three" },
                            },
                        ],
                        nextCursor: undefined,
                        hasMore: false,
                    },
                });
            }
            return Promise.resolve({});
        });
    });

    it("browses discussion targets in the admin overview", async () => {
        renderPage();

        await waitFor(() => {
            expect(screen.getByText("lesson-1")).toBeInTheDocument();
        });
    });

    it("displays comment cards on the detail page", async () => {
        renderDetailPage();

        await waitFor(() => {
            expect(screen.getByText("Author One")).toBeInTheDocument();
        });
        expect(screen.getAllByText("Root comment").length).toBeGreaterThan(0);
    });

    it("paginates replies on the detail page when load more is clicked", async () => {
        renderDetailPage();

        await waitFor(() => {
            expect(screen.getByText("Author One")).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText("Load more"));

        await waitFor(() => {
            expect(screen.getByText("Second reply")).toBeInTheDocument();
        });
        expect(payloads[payloads.length - 1].variables).toEqual({
            commentId: "comment-1",
            cursor: "reply-cursor",
        });
    });

    it("links to the report queue from the admin overview", async () => {
        renderPage();

        await waitFor(() => {
            expect(screen.getByText("Reported content")).toBeInTheDocument();
        });
        expect(
            screen.getByText("Reported content").closest("a"),
        ).toHaveAttribute(
            "href",
            "/dashboard/product/product-1/manage/discussions/reports",
        );
    });
});
