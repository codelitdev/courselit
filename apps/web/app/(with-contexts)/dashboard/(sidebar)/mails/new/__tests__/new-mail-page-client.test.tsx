import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import NewMailPageClient from "../new-mail-page-client";
import { AddressContext, SiteInfoContext } from "@components/contexts";
import {
    MAIL_TEMPLATE_CHOOSER_CUSTOM_SECTION,
    MAIL_TEMPLATE_CHOOSER_SYSTEM_SECTION,
    TEMPLATE_CHOOSER_CUSTOM_EMPTY_STATE_DESCRIPTION,
    TEMPLATE_CHOOSER_CUSTOM_EMPTY_STATE_TITLE,
} from "@ui-config/strings";

const mockToast = jest.fn();
const mockPush = jest.fn();
const mockExec = jest.fn();
const mockSearchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
    useRouter: () => ({
        push: mockPush,
    }),
    useSearchParams: () => ({
        get: (key: string) => mockSearchParams.get(key),
    }),
}));

jest.mock("@courselit/components-library", () => ({
    useToast: () => ({
        toast: mockToast,
    }),
}));

jest.mock("@courselit/utils", () => {
    const actual = jest.requireActual("@courselit/utils");
    return {
        ...actual,
        FetchBuilder: jest.fn().mockImplementation(() => ({
            setUrl: jest.fn().mockReturnThis(),
            setPayload: jest.fn().mockReturnThis(),
            setIsGraphQLEndpoint: jest.fn().mockReturnThis(),
            build: jest.fn().mockReturnThis(),
            exec: mockExec,
        })),
    };
});

jest.mock("../template-email-preview", () => ({
    __esModule: true,
    default: ({ content }: { content: any }) => (
        <div data-testid="template-email-preview">
            {content?.meta?.previewText || "email-preview"}
        </div>
    ),
}));

jest.mock("@components/admin/empty-state", () => ({
    __esModule: true,
    default: ({
        title,
        description,
    }: {
        title: string;
        description: string;
    }) => (
        <div>
            <div>{title}</div>
            <div>{description}</div>
        </div>
    ),
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

jest.mock(
    "@/components/ui/card",
    () => ({
        Card: ({
            children,
            onClick,
        }: {
            children: React.ReactNode;
            onClick?: () => void;
        }) => (
            <button onClick={onClick} type="button">
                {children}
            </button>
        ),
        CardContent: ({ children }: { children: React.ReactNode }) => (
            <div>{children}</div>
        ),
        CardHeader: ({ children }: { children: React.ReactNode }) => (
            <div>{children}</div>
        ),
        CardTitle: ({ children }: { children: React.ReactNode }) => (
            <div>{children}</div>
        ),
    }),
    { virtual: true },
);

jest.mock(
    "@/components/ui/skeleton",
    () => ({
        Skeleton: () => <div data-testid="skeleton" />,
    }),
    { virtual: true },
);

const systemTemplate = {
    templateId: "system-1",
    title: "Announcement",
    content: {
        content: [],
        style: {},
        meta: { previewText: "system-template-preview" },
    },
};

const customTemplate = {
    templateId: "custom-1",
    title: "Custom template",
    content: {
        content: [],
        style: {},
        meta: { previewText: "custom-template-preview" },
    },
};

function renderPage() {
    return render(
        <AddressContext.Provider
            value={{
                backend: "http://localhost:3000",
                frontend: "http://localhost:3000",
            }}
        >
            <SiteInfoContext.Provider
                value={{
                    title: "",
                    subtitle: "",
                    logo: {
                        file: "",
                        thumbnail: "",
                        caption: "",
                    },
                    currencyISOCode: "",
                    paymentMethod: "",
                    stripeKey: "",
                    codeInjectionHead: "",
                    codeInjectionBody: "",
                    mailingAddress: "",
                    hideCourseLitBranding: false,
                    razorpayKey: "",
                    lemonsqueezyStoreId: "",
                    lemonsqueezyOneTimeVariantId: "",
                    lemonsqueezySubscriptionMonthlyVariantId: "",
                    lemonsqueezySubscriptionYearlyVariantId: "",
                    logins: ["email"],
                }}
            >
                <NewMailPageClient />
            </SiteInfoContext.Provider>
        </AddressContext.Provider>,
    );
}

describe("NewMailPageClient", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockExec.mockReset();
        mockPush.mockReset();
        mockToast.mockReset();
        mockSearchParams.forEach((_, key) => mockSearchParams.delete(key));
    });

    it("loads and renders system and custom templates", async () => {
        mockSearchParams.set("type", "sequence");
        mockExec.mockResolvedValueOnce({
            systemTemplates: [systemTemplate],
            templates: [customTemplate],
        });

        renderPage();

        await waitFor(() => {
            expect(screen.getByText("Announcement")).toBeInTheDocument();
        });

        expect(screen.getByText("Custom template")).toBeInTheDocument();
        expect(
            screen.getByText(MAIL_TEMPLATE_CHOOSER_SYSTEM_SECTION),
        ).toBeInTheDocument();
    });

    it("creates a sequence from the selected template", async () => {
        mockSearchParams.set("type", "sequence");
        mockExec
            .mockResolvedValueOnce({
                systemTemplates: [systemTemplate],
                templates: [],
            })
            .mockResolvedValueOnce({
                sequence: {
                    sequenceId: "sequence-1",
                },
            });

        renderPage();

        await waitFor(() => {
            expect(
                screen.getByText(TEMPLATE_CHOOSER_CUSTOM_EMPTY_STATE_TITLE),
            ).toBeInTheDocument();
        });

        expect(
            screen.getByText(TEMPLATE_CHOOSER_CUSTOM_EMPTY_STATE_DESCRIPTION),
        ).toBeInTheDocument();
        expect(
            screen.getByText(MAIL_TEMPLATE_CHOOSER_CUSTOM_SECTION),
        ).toBeInTheDocument();

        fireEvent.click(screen.getByText(systemTemplate.title));

        await waitFor(() => {
            expect(mockPush).toHaveBeenCalledWith(
                "/dashboard/mails/sequence/sequence-1",
            );
        });
    });

    it("adds a selected template to an existing sequence", async () => {
        mockSearchParams.set("type", "sequence");
        mockSearchParams.set("mode", "add-to-sequence");
        mockSearchParams.set("sequenceId", "sequence-123");
        mockExec
            .mockResolvedValueOnce({
                systemTemplates: [systemTemplate],
                templates: [],
            })
            .mockResolvedValueOnce({
                sequence: {
                    sequenceId: "sequence-123",
                },
            });

        renderPage();

        await waitFor(() => {
            expect(
                screen.getByText(TEMPLATE_CHOOSER_CUSTOM_EMPTY_STATE_TITLE),
            ).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText(systemTemplate.title));

        await waitFor(() => {
            expect(mockPush).toHaveBeenCalledWith(
                "/dashboard/mails/sequence/sequence-123",
            );
        });
    });
});
