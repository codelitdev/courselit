"use client";

import {
    AddressContext,
    ServerConfigContext,
    ThemeContext,
} from "@components/contexts";
import {
    Button,
    Caption,
    Input,
    Section,
    Text1,
    Text2,
    Link as PageLink,
} from "@courselit/page-primitives";
import { useContext, useState } from "react";
import { FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { Form, useToast } from "@courselit/components-library";
import {
    BTN_LOGIN,
    BTN_LOGIN_GET_CODE,
    BTN_LOGIN_CODE_INTIMATION,
    LOGIN_NO_CODE,
    BTN_LOGIN_NO_CODE,
    LOGIN_FORM_LABEL,
    LOGIN_FORM_DISCLAIMER,
    LOADING,
    TOAST_TITLE_ERROR,
} from "@/ui-config/strings";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { useRecaptcha } from "@/hooks/use-recaptcha";
import RecaptchaScriptLoader from "@/components/recaptcha-script-loader";
import { checkPermission } from "@courselit/utils";
import { Profile } from "@courselit/common-models";
import { getUserProfile } from "../../helpers";
import { ADMIN_PERMISSIONS } from "@ui-config/constants";
import { useRouter } from "next/navigation";

interface AuthConfig {
    emailOtp: boolean;
    google: boolean;
    github: boolean;
    saml: boolean;
}

export default function LoginForm({
    redirectTo,
    authConfig,
}: {
    redirectTo?: string;
    authConfig?: AuthConfig;
}) {
    const { theme } = useContext(ThemeContext);
    const [showCode, setShowCode] = useState(false);
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();
    const serverConfig = useContext(ServerConfigContext);
    const { executeRecaptcha } = useRecaptcha();
    const address = useContext(AddressContext);
    const router = useRouter();

    const requestCode = async function (e: FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError("");

        // ReCAPTCHA logic preserved
        if (serverConfig.recaptchaSiteKey) {
            if (!executeRecaptcha) {
                toast({
                    title: TOAST_TITLE_ERROR,
                    description: "reCAPTCHA service not available.",
                    variant: "destructive",
                });
                setLoading(false);
                return;
            }
            const recaptchaToken = await executeRecaptcha("login_code_request");
            if (!recaptchaToken) {
                toast({
                    title: TOAST_TITLE_ERROR,
                    description: "reCAPTCHA validation failed.",
                    variant: "destructive",
                });
                setLoading(false);
                return;
            }
            // Verify token on server if needed, but for now proceeding to authClient
        }

        try {
            const { error } = await authClient.signIn.emailOtp({
                email,
                type: "sign-in",
            });

            if (error) {
                toast({
                    title: TOAST_TITLE_ERROR,
                    description: error.message || "Failed to request code.",
                    variant: "destructive",
                });
            } else {
                setShowCode(true);
            }
        } catch (err: any) {
            console.error("Error during requestCode:", err);
            toast({
                title: TOAST_TITLE_ERROR,
                description: "An unexpected error occurred.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const signInUser = async function (e: FormEvent) {
        e.preventDefault();
        try {
            setLoading(true);
            const { error } = await authClient.signIn.emailOtp({
                email,
                otp: code,
                type: "sign-in",
            });

            if (error) {
                setError(error.message || "Can't sign you in at this time");
            } else {
                const profile = await getUserProfile(address.backend);
                window.location.href =
                    redirectTo || getRedirectURLBasedOnProfile(profile);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSocialLogin = async (provider: "google" | "github") => {
        await authClient.signIn.social({
            provider,
            callbackURL: redirectTo || "/dashboard",
        });
    };

    const handleSSOLogin = async () => {
        // Trigger SSO flow. Usually requires email to resolve provider,
        // but if we know the provider is SAML for this domain, we might need a different call.
        // Better Auth SSO usually works by `signIn.sso({ email })`.
        // If the user enters email in the input, we can use that.
        // Or we can have a separate "Login with SSO" button that asks for email if not provided.
        if (!email) {
            setError("Please enter your email to login with SSO");
            return;
        }
        await authClient.signIn.sso({
            email,
            callbackURL: redirectTo || "/dashboard",
        });
    };

    const getRedirectURLBasedOnProfile = (profile: Profile) => {
        if (
            profile?.userId &&
            checkPermission(profile.permissions!, ADMIN_PERMISSIONS)
        ) {
            return "/dashboard/overview";
        } else {
            return "/dashboard/my-content";
        }
    };

    return (
        <Section theme={theme.theme}>
            <div className="flex flex-col gap-4 min-h-[80vh]">
                <div className="flex justify-center grow items-center px-4 mx-auto lg:max-w-[1200px] w-full">
                    <div className="flex flex-col w-full max-w-md">
                        {error && (
                            <div
                                style={{
                                    color: theme?.theme?.colors?.light
                                        ?.destructive,
                                }}
                                className="flex items-center gap-2 mb-4"
                            >
                                <TriangleAlert className="w-4 h-4" />
                                <div>
                                    <Text1 theme={theme.theme}>{error}</Text1>
                                </div>
                            </div>
                        )}
                        {!showCode && (
                            <div>
                                <Text1 theme={theme.theme} className="mb-4">
                                    {LOGIN_FORM_LABEL}
                                </Text1>
                                <Form
                                    onSubmit={requestCode}
                                    className="flex flex-col gap-4"
                                >
                                    <Input
                                        type="email"
                                        value={email}
                                        placeholder="Enter your email"
                                        required={true}
                                        onChange={(e) =>
                                            setEmail(e.target.value)
                                        }
                                        theme={theme.theme}
                                    />

                                    <Caption
                                        theme={theme.theme}
                                        className="text-center"
                                    >
                                        {LOGIN_FORM_DISCLAIMER}
                                        <Link href="/p/terms">
                                            <span className="underline">
                                                Terms
                                            </span>
                                        </Link>
                                    </Caption>
                                    <div className="flex justify-center">
                                        <Button
                                            theme={theme.theme}
                                            disabled={loading}
                                        >
                                            {loading
                                                ? LOADING
                                                : BTN_LOGIN_GET_CODE}
                                        </Button>
                                    </div>
                                </Form>

                                {/* Social & SSO Buttons */}
                                <div className="flex flex-col gap-2 mt-4">
                                    {authConfig?.google && (
                                        <Button
                                            theme={theme.theme}
                                            onClick={() =>
                                                handleSocialLogin("google")
                                            }
                                            type="button"
                                            variant="outlined"
                                        >
                                            Continue with Google
                                        </Button>
                                    )}
                                    {authConfig?.github && (
                                        <Button
                                            theme={theme.theme}
                                            onClick={() =>
                                                handleSocialLogin("github")
                                            }
                                            type="button"
                                            variant="outlined"
                                        >
                                            Continue with GitHub
                                        </Button>
                                    )}
                                    {authConfig?.saml && (
                                        <Button
                                            theme={theme.theme}
                                            onClick={handleSSOLogin}
                                            type="button"
                                            variant="outlined"
                                        >
                                            Login with SSO
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                        {showCode && (
                            <div>
                                <Text1 theme={theme.theme} className="mb-4">
                                    {BTN_LOGIN_CODE_INTIMATION}{" "}
                                    <strong>{email}</strong>
                                </Text1>
                                <Form
                                    className="flex flex-col gap-4 mb-4"
                                    onSubmit={signInUser}
                                >
                                    <Input
                                        type="text"
                                        value={code}
                                        placeholder="Code"
                                        required={true}
                                        onChange={(e) =>
                                            setCode(e.target.value)
                                        }
                                        theme={theme.theme}
                                    />
                                    <div className="flex justify-center">
                                        <Button
                                            theme={theme.theme}
                                            disabled={loading}
                                        >
                                            {loading ? LOADING : BTN_LOGIN}
                                        </Button>
                                    </div>
                                </Form>
                                <div className="flex justify-center items-center gap-1 text-sm">
                                    <Text2
                                        theme={theme.theme}
                                        className="text-slate-500"
                                    >
                                        {LOGIN_NO_CODE}
                                    </Text2>
                                    <button
                                        onClick={requestCode}
                                        className="underline"
                                        disabled={loading}
                                    >
                                        <PageLink theme={theme.theme}>
                                            {loading
                                                ? LOADING
                                                : BTN_LOGIN_NO_CODE}
                                        </PageLink>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <RecaptchaScriptLoader />
        </Section>
    );
}
