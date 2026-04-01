import React from "react";
import { render, screen } from "@testing-library/react";
import NewMailPage from "../page";
import {
    BUTTON_CANCEL_TEXT,
    PAGE_HEADER_CHOOSE_TEMPLATE,
    PAGE_HEADER_EDIT_SEQUENCE,
    SEQUENCES,
    TEMPLATES,
} from "@ui-config/strings";

const mockDashboardContent = jest.fn(
    ({
        children,
        breadcrumbs,
    }: {
        children: React.ReactNode;
        breadcrumbs?: { label: string; href: string }[];
    }) => (
        <div>
            <div data-testid="breadcrumbs-json">
                {JSON.stringify(breadcrumbs || [])}
            </div>
            {children}
        </div>
    ),
);

jest.mock("@components/admin/dashboard-content", () => ({
    __esModule: true,
    default: (props: {
        children: React.ReactNode;
        breadcrumbs?: { label: string; href: string }[];
    }) => mockDashboardContent(props),
}));

jest.mock("next/link", () => ({
    __esModule: true,
    default: ({
        children,
        href,
    }: {
        children: React.ReactNode;
        href: string;
    }) => <a href={href}>{children}</a>,
}));

jest.mock(
    "@/components/ui/button",
    () => ({
        Button: ({
            children,
            ...props
        }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
            <button {...props}>{children}</button>
        ),
    }),
    { virtual: true },
);

jest.mock("../new-mail-page-client", () => ({
    __esModule: true,
    default: () => <div data-testid="new-mail-page-client" />,
}));

describe("NewMailPage", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("renders sequence breadcrumbs and cancel link for add-to-sequence flow", async () => {
        const element = await NewMailPage({
            searchParams: Promise.resolve({
                type: "sequence",
                mode: "add-to-sequence",
                sequenceId: "sequence-123",
                source: "sequences",
            }),
        });

        render(element);

        expect(
            screen.getByRole("heading", { name: PAGE_HEADER_CHOOSE_TEMPLATE }),
        ).toBeInTheDocument();
        expect(screen.getByTestId("new-mail-page-client")).toBeInTheDocument();

        expect(screen.getByTestId("breadcrumbs-json")).toHaveTextContent(
            JSON.stringify([
                { label: SEQUENCES, href: `/dashboard/mails?tab=${SEQUENCES}` },
                {
                    label: PAGE_HEADER_EDIT_SEQUENCE,
                    href: "/dashboard/mails/sequence/sequence-123",
                },
                { label: PAGE_HEADER_CHOOSE_TEMPLATE, href: "#" },
            ]),
        );

        expect(
            screen.getByRole("link", { name: BUTTON_CANCEL_TEXT }),
        ).toHaveAttribute("href", "/dashboard/mails/sequence/sequence-123");
    });

    it("renders template breadcrumbs and cancel link for template flow", async () => {
        const element = await NewMailPage({
            searchParams: Promise.resolve({
                type: "template",
                source: "templates",
            }),
        });

        render(element);

        expect(screen.getByTestId("breadcrumbs-json")).toHaveTextContent(
            JSON.stringify([
                { label: TEMPLATES, href: `/dashboard/mails?tab=${TEMPLATES}` },
                { label: PAGE_HEADER_CHOOSE_TEMPLATE, href: "#" },
            ]),
        );

        expect(
            screen.getByRole("link", { name: BUTTON_CANCEL_TEXT }),
        ).toHaveAttribute("href", `/dashboard/mails?tab=${TEMPLATES}`);
    });
});
