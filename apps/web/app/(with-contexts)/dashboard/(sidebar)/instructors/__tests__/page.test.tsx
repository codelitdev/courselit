import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import InstructorsPage from "../page";

const mockToast = jest.fn();
const mockExec = jest.fn();
const mockSetPayload = jest.fn();
const mockReload = jest.fn();
let mockInstructors: any[] = [];
let mockLoaded = true;

jest.mock("next/link", () => ({
    __esModule: true,
    default: ({ children, href, ...props }: any) => (
        <a href={href} {...props}>
            {children}
        </a>
    ),
}));
jest.mock("@courselit/components-library", () => ({
    useToast: () => ({ toast: mockToast }),
}));
jest.mock("@/hooks/use-graphql-fetch", () => ({
    useGraphQLFetch: () => ({
        setPayload: mockSetPayload.mockReturnThis(),
        build: jest.fn().mockReturnThis(),
        exec: mockExec,
    }),
}));
jest.mock("@/hooks/use-instructors", () => ({
    __esModule: true,
    default: () => ({
        instructors: mockInstructors,
        loaded: mockLoaded,
        error: null,
        reload: mockReload,
    }),
}));
jest.mock("@components/admin/dashboard-content", () => ({
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe("Instructors page", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockLoaded = true;
        mockInstructors = [
            {
                instructorId: "ann",
                name: "Ann Ada",
                bio: "Teaches the basics",
                links: [{ label: "Site", url: "https://ann.example.com" }],
            },
            { instructorId: "bob", name: "Bob Hopper", links: [] },
        ];
        mockExec.mockResolvedValue({ deleted: true });
    });

    it("lists the instructors with links to edit them", () => {
        render(<InstructorsPage />);

        expect(screen.getByText("Ann Ada")).toBeInTheDocument();
        expect(screen.getByText("Teaches the basics")).toBeInTheDocument();
        expect(screen.getByText("Bob Hopper")).toBeInTheDocument();
        expect(
            screen.getByRole("link", { name: "Edit Ann Ada" }),
        ).toHaveAttribute("href", "/dashboard/instructors/ann");
        expect(
            screen.getByRole("link", { name: "New instructor" }),
        ).toHaveAttribute("href", "/dashboard/instructors/new");
    });

    it("shows an empty state when there are none", () => {
        mockInstructors = [];
        render(<InstructorsPage />);

        expect(screen.getByText("No instructors yet")).toBeInTheDocument();
    });

    it("shows nothing but the heading while loading", () => {
        mockInstructors = [];
        mockLoaded = false;
        render(<InstructorsPage />);

        expect(screen.queryByText("No instructors yet")).toBeNull();
    });

    it("deletes an instructor after confirmation and reloads the list", async () => {
        render(<InstructorsPage />);

        fireEvent.click(screen.getByRole("button", { name: "Delete Ann Ada" }));
        expect(
            screen.getByText(
                "This removes the instructor from every product and section they are assigned to.",
            ),
        ).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Delete" }));

        await waitFor(() => {
            expect(mockSetPayload).toHaveBeenCalledWith(
                expect.objectContaining({
                    variables: { instructorId: "ann" },
                }),
            );
        });
        await waitFor(() => expect(mockReload).toHaveBeenCalled());
        expect(mockToast).toHaveBeenCalledWith(
            expect.objectContaining({ title: "Success" }),
        );
    });

    it("keeps the instructor and reports the error when deleting fails", async () => {
        mockExec.mockRejectedValue(new Error("Not allowed"));
        render(<InstructorsPage />);

        fireEvent.click(
            screen.getByRole("button", { name: "Delete Bob Hopper" }),
        );
        fireEvent.click(screen.getByRole("button", { name: "Delete" }));

        await waitFor(() =>
            expect(mockToast).toHaveBeenCalledWith(
                expect.objectContaining({
                    variant: "destructive",
                    description: "Not allowed",
                }),
            ),
        );
        expect(mockReload).not.toHaveBeenCalled();
    });
});
