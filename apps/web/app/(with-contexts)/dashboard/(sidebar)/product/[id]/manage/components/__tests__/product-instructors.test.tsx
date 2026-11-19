import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ProductInstructors from "../product-instructors";

const mockToast = jest.fn();
const mockExec = jest.fn();
const mockSetPayload = jest.fn();

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
        instructors: [
            { instructorId: "ann", name: "Ann Ada", links: [] },
            { instructorId: "bob", name: "Bob Hopper", links: [] },
        ],
        loaded: true,
        error: null,
        reload: jest.fn(),
    }),
}));

jest.mock("@/components/ui/label", () => ({
    Label: ({ children }: { children: React.ReactNode }) => (
        <label>{children}</label>
    ),
}));
jest.mock("@/components/ui/separator", () => ({ Separator: () => <hr /> }));
jest.mock("@/components/ui/select", () => ({
    Select: ({ children, onValueChange }: any) => (
        <select
            aria-label="add-instructor"
            value=""
            onChange={(e) => onValueChange(e.target.value)}
        >
            <option value="">choose</option>
            {children}
        </select>
    ),
    SelectTrigger: () => null,
    SelectValue: () => null,
    SelectContent: ({ children }: any) => <>{children}</>,
    SelectItem: ({ value, children }: any) => (
        <option value={value}>{children}</option>
    ),
}));

const course = (overrides = {}) => ({
    courseId: "course-1",
    type: "course",
    instructors: [{ instructorId: "ann" }],
    ...overrides,
});

describe("ProductInstructors", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockExec.mockResolvedValue({
            updateCourse: {
                courseId: "course-1",
                instructors: [{ instructorId: "ann" }, { instructorId: "bob" }],
            },
        });
    });

    it("shows the current instructors and saves a new assignment", async () => {
        render(<ProductInstructors product={course()} />);

        expect(screen.getByTestId("selected-instructor")).toHaveTextContent(
            "Ann Ada",
        );

        fireEvent.change(screen.getByLabelText("add-instructor"), {
            target: { value: "bob" },
        });

        await waitFor(() => {
            expect(mockSetPayload).toHaveBeenCalledWith(
                expect.objectContaining({
                    variables: {
                        courseId: "course-1",
                        instructors: ["ann", "bob"],
                    },
                }),
            );
        });
        expect(mockToast).toHaveBeenCalledWith(
            expect.objectContaining({ title: "Success" }),
        );
        expect(screen.getAllByTestId("selected-instructor")).toHaveLength(2);
    });

    it("goes back to the saved list and reports the error when saving fails", async () => {
        mockExec.mockRejectedValue(new Error("Invalid input"));
        render(<ProductInstructors product={course()} />);

        fireEvent.click(screen.getByRole("button", { name: "Remove Ann Ada" }));

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith(
                expect.objectContaining({
                    variant: "destructive",
                    description: "Invalid input",
                }),
            );
        });
        expect(screen.getAllByTestId("selected-instructor")).toHaveLength(1);
    });

    it("does not render for non-course products", () => {
        const { container } = render(
            <ProductInstructors product={course({ type: "blog" })} />,
        );

        expect(container).toBeEmptyDOMElement();
    });
});
