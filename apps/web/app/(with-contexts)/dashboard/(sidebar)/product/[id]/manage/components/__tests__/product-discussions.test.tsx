import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ProductDiscussions from "../product-discussions";

const mockToast = jest.fn();
const mockExec = jest.fn();
const mockSetPayload = jest.fn();

jest.mock("@courselit/components-library", () => ({
    useToast: () => ({
        toast: mockToast,
    }),
    Chip: ({ children }: { children: React.ReactNode }) => (
        <span>{children}</span>
    ),
}));

jest.mock("@/hooks/use-graphql-fetch", () => ({
    useGraphQLFetch: () => ({
        setPayload: mockSetPayload.mockReturnThis(),
        build: jest.fn().mockReturnThis(),
        exec: mockExec,
    }),
}));

jest.mock("@/components/ui/label", () => ({
    Label: ({ children }: { children: React.ReactNode }) => (
        <label>{children}</label>
    ),
}));

jest.mock("@/components/ui/separator", () => ({
    Separator: () => <hr />,
}));

jest.mock("@/components/ui/switch", () => ({
    Switch: ({ checked, disabled, onCheckedChange }: any) => (
        <input
            aria-label="discussions-switch"
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={() => onCheckedChange(!checked)}
        />
    ),
}));

describe("ProductDiscussions", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockExec.mockResolvedValue({
            updateCourse: {
                courseId: "course-1",
                discussions: true,
            },
        });
    });

    it("renders and saves the discussion toggle for course products", async () => {
        render(
            <ProductDiscussions
                product={{
                    courseId: "course-1",
                    type: "course",
                    discussions: false,
                }}
            />,
        );

        fireEvent.click(screen.getByLabelText("discussions-switch"));

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
        expect(mockToast).toHaveBeenCalledWith(
            expect.objectContaining({
                title: "Success",
            }),
        );
    });

    it("does not render for non-course products", () => {
        render(
            <ProductDiscussions
                product={{
                    courseId: "blog-1",
                    type: "blog",
                    discussions: false,
                }}
            />,
        );

        expect(
            screen.queryByLabelText("discussions-switch"),
        ).not.toBeInTheDocument();
    });
});
