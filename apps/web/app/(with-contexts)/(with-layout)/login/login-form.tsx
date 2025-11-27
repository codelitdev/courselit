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
    Link as PageLink,
} from "@courselit/page-primitives";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { FormEvent } from "react";
import { Form, useToast } from "@courselit/components-library";
import {
    BTN_LOGIN,
    BTN_LOGIN_GET_CODE,
    LOGIN_CODE_INTIMATION_MESSAGE,
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
import { authClient } from "@/lib/auth-client";

export default function LoginForm({ redirectTo }: { redirectTo?: string }) {
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
    const codeInputRef = useRef<HTMLInputElement>(null);

    const validateRecaptcha = useCallback(async (): Promise<boolean> => {
        if (!serverConfig.recaptchaSiteKey) {
            return true;
        }

        if (!executeRecaptcha) {
            toast({
                title: TOAST_TITLE_ERROR,
                description:
                    "reCAPTCHA service not available. Please try again later.",
                variant: "destructive",
            });
            setLoading(false);
            return false;
        }

        const recaptchaToken = await executeRecaptcha("login_code_request");
        if (!recaptchaToken) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: "reCAPTCHA validation failed. Please try again.",
                variant: "destructive",
            });
            setLoading(false);
            return false;
        }
        try {
            const recaptchaVerificationResponse = await fetch(
                "/api/recaptcha",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ token: recaptchaToken }),
                },
            );

            const recaptchaData = await recaptchaVerificationResponse.json();

            if (
                !recaptchaVerificationResponse.ok ||
                !recaptchaData.success ||
                (recaptchaData.score && recaptchaData.score < 0.5)
            ) {
                toast({
                    title: TOAST_TITLE_ERROR,
                    description: `reCAPTCHA verification failed. ${recaptchaData.score ? `Score: ${recaptchaData.score.toFixed(2)}.` : ""} Please try again.`,
                    variant: "destructive",
                });
                setLoading(false);
                return false;
            }
        } catch (err) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: "reCAPTCHA verification failed. Please try again.",
                variant: "destructive",
            });
            setLoading(false);
            return false;
        }

        return true;
    }, []);

    const signInUser = async function (e: FormEvent) {
        e.preventDefault();
        try {
            setLoading(true);
            const { error } = await authClient.signIn.emailOtp({
                email: email.trim().toLowerCase(),
                otp: code,
            });
            if (error) {
                setError(`Can't sign you in at this time: ${error.message}`);
            } else {
                window.location.href =
                    redirectTo ||
                    getRedirectURLBasedOnProfile(
                        await getUserProfile(address.backend),
                    );
            }
        } finally {
            setLoading(false);
        }
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

    useEffect(() => {
        if (showCode) {
            codeInputRef.current?.focus();
        }
    }, [showCode]);

    const requestCode = async function (e: FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError("");

        if (!validateRecaptcha()) {
            return;
        }

        try {
            const { error } = await authClient.emailOtp.sendVerificationOtp({
                email: email.trim().toLowerCase(),
                type: "sign-in",
            });

            if (error) {
                setError(error.message as any);
            } else {
                setShowCode(true);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Section theme={theme.theme}>
            <div className="flex flex-col gap-4 min-h-[80vh]">
                <div className="flex justify-center grow items-center px-4 mx-auto lg:max-w-[1200px] w-full">
                    <div className="flex flex-col">
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
                                    className="flex flex-col gap-4 w-full lg:w-[360px] mx-auto"
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
                                    <Button
                                        theme={theme.theme}
                                        disabled={loading}
                                    >
                                        {loading ? LOADING : BTN_LOGIN_GET_CODE}
                                    </Button>
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
                                </Form>
                            </div>
                        )}
                        {showCode && (
                            <div>
                                <Text1 theme={theme.theme} className="mb-4">
                                    {LOGIN_CODE_INTIMATION_MESSAGE}{" "}
                                    <strong>{email}</strong>
                                </Text1>
                                <Form
                                    className="flex flex-col gap-4 mb-4 w-full lg:w-[360px] mx-auto"
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
                                        ref={codeInputRef}
                                    />
                                    <Button
                                        theme={theme.theme}
                                        disabled={loading}
                                    >
                                        {loading ? LOADING : BTN_LOGIN}
                                    </Button>
                                    {/* </div> */}
                                </Form>
                                <div className="flex justify-center items-center gap-1 text-sm">
                                    <Caption
                                        theme={theme.theme}
                                        className="text-center flex items-center gap-1"
                                    >
                                        {LOGIN_NO_CODE}
                                        <button
                                            onClick={requestCode}
                                            className="underline"
                                            disabled={loading}
                                        >
                                            <PageLink
                                                theme={theme.theme}
                                                className="text-xs"
                                            >
                                                {loading
                                                    ? LOADING
                                                    : BTN_LOGIN_NO_CODE}
                                            </PageLink>
                                        </button>
                                    </Caption>
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
