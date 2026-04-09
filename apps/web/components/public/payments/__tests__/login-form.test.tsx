import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Constants } from "@courselit/common-models";
import { LOGIN_PROVIDER_AUTH_TYPE } from "@/lib/login-providers";
import {
    LOGIN_PROVIDER_SSO_BUTTON,
    LOGIN_PROVIDER_SSO_LABEL,
} from "@/ui-config/strings";

jest.mock("@components/contexts", () => {
    const React = require("react");

    return {
        AddressContext: React.createContext({
            backend: "",
            frontend: "",
        }),
        ProfileContext: React.createContext({
            profile: null,
            setProfile: jest.fn(),
        }),
        ServerConfigContext: React.createContext({
            recaptchaSiteKey: "",
            turnstileSiteKey: "",
            queueServer: "",
            cacheEnabled: false,
        }),
        SiteInfoContext: React.createContext({
            logins: [],
        }),
        ThemeContext: React.createContext({
            theme: {
                id: "",
                name: "",
                theme: {},
            },
            setTheme: jest.fn(),
        }),
    };
});

jest.mock("@/lib/auth-client", () => ({
    authClient: {
        signIn: {
            sso: jest.fn(),
            emailOtp: jest.fn(),
        },
        emailOtp: {
            sendVerificationOtp: jest.fn(),
        },
    },
}));

jest.mock("@/app/(with-contexts)/helpers", () => ({
    getUserProfile: jest.fn(),
}));

jest.mock("@/hooks/use-recaptcha", () => ({
    useRecaptcha: () => ({
        executeRecaptcha: null,
    }),
}));

jest.mock("@courselit/components-library", () => ({
    useToast: () => ({
        toast: jest.fn(),
    }),
}));

jest.mock("@components/recaptcha-script-loader", () => () => null, {
    virtual: true,
});

jest.mock(
    "@/components/ui/form",
    () => ({
        FormControl: ({ children }: { children: ReactNode }) => children,
        FormField: ({
            name,
            render,
        }: {
            name: string;
            render: (props: { field: Record<string, unknown> }) => ReactNode;
        }) =>
            render({
                field: {
                    name,
                    value: "",
                    onChange: jest.fn(),
                    onBlur: jest.fn(),
                    ref: jest.fn(),
                },
            }),
        FormItem: ({ children }: { children: ReactNode }) => (
            <div>{children}</div>
        ),
        FormMessage: () => null,
    }),
    { virtual: true },
);

jest.mock("@courselit/page-primitives", () => ({
    Button: ({
        children,
        onClick,
        ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
        <button onClick={onClick} {...props}>
            {children}
        </button>
    ),
    Caption: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
        <input {...props} />
    ),
    Text1: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

jest.mock("next/link", () => ({
    __esModule: true,
    default: ({ children, href }: { children: ReactNode; href: string }) => (
        <a href={href}>{children}</a>
    ),
}));

import { LoginForm } from "../login-form";
import { authClient } from "@/lib/auth-client";
import {
    AddressContext,
    ProfileContext,
    ServerConfigContext,
    SiteInfoContext,
    ThemeContext,
} from "@components/contexts";

function renderLoginForm() {
    return render(
        <AddressContext.Provider
            value={{
                backend: "http://localhost:3000",
                frontend: "http://localhost:3000",
            }}
        >
            <ProfileContext.Provider
                value={{
                    profile: null,
                    setProfile: jest.fn(),
                }}
            >
                <ServerConfigContext.Provider
                    value={{
                        recaptchaSiteKey: "",
                        turnstileSiteKey: "",
                        queueServer: "",
                        cacheEnabled: false,
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
                            currencyISOCode: "USD",
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
                            logins: [Constants.LoginProvider.SSO],
                        }}
                    >
                        <ThemeContext.Provider
                            value={{
                                theme: {
                                    id: "test",
                                    name: "Test",
                                    theme: {} as any,
                                },
                                setTheme: jest.fn(),
                            }}
                        >
                            <LoginForm
                                onLoginComplete={jest.fn()}
                                type={Constants.MembershipEntityType.COURSE}
                                id="course-123"
                                loginProviders={[
                                    {
                                        key: Constants.LoginProvider.SSO,
                                        providerId: Constants.LoginProvider.SSO,
                                        label: LOGIN_PROVIDER_SSO_LABEL,
                                        buttonText: LOGIN_PROVIDER_SSO_BUTTON,
                                        authType: LOGIN_PROVIDER_AUTH_TYPE.SAML,
                                    },
                                ]}
                            />
                        </ThemeContext.Provider>
                    </SiteInfoContext.Provider>
                </ServerConfigContext.Provider>
            </ProfileContext.Provider>
        </AddressContext.Provider>,
    );
}

describe("Checkout LoginForm", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (authClient.signIn.sso as jest.Mock).mockResolvedValue({});
    });

    it("starts SSO with the checkout callback URL", async () => {
        renderLoginForm();

        fireEvent.click(
            screen.getByRole("button", { name: "Continue with SSO" }),
        );

        await waitFor(() => {
            expect(authClient.signIn.sso).toHaveBeenCalledWith({
                providerId: "sso",
                callbackURL: "/checkout?type=course&id=course-123",
            });
        });
    });
});
