import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import Discussions from "../discussions";

const mockToast = jest.fn();
const mockExec = jest.fn();
const mockSetPayload = jest.fn();

jest.mock("@/hooks/use-graphql-fetch", () => ({
    useGraphQLFetch: () => ({
        setPayload: mockSetPayload,
    }),
}));

jest.mock("@courselit/components-library", () => ({
    useToast: () => ({
        toast: mockToast,
    }),
}));

jest.mock("next/link", () => ({
    __esModule: true,
    default: ({
        children,
        href,
        ...props
    }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
        href: string;
    }) => (
        <a href={href} {...props}>
            {children}
        </a>
    ),
}));

jest.mock("lucide-react", () => ({
    ArrowRight: () => <span />,
    MessageSquare: () => <span />,
}));

describe("Course manage discussions", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockSetPayload.mockImplementation((payload) => ({
            build: () => ({
                exec: () => mockExec(payload),
            }),
        }));
        mockExec.mockResolvedValue({
            updateCourse: {
                courseId: "course-1",
                discussions: true,
                discussionCommunityId: "community-1",
            },
        });
    });

    it("renders the discussions toggle for course products", () => {
        render(
            <Discussions
                product={{
                    courseId: "course-1",
                    type: "course",
                    discussions: false,
                    discussionCommunityId: null,
                }}
            />,
        );

        expect(screen.getByText("Discussions")).toBeInTheDocument();
        expect(
            screen.getByText(
                "Enable lesson-specific discussions for this course",
            ),
        ).toBeInTheDocument();
        expect(screen.getByRole("switch")).toHaveAttribute(
            "aria-checked",
            "false",
        );
    });

    it("does not render for non-course products", () => {
        render(
            <Discussions
                product={{
                    courseId: "download-1",
                    type: "download",
                    discussions: false,
                }}
            />,
        );

        expect(screen.queryByText("Discussions")).not.toBeInTheDocument();
    });

    it("updates discussions and links to the course-linked community manage page", async () => {
        render(
            <Discussions
                product={{
                    courseId: "course-1",
                    type: "course",
                    discussions: false,
                    discussionCommunityId: null,
                }}
            />,
        );

        fireEvent.click(screen.getByRole("switch"));

        await waitFor(() => {
            expect(mockSetPayload).toHaveBeenCalledWith(
                expect.objectContaining({
                    variables: {
                        courseId: "course-1",
                        discussions: true,
                    },
                }),
            );
        });

        const manageLink = await screen.findByRole("link", {
            name: /manage discussions community/i,
        });
        expect(manageLink).toHaveAttribute(
            "href",
            "/dashboard/community/community-1/manage",
        );
    });
});
