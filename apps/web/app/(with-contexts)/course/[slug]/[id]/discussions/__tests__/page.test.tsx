import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import CourseDiscussionsPage from "../page";
import {
    AddressContext,
    ProfileContext,
    ThemeContext,
} from "@components/contexts";
import { FetchBuilder } from "@courselit/utils";
import { getProduct } from "../../helpers";

const mockExec = jest.fn();
const payloads: Record<string, any>[] = [];
const mockRouterReplace = jest.fn();

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

const mockSearchParams = jest.fn(() => new URLSearchParams());

jest.mock("next/navigation", () => ({
    useSearchParams: () => mockSearchParams(),
    useRouter: () => ({
        replace: mockRouterReplace,
    }),
}));

jest.mock("@components/contexts", () => {
    const React = require("react");
    return {
        AddressContext: React.createContext({
            backend: "",
            frontend: "",
        }),
        ProfileContext: React.createContext({
            profile: {
                userId: "learner-1",
            },
        }),
        ThemeContext: React.createContext({
            theme: {},
        }),
    };
});

jest.mock("../../helpers", () => ({
    getProduct: jest.fn().mockResolvedValue({
        title: "Course with discussions",
        groups: [
            {
                lessons: [
                    {
                        lessonId: "lesson-1",
                        title: "Text lesson",
                    },
                    {
                        lessonId: "lesson-2",
                        title: "Video lesson",
                    },
                ],
            },
        ],
    }),
}));

jest.mock("@courselit/page-primitives", () => ({
    Button: ({ children, disabled, onClick }: any) => (
        <button disabled={disabled} onClick={onClick}>
            {children}
        </button>
    ),
    Header1: ({ children, className }: any) => (
        <h1 className={className}>{children}</h1>
    ),
    PageCard: ({ children }: any) => <div>{children}</div>,
    PageCardContent: ({ children }: any) => <div>{children}</div>,
    Text1: ({ children }: any) => <div>{children}</div>,
    Text2: ({ children }: any) => <span>{children}</span>,
}));

