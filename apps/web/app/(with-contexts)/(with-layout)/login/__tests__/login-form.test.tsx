import type { ComponentProps, ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import {
    BTN_LOGIN_GET_CODE,
    LOGIN_EMAIL_PLACEHOLDER,
    LOGIN_FORM_DISCLAIMER,
    LOGIN_FORM_TERMS_LINK,
} from "@/ui-config/strings";
import LoginForm from "../login-form";

jest.mock("@components/contexts", () => {
    const React = require("react");

    return {
        AddressContext: React.createContext({ backend: "", frontend: "" }),
        ServerConfigContext: React.createContext({
            recaptchaSiteKey: "",
            turnstileSiteKey: "",
            queueServer: "",
            cacheEnabled: false,
        }),
        SiteInfoContext: React.createContext({
            logins: ["email"],
        }),
        ThemeContext: React.createContext({
            theme: { id: "", name: "", theme: {} },
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
    useRecaptcha: () => ({ executeRecaptcha: null }),
}));

jest.mock("@/components/recaptcha-script-loader", () => () => null);

jest.mock("@courselit/components-library", () => ({
    useToast: () => ({ toast: jest.fn() }),
    Form: ({
        children,
        ...props
    }: ComponentProps<"form"> & { children: ReactNode }) => (
        <form {...props}>{children}</form>
    ),
}));

jest.mock("@courselit/page-primitives", () => {
    const React = require("react");

    const MockInput = React.forwardRef(function MockInput(
        props: ComponentProps<"input">,
        ref: React.Ref<HTMLInputElement>,
    ) {
        return <input ref={ref} {...props} />;
    });

    return {
        Section: ({ children }: { children: ReactNode }) => (
            <div>{children}</div>
        ),
        Text1: ({ children }: { children: ReactNode }) => <p>{children}</p>,
        Caption: ({ children }: { children: ReactNode }) => (
            <span>{children}</span>
        ),
        Link: ({ children }: { children: ReactNode }) => (
            <span>{children}</span>
        ),
        Button: ({ children, ...props }: ComponentProps<"button">) => (
            <button {...props}>{children}</button>
        ),
        Input: MockInput,
    };
});

describe("LoginForm copy", () => {
    it("takes every visible text of the email step from ui-config/strings", () => {
        render(<LoginForm />);

        expect(
            screen.getByPlaceholderText(LOGIN_EMAIL_PLACEHOLDER),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: BTN_LOGIN_GET_CODE }),
        ).toBeInTheDocument();
        expect(
            screen.getByText(LOGIN_FORM_DISCLAIMER.trim(), { exact: false }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("link", { name: LOGIN_FORM_TERMS_LINK }),
        ).toBeInTheDocument();
    });
});
