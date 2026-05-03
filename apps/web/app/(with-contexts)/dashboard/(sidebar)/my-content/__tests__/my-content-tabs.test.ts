import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import MyContentTabs from "../my-content-tabs";
import { AddressContext } from "@components/contexts";

const mockExec = jest.fn();
const mockReplace = jest.fn();
const mockUsePathname = jest.fn();

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

jest.mock("next/navigation", () => ({
    useRouter: () => ({
        replace: mockReplace,
    }),
    usePathname: () => mockUsePathname(),
}));

jest.mock("@courselit/components-library", () => ({
    Tabbs: (props) => {
        const React = require("react");

        return React.createElement(
            "div",
            null,
            React.createElement(
                "div",
                { "data-testid": "active-tab" },
                props.value,
            ),
            ...props.items.map((item) =>
                React.createElement("div", { key: item }, item),
            ),
        );
    },
}));

const tabs = [
    {
        label: "Feed",
        href: "/dashboard/my-content/feed",
    },
    {
        label: "Products",
        href: "/dashboard/my-content/products",
    },
];

function renderTabs() {
    return render(
        React.createElement(
            AddressContext.Provider,
            {
                value: {
                    backend: "http://localhost:3000",
                    frontend: "",
                },
            },
            React.createElement(MyContentTabs, {
                tabs,
                ariaLabel: "My content",
            }),
        ),
    );
}

describe("MyContentTabs", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockUsePathname.mockReturnValue("/dashboard/my-content/products");
    });

    it("hides the feed tab when the tenant has no enabled communities", async () => {
        mockExec.mockResolvedValue({
            enabledCommunitiesCount: 0,
        });

        renderTabs();

        await waitFor(() => {
            expect(screen.queryByText("Feed")).not.toBeInTheDocument();
        });

        expect(screen.getByTestId("active-tab")).toHaveTextContent("Products");
        expect(mockReplace).not.toHaveBeenCalled();
    });
});
