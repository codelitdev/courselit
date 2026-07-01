import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import ProductPage from "../page";
import {
    AddressContext,
    ProfileContext,
    SiteInfoContext,
    ThemeContext,
} from "@components/contexts";
import { getProduct } from "../helpers";
import { getUserProfile } from "@/app/(with-contexts)/helpers";

jest.mock("@components/contexts", () => {
    const React = require("react");
    return {
        AddressContext: React.createContext({
            backend: "",
            frontend: "",
        }),
        ProfileContext: React.createContext({
            profile: null,
            setProfile: undefined,
        }),
        SiteInfoContext: React.createContext({}),
        ThemeContext: React.createContext({
            theme: {},
        }),
    };
});

jest.mock("next/navigation", () => ({
    useSearchParams: () => new URLSearchParams(),
}));

jest.mock("next/link", () => {
    function MockLink({
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

    return MockLink;
});

jest.mock("../helpers", () => ({
    getProduct: jest.fn(),
}));

jest.mock("@/app/(with-contexts)/helpers", () => ({
    getUserProfile: jest.fn(),
}));

jest.mock("@courselit/components-library", () => ({
    Link: ({ children, href, className }: any) => (
        <a href={href} className={className}>
            {children}
        </a>
    ),
    getSymbolFromCurrency: () => "$",
    Image: () => null,
}));

jest.mock("@courselit/page-blocks", () => ({
    TextRenderer: () => null,
}));

jest.mock("@components/table-of-content", () => ({
    TableOfContent: () => null,
}));

jest.mock(
    "@components/public/base-layout/template/widget-error-boundary",
    () => {
        function WidgetErrorBoundary({
            children,
        }: {
            children: React.ReactNode;
        }) {
            return <>{children}</>;
        }

        return WidgetErrorBoundary;
    },
);

jest.mock("@courselit/page-primitives", () => ({
    Button: ({ children }: any) => <button>{children}</button>,
    Header1: ({ children }: any) => <h1>{children}</h1>,
}));

jest.mock("@courselit/icons", () => ({
    ArrowRight: () => null,
}));

jest.mock("lucide-react", () => ({
    BadgeCheck: () => null,
}));

jest.mock("@courselit/text-editor", () => ({
    emptyDoc: { type: "doc", content: [] },
}));

function getParams() {
    const params = Promise.resolve({
        slug: "course-slug",
        id: "course-1",
    }) as any;
    params.status = "fulfilled";
    params.value = {
        slug: "course-slug",
        id: "course-1",
    };
    return params;
}

function renderPage(profile?: Record<string, any>) {
    const setProfile = jest.fn();

    return render(
        <AddressContext.Provider
            value={{ backend: "http://localhost:3000", frontend: "" }}
        >
            <SiteInfoContext.Provider value={{ currencyISOCode: "USD" } as any}>
                <ProfileContext.Provider value={{ profile, setProfile } as any}>
                    <ThemeContext.Provider value={{ theme: {} } as any}>
                        <React.Suspense fallback={<div>Loading</div>}>
                            <ProductPage params={getParams()} />
                        </React.Suspense>
                    </ThemeContext.Provider>
                </ProfileContext.Provider>
            </SiteInfoContext.Provider>
        </AddressContext.Provider>,
    );
}

describe("Course introduction page", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (getProduct as jest.Mock).mockResolvedValue({
            title: "Course intro",
            description: JSON.stringify({ type: "doc", content: [] }),
            courseId: "course-1",
            slug: "course-slug",
            cost: 0,
            costType: "free",
            isPreview: false,
            firstLesson: "lesson-1",
        });
        (getUserProfile as jest.Mock).mockResolvedValue(undefined);
    });

    it("shows price and checkout CTA for anonymous viewers", async () => {
        renderPage();

        await waitFor(() => {
            expect(
                screen.getByRole("heading", { name: "Course intro" }),
            ).toBeInTheDocument();
        });

        expect(document.body).toHaveTextContent("$0");
        expect(screen.getByText("free")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Buy now" })).toHaveAttribute(
            "href",
            "/checkout?type=course&id=course-1",
        );
    });

    it("does not show price and checkout CTA for enrolled viewers", async () => {
        renderPage({
            userId: "learner-1",
            purchases: [{ courseId: "course-1" }],
            permissions: [],
        });

        await waitFor(() => {
            expect(
                screen.getByRole("heading", { name: "Course intro" }),
            ).toBeInTheDocument();
        });

        expect(
            screen.queryByRole("link", { name: "Buy now" }),
        ).not.toBeInTheDocument();
    });
});
