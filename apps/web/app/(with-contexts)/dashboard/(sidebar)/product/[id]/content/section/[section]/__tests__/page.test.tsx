import React, { Suspense } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import SectionPage from "../page";

const mockSetPayload = jest.fn();
const mockExec = jest.fn();

jest.mock("next/navigation", () => ({
    useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));
jest.mock("next/link", () => ({
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockProduct = {
    courseId: "course-1",
    title: "Test course",
    type: "course",
    groups: [
        {
            id: "section-1",
            name: "Basics",
            rank: 1000,
            instructors: [{ instructorId: "ann" }],
        },
    ],
};
jest.mock("@/hooks/use-product", () => ({
    __esModule: true,
    default: () => ({ product: mockProduct, loaded: true }),
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
jest.mock("@courselit/utils", () => ({
    FetchBuilder: jest.fn().mockImplementation(() => ({
        setUrl: jest.fn().mockReturnThis(),
        setPayload: mockSetPayload.mockReturnThis(),
        setIsGraphQLEndpoint: jest.fn().mockReturnThis(),
        build: jest.fn().mockReturnThis(),
        exec: mockExec,
    })),
}));
jest.mock("@courselit/components-library", () => ({
    useToast: () => ({ toast: jest.fn() }),
    Form: ({ children, onSubmit }: any) => (
        <form onSubmit={onSubmit}>{children}</form>
    ),
}));
jest.mock("@courselit/email-editor", () => ({ defaultEmail: {} }));
jest.mock("@components/admin/dashboard-content", () => ({
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock("@components/admin/mails/email-viewer", () => ({
    __esModule: true,
    default: () => null,
}));
jest.mock("@components/resources", () => ({
    __esModule: true,
    default: () => null,
}));
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
jest.mock("@/components/ui/switch", () => ({
    Switch: ({ checked, onCheckedChange }: any) => (
        <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onCheckedChange(e.target.checked)}
        />
    ),
}));
jest.mock("@/components/ui/tooltip", () => ({
    Tooltip: ({ children }: any) => <>{children}</>,
    TooltipContent: () => null,
    TooltipProvider: ({ children }: any) => <>{children}</>,
    TooltipTrigger: ({ children }: any) => <>{children}</>,
}));

const renderPage = async () => {
    await act(async () => {
        render(
            <Suspense fallback={null}>
                <SectionPage
                    params={Promise.resolve({
                        id: "course-1",
                        section: "section-1",
                    })}
                />
            </Suspense>,
        );
    });
};

describe("Section page instructors", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockExec.mockResolvedValue({
            course: {
                courseId: "course-1",
                groups: [{ id: "section-1", drip: null }],
            },
        });
    });

    it("shows the section's instructors and sends the edited list with the save", async () => {
        await renderPage();

        expect(screen.getByTestId("selected-instructor")).toHaveTextContent(
            "Ann Ada",
        );

        fireEvent.change(screen.getByLabelText("add-instructor"), {
            target: { value: "bob" },
        });
        await act(async () => {
            fireEvent.click(
                screen.getByRole("button", { name: "Save changes" }),
            );
        });

        const payload = mockSetPayload.mock.calls.at(-1)?.[0];
        expect(payload.variables).toEqual(
            expect.objectContaining({
                id: "section-1",
                courseId: "course-1",
                instructors: ["ann", "bob"],
            }),
        );
        expect(payload.query).toContain("$instructors: [String!]");
    });
});
