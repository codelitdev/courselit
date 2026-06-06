import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import CourseDiscussionsPage from "../page";
import { AddressContext, ThemeContext } from "@components/contexts";
import { FetchBuilder } from "@courselit/utils";

const mockExec = jest.fn();
const payloads: Record<string, any>[] = [];

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

jest.mock("@components/contexts", () => {
    const React = require("react");
    return {
        AddressContext: React.createContext({
            backend: "",
            frontend: "",
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
    Header1: ({ children }: any) => <h1>{children}</h1>,
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

function renderPage() {
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
            <ThemeContext.Provider value={{ theme: {} } as any}>
                <React.Suspense fallback={<div>Loading</div>}>
                    <CourseDiscussionsPage params={params} />
                </React.Suspense>
            </ThemeContext.Provider>
        </AddressContext.Provider>,
    );
}

describe("CourseDiscussionsPage", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        payloads.length = 0;
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

        expect(FetchBuilder).toHaveBeenCalled();
        expect(payloads[0].variables).toEqual({
            productId: "course-1",
            cursor: undefined,
        });
        expect(screen.getByText("3")).toBeInTheDocument();
        expect(screen.getByText("Text lesson").closest("a")).toHaveAttribute(
            "href",
            "/course/course-slug/course-1/lesson-1?discussion=open",
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
        });
    });
});
