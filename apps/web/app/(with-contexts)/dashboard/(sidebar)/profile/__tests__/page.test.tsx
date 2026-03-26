import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import ProfilePage from "../page";
import { AddressContext, ProfileContext } from "@components/contexts";

const mockToast = jest.fn();
const mockExec = jest.fn();
const mockSetProfile = jest.fn();

jest.mock("@components/admin/dashboard-content", () => ({
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => (
        <div>{children}</div>
    ),
}));

jest.mock("@courselit/components-library", () => ({
    Avatar: ({ children }: { children: React.ReactNode }) => (
        <div>{children}</div>
    ),
    AvatarFallback: ({ children }: { children: React.ReactNode }) => (
        <div>{children}</div>
    ),
    AvatarImage: ({ src }: { src?: string }) => <img alt="" src={src} />,
    Checkbox: ({
        checked,
        onChange,
    }: {
        checked: boolean;
        onChange: (value: boolean) => void;
    }) => (
        <input
            type="checkbox"
            checked={checked}
            onChange={(event) => onChange(event.target.checked)}
        />
    ),
    Image: ({ alt, src }: { alt: string; src: string }) => (
        <img alt={alt} src={src} />
    ),
    MediaSelector: () => null,
    useToast: () => ({
        toast: mockToast,
    }),
}));

jest.mock("@components/ui/field", () => ({
    Field: ({ children }: { children: React.ReactNode }) => (
        <div>{children}</div>
    ),
    FieldContent: ({ children }: { children: React.ReactNode }) => (
        <div>{children}</div>
    ),
    FieldGroup: ({ children }: { children: React.ReactNode }) => (
        <div>{children}</div>
    ),
    FieldLabel: ({
        children,
        htmlFor,
    }: {
        children: React.ReactNode;
        htmlFor?: string;
    }) => <label htmlFor={htmlFor}>{children}</label>,
    FieldLegend: ({ children }: { children: React.ReactNode }) => (
        <legend>{children}</legend>
    ),
    FieldSet: ({ children }: { children: React.ReactNode }) => (
        <fieldset>{children}</fieldset>
    ),
}));

jest.mock("@components/ui/card", () => ({
    Card: ({ children }: { children: React.ReactNode }) => (
        <div>{children}</div>
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
}));

jest.mock("@components/ui/input", () => ({
    Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
        <input {...props} />
    ),
}));

jest.mock("@components/ui/textarea", () => ({
    Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
        <textarea {...props} />
    ),
}));

jest.mock("@components/ui/button", () => ({
    Button: ({
        children,
        ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
        <button {...props}>{children}</button>
    ),
}));

jest.mock("@courselit/utils", () => ({
    FetchBuilder: jest.fn().mockImplementation(() => ({
        setUrl: jest.fn().mockReturnThis(),
        setPayload: jest.fn().mockReturnThis(),
        setIsGraphQLEndpoint: jest.fn().mockReturnThis(),
        build: jest.fn().mockReturnThis(),
        exec: mockExec,
    })),
}));

function renderPage() {
    return render(
        <AddressContext.Provider
            value={{
                backend: "http://localhost:3000",
                frontend: "http://localhost:3000",
            }}
        >
            <ProfileContext.Provider
                value={{
                    profile: {
                        userId: "user-1",
                        name: "Jane Doe",
                        email: "jane@example.com",
                        bio: "Old bio",
                        permissions: [],
                        purchases: [],
                        fetched: true,
                        subscribedToUpdates: false,
                        avatar: {
                            thumbnail: "old-avatar.png",
                        },
                    },
                    setProfile: mockSetProfile,
                }}
            >
                <ProfilePage />
            </ProfileContext.Provider>
        </AddressContext.Provider>,
    );
}

describe("ProfilePage", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockExec
            .mockResolvedValueOnce({
                user: {
                    name: "Jane Doe",
                    bio: "Old bio",
                    email: "jane@example.com",
                    subscribedToUpdates: false,
                    avatar: {
                        thumbnail: "old-avatar.png",
                    },
                },
            })
            .mockResolvedValueOnce({
                user: {
                    id: "db-user-1",
                    name: "Jane Updated",
                    userId: "user-1",
                    email: "jane@example.com",
                    permissions: [],
                    purchases: [],
                    bio: "Old bio",
                    avatar: {
                        thumbnail: "old-avatar.png",
                    },
                },
            });
    });

    it("preserves fetched profile state after saving details", async () => {
        renderPage();

        const nameInput = await screen.findByDisplayValue("Jane Doe");
        fireEvent.change(nameInput, {
            target: {
                value: "Jane Updated",
            },
        });

        fireEvent.click(screen.getByRole("button", { name: "Save" }));

        await waitFor(() => {
            expect(mockSetProfile).toHaveBeenCalledTimes(1);
        });

        const updater = mockSetProfile.mock.calls[0][0];
        expect(typeof updater).toBe("function");

        expect(
            updater({
                userId: "user-1",
                name: "Jane Doe",
                email: "jane@example.com",
                bio: "Old bio",
                permissions: [],
                purchases: [],
                fetched: true,
                subscribedToUpdates: false,
                avatar: {
                    thumbnail: "old-avatar.png",
                },
            }),
        ).toMatchObject({
            userId: "user-1",
            name: "Jane Updated",
            email: "jane@example.com",
            bio: "Old bio",
            fetched: true,
            subscribedToUpdates: false,
        });
    });
});
