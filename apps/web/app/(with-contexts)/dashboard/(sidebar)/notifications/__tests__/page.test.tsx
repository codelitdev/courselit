import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import NotificationsPage from "../page";
import { AddressContext, ProfileContext } from "@components/contexts";
import { FetchBuilder } from "@courselit/utils";
import { Constants } from "@courselit/common-models";

const mockToast = jest.fn();
const mockExec = jest.fn();

jest.mock("@components/admin/dashboard-content", () => ({
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => (
        <div>{children}</div>
    ),
}));

jest.mock("@courselit/components-library", () => ({
    Checkbox: ({
        checked,
        disabled,
        onChange,
    }: {
        checked: boolean;
        disabled?: boolean;
        onChange: (value: boolean) => void;
    }) => (
        <input
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={(event) => onChange(event.target.checked)}
        />
    ),
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

function renderPage(permissions: string[]) {
    return render(
        <AddressContext.Provider
            value={{ backend: "http://localhost:3000", frontend: "" }}
        >
            <ProfileContext.Provider
                value={{
                    profile: {
                        permissions,
                    },
                    setProfile: jest.fn(),
                }}
            >
                <NotificationsPage />
            </ProfileContext.Provider>
        </AddressContext.Provider>,
    );
}

describe("Notifications Page", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockExec.mockResolvedValue({
            preferences: [],
        });
    });

    it("renders general notification rows from permissions even when DB has no rows", async () => {
        renderPage([]);

        await waitFor(() => {
            expect(
                screen.getByText("Community Post Created"),
            ).toBeInTheDocument();
        });

        expect(
            screen.getByText("Community Membership Granted"),
        ).toBeInTheDocument();
        expect(
            screen.queryByText(
                "No notification preferences are available for your account.",
            ),
        ).not.toBeInTheDocument();
    });

    it("renders non-general activity rows only when user has required permissions", async () => {
        renderPage([
            Constants.ActivityPermissionMap[Constants.ActivityType.PURCHASED],
        ]);

        await waitFor(() => {
            expect(screen.getByText("Purchased")).toBeInTheDocument();
        });

        expect(screen.getByText("Community Post Created")).toBeInTheDocument();
        expect(FetchBuilder).toHaveBeenCalled();
    });
});
