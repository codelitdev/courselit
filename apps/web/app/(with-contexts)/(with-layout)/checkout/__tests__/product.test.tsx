import { render, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

const payloads: any[] = [];
const mockExec = jest.fn();

jest.mock("@components/contexts", () => {
    const React = require("react");

    return {
        AddressContext: React.createContext({
            backend: "http://localhost:3000",
            frontend: "http://localhost:3000",
        }),
        ThemeContext: React.createContext({
            theme: {
                id: "test",
                name: "Test",
                theme: {},
            },
            setTheme: jest.fn(),
        }),
    };
});

jest.mock("@components/public/payments/checkout", () => ({
    __esModule: true,
    default: ({ product }: { product: { name: string } }) => (
        <div>{product.name}</div>
    ),
}));

jest.mock("@courselit/components-library", () => ({
    useToast: () => ({
        toast: jest.fn(),
    }),
}));

jest.mock("@courselit/page-primitives", () => ({
    Header1: ({ children }: { children: ReactNode }) => <h1>{children}</h1>,
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

jest.mock("next/navigation", () => ({
    notFound: jest.fn(),
    useSearchParams: () => new URLSearchParams("type=course&id=course-1"),
}));

import ProductCheckout from "../product";

describe("ProductCheckout", () => {
    beforeEach(() => {
        payloads.length = 0;
        jest.clearAllMocks();
    });

    it("uses public course visibility and shows 404 when checkout course is unavailable", async () => {
        const { notFound } = jest.requireMock("next/navigation");
        mockExec.mockResolvedValueOnce({
            course: null,
            loginProviders: [],
        });

        render(<ProductCheckout />);

        await waitFor(() => {
            expect(payloads[0].query).toContain(
                "course: getCourse(id: $id, asGuest: true)",
            );
        });

        await waitFor(() => {
            expect(notFound).toHaveBeenCalled();
        });
    });
});
