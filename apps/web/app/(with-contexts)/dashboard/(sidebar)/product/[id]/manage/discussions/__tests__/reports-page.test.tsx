import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ProductDiscussionReportsPage from "../reports/page";
import { AddressContext } from "@components/contexts";

const mockToast = jest.fn();
const mockExec = jest.fn();
const payloads: Record<string, any>[] = [];

jest.mock("next/navigation", () => ({
    useParams: () => ({
        id: "product-1",
    }),
}));

jest.mock("next/link", () => {
    const MockLink = ({ children, href, className }: any) => (
        <a href={href} className={className}>
            {children}
        </a>
    );
    MockLink.displayName = "MockLink";
    return MockLink;
});

jest.mock("@/hooks/use-product", () => ({
    __esModule: true,
    default: () => ({
        product: {
            title: "Course with reports",
            slug: "course-with-reports",
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
    PaginatedTable: ({ children, page, totalPages, onPageChange }: any) => (
        <div>
            {children}
            {totalPages > 0 && (
                <div>
                    <button
                        disabled={page === 1}
                        onClick={() => onPageChange(page - 1)}
                    >
                        Previous
                    </button>
                    <span>
                        {page} of {totalPages}
                    </span>
                    <button
                        disabled={page === totalPages}
                        onClick={() => onPageChange(page + 1)}
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    ),
    useToast: () => ({
        toast: mockToast,
    }),
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
    TableHead: ({ children, className }: any) => (
        <th className={className}>{children}</th>
    ),
    TableHeader: ({ children }: any) => <thead>{children}</thead>,
    TableRow: ({ children }: any) => <tr>{children}</tr>,
}));

jest.mock("@/components/ui/badge", () => ({
    Badge: ({ children }: any) => <span>{children}</span>,
}));

jest.mock("@/components/ui/select", () => ({
    Select: ({ children, value, onValueChange }: any) => (
        <div data-testid="mock-select">
            {React.Children.map(children, (child) =>
                React.isValidElement(child)
                    ? React.cloneElement(child as React.ReactElement<any>, {
                          onValueChange,
                          value,
                      })
                    : child,
            )}
        </div>
    ),
    SelectTrigger: ({ children }: any) => <div>{children}</div>,
    SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
    SelectContent: ({ children, onValueChange }: any) => (
        <div>
            {React.Children.map(children, (child) =>
                React.isValidElement(child)
                    ? React.cloneElement(child as React.ReactElement<any>, {
                          onValueChange,
                      })
                    : child,
            )}
        </div>
    ),
    SelectItem: ({ children, value, onValueChange }: any) => (
        <button onClick={() => onValueChange && onValueChange(value)}>
            {children}
        </button>
    ),
}));

function renderPage() {
    return render(
        <AddressContext.Provider
            value={{ backend: "http://localhost:3000", frontend: "" }}
        >
            <ProductDiscussionReportsPage />
        </AddressContext.Provider>,
    );
}

describe("ProductDiscussionReportsPage", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        payloads.length = 0;
        mockExec.mockImplementation(() => {
            const payload = payloads[payloads.length - 1];
            if (payload.query.includes("GetProductDiscussionReports")) {
                return Promise.resolve({
                    reports: {
                        items: [
                            {
                                reportId: "report-1",
                                contentType: "COMMENT",
                                contentId: "comment-1",
                                userId: "reporter-1",
                                reason: "Spam",
                                status: "accepted",
                                createdAt: "2026-06-01T00:00:00.000Z",
                                entityId: "lesson-1",
                                lessonTitle: "Text lesson",
                                contentPreview: "Reported content",
                                authorName: "Author One",
                                reporterName: "Reporter One",
                            },
                        ],
                    },
                    totalReports: 11,
                });
            }
            if (payload.query.includes("UpdateProductDiscussionReportStatus")) {
                return Promise.resolve({
                    report: {
                        reportId: "report-1",
                        status: "rejected",
                        rejectionReason: "Rejected by moderator",
                    },
                });
            }
            return Promise.resolve({});
        });
    });

    it("lists reported discussion content with accepted status label", async () => {
        renderPage();

        await waitFor(() => {
            expect(screen.getByText("Text lesson")).toBeInTheDocument();
        });

        expect(
            screen
                .getAllByRole("columnheader")
                .map((header) => header.textContent),
        ).toEqual([
            "Content",
            "Lesson",
            "Author",
            "Reported by",
            "Reason",
            "Status",
            "Date",
            "Actions",
        ]);
        expect(screen.getByText("Reported content")).toBeInTheDocument();
        expect(
            screen.getByText("Reported content").closest("a"),
        ).toHaveAttribute(
            "href",
            "/course/course-with-reports/product-1/lesson-1?discussion=open&preview=true&returnTo=%2Fdashboard%2Fproduct%2Fproduct-1%2Fmanage%2Fdiscussions%2Freports#discussion-comment-comment-1",
        );
        expect(screen.getByText("Author One")).toBeInTheDocument();
        expect(screen.getByText("Reporter One")).toBeInTheDocument();
        expect(screen.getByText("Spam")).toBeInTheDocument();
        expect(screen.getByText("ACCEPTED")).toBeInTheDocument();
        expect(screen.getByText("1 of 2")).toBeInTheDocument();
        expect(payloads[payloads.length - 1].variables).toEqual({
            productId: "product-1",
            status: undefined,
            page: 1,
            limit: 10,
        });
        expect(screen.queryByText("approved")).not.toBeInTheDocument();
    });

    it("links reply reports to the rendered reply target", async () => {
        mockExec.mockResolvedValueOnce({
            reports: {
                items: [
                    {
                        reportId: "report-reply-1",
                        contentType: "REPLY",
                        contentId: "reply-1",
                        userId: "reporter-1",
                        reason: "Spam",
                        status: "pending",
                        createdAt: "2026-06-01T00:00:00.000Z",
                        entityId: "lesson-1",
                        lessonTitle: "Text lesson",
                        contentPreview: "Reported reply",
                        authorName: "Author One",
                        reporterName: "Reporter One",
                    },
                ],
            },
            totalReports: 1,
        });

        renderPage();

        await waitFor(() => {
            expect(screen.getByText("Reported reply")).toBeInTheDocument();
        });

        expect(screen.getByText("Reported reply").closest("a")).toHaveAttribute(
            "href",
            "/course/course-with-reports/product-1/lesson-1?discussion=open&preview=true&returnTo=%2Fdashboard%2Fproduct%2Fproduct-1%2Fmanage%2Fdiscussions%2Freports#discussion-reply-reply-1",
        );
    });

    it("loads the next numbered reports page", async () => {
        renderPage();

        await waitFor(() => {
            expect(screen.getByText("Text lesson")).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText("Next"));

        await waitFor(() => {
            expect(payloads[payloads.length - 1].variables).toEqual({
                productId: "product-1",
                status: undefined,
                page: 2,
                limit: 10,
            });
        });
    });

    it("filters reports by status and cycles accepted reports with a rejection reason", async () => {
        renderPage();

        await waitFor(() => {
            expect(screen.getByText("Text lesson")).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText("Accepted"));

        await waitFor(() => {
            expect(payloads[payloads.length - 1].variables.status).toBe(
                "ACCEPTED",
            );
        });

        fireEvent.click(screen.getByText("Change"));

        await waitFor(() => {
            expect(screen.getByText("Confirm")).toBeInTheDocument();
        });
        fireEvent.click(screen.getByText("Confirm"));

        await waitFor(() => {
            expect(payloads[payloads.length - 1].variables).toEqual({
                productId: "product-1",
                reportId: "report-1",
                rejectionReason: "Rejected by moderator",
            });
        });
        await waitFor(() => {
            expect(screen.getByText("REJECTED")).toBeInTheDocument();
        });
    });
});