jest.mock("lucide-react", () => ({
    BookOpen: () => null,
    MessageSquare: () => null,
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

function renderPage(
    profile: Record<string, unknown> | null = {
        userId: "learner-1",
        purchases: [{ courseId: "course-1" }],
    },
) {
    const params = Promise.resolve({
        slug: "course-slug",
        id: "course-1",
    }) as any;
    params.status = "fulfilled";
    params.value = {
        slug: "course-slug",
        id: "course-1",
    };

    return render(
        <AddressContext.Provider
            value={{ backend: "http://localhost:3000", frontend: "" }}
        >
            <ProfileContext.Provider value={{ profile } as any}>
                <ThemeContext.Provider value={{ theme: {} } as any}>
                    <React.Suspense fallback={<div>Loading</div>}>
                        <CourseDiscussionsPage params={params} />
                    </React.Suspense>
                </ThemeContext.Provider>
            </ProfileContext.Provider>
        </AddressContext.Provider>,
    );
}

describe("CourseDiscussionsPage", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        payloads.length = 0;
        mockSearchParams.mockReturnValue(new URLSearchParams());
        (getProduct as jest.Mock).mockResolvedValue({
            title: "Course with discussions",
            groups: [
                {
                    lessons: [
                        {
                            lessonId: "lesson-1",
                            title: "Text lesson",
                        },
                        {
                            lessonId: "lesson-2",
                            title: "Video lesson",
                        },
                    ],
                },
            ],
        });
        mockExec.mockImplementation(() => {
            const payload = payloads[payloads.length - 1];
            if (payload.variables?.cursor) {
                return Promise.resolve({
                    summaries: {
                        items: [
                            {
                                entityId: "lesson-2",
                                totalCount: 1,
                                commentsCount: 1,
                                repliesCount: 0,
                                lastActivityAt: "2026-06-02T00:00:00.000Z",
                            },
                        ],
                        nextCursor: undefined,
                        hasMore: false,
                    },
                });
            }

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
                    nextCursor: "summary-cursor",
                    hasMore: true,
                },
            });
        });
    });

    it("lists lesson discussion summaries and links to the lesson with the panel open", async () => {
        renderPage();

        await waitFor(() => {
            expect(screen.getByText("Text lesson")).toBeInTheDocument();
        });

        expect(
            screen.getByRole("heading", { name: "Discussions" }),
        ).toHaveClass("max-w-full", "break-all");
        expect(FetchBuilder).toHaveBeenCalled();
        expect(getProduct).toHaveBeenCalledWith(
            "course-1",
            "http://localhost:3000",
            false,
        );
        expect(payloads[0].variables).toEqual({
            productId: "course-1",
            cursor: undefined,
            preview: false,
            limit: 20,
        });
        expect(screen.getByText("3")).toBeInTheDocument();
        expect(screen.getByText("Text lesson").closest("a")).toHaveAttribute(
            "href",
            "/course/course-slug/course-1/lesson-1?discussion=open",
        );
    });

    it("preserves course viewer preview session params while browsing discussions", async () => {
        (getProduct as jest.Mock).mockResolvedValueOnce({
            title: "Course with discussions",
            isPreview: true,
            groups: [
                {
                    lessons: [
                        {
                            lessonId: "lesson-1",
                            title: "Text lesson",
                        },
                    ],
                },
            ],
        });
        mockSearchParams.mockReturnValue(
            new URLSearchParams(
                "preview=true&returnTo=%2Fdashboard%2Fproduct%2Fcourse-1",
            ),
        );

        renderPage();

        await waitFor(() => {
            expect(screen.getByText("Text lesson")).toBeInTheDocument();
        });

        expect(getProduct).toHaveBeenCalledWith(
            "course-1",
            "http://localhost:3000",
            true,
        );
        expect(payloads[0].variables.preview).toBe(true);
        expect(
            screen.getByText("Course with discussions").closest("a"),
        ).toHaveAttribute(
            "href",
            "/course/course-slug/course-1?preview=true&returnTo=%2Fdashboard%2Fproduct%2Fcourse-1",
        );
        expect(screen.getByText("Text lesson").closest("a")).toHaveAttribute(
            "href",
            "/course/course-slug/course-1/lesson-1?discussion=open&preview=true&returnTo=%2Fdashboard%2Fproduct%2Fcourse-1",
        );
    });

    it("paginates discussion summaries without showing zero-activity rows from the client", async () => {
        renderPage();

        await waitFor(() => {
            expect(screen.getByText("Text lesson")).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText("Load more"));

        await waitFor(() => {
            expect(screen.getByText("Video lesson")).toBeInTheDocument();
        });
        expect(payloads[payloads.length - 1].variables).toEqual({
            productId: "course-1",
            cursor: "summary-cursor",
            preview: false,
            limit: 20,
        });
    });

    it("does not fetch or render discussion summaries for guests", async () => {
        renderPage(null);

        await waitFor(() => {
            expect(mockRouterReplace).toHaveBeenCalledWith(
                "/course/course-slug/course-1",
            );
        });
        expect(getProduct).not.toHaveBeenCalled();
        expect(FetchBuilder).not.toHaveBeenCalled();
        expect(
            screen.queryByRole("heading", { name: "Discussions" }),
        ).not.toBeInTheDocument();
    });

    it("does not fetch or render discussion summaries for logged-in non-enrolled users", async () => {
        renderPage({
            userId: "learner-1",
            purchases: [],
        });

        await waitFor(() => {
            expect(mockRouterReplace).toHaveBeenCalledWith(
                "/course/course-slug/course-1",
            );
        });
        expect(getProduct).not.toHaveBeenCalled();
        expect(FetchBuilder).not.toHaveBeenCalled();
        expect(
            screen.queryByRole("heading", { name: "Discussions" }),
        ).not.toBeInTheDocument();
    });

    it("redirects logged-in non-enrolled users who manually add preview mode", async () => {
        mockSearchParams.mockReturnValue(new URLSearchParams("preview=true"));

        renderPage({
            userId: "learner-1",
            purchases: [],
        });

        await waitFor(() => {
            expect(getProduct).toHaveBeenCalledWith(
                "course-1",
                "http://localhost:3000",
                true,
            );
        });
        await waitFor(() => {
            expect(mockRouterReplace).toHaveBeenCalledWith(
                "/course/course-slug/course-1",
            );
        });
        expect(FetchBuilder).not.toHaveBeenCalled();
    });
});
