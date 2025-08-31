"use client";

import { ServerConfigContext, ThemeContext } from "@components/contexts";
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
import { signIn } from "next-auth/react";
import {
    Form,
    // FormField,
    // FormSubmit,
    useToast,
} from "@courselit/components-library";
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

    const requestCode = async function (e: FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError("");

        if (serverConfig.recaptchaSiteKey) {
            if (!executeRecaptcha) {
                toast({
                    title: TOAST_TITLE_ERROR,
                    description:
                        "reCAPTCHA service not available. Please try again later.",
                    variant: "destructive",
                });
                setLoading(false);
                return;
            }

            const recaptchaToken = await executeRecaptcha("login_code_request");
            if (!recaptchaToken) {
                toast({
                    title: TOAST_TITLE_ERROR,
                    description:
                        "reCAPTCHA validation failed. Please try again.",
                    variant: "destructive",
                });
                setLoading(false);
                return;
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

                const recaptchaData =
                    await recaptchaVerificationResponse.json();

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
                    return;
                }
            } catch (err) {
                console.error("Error during reCAPTCHA verification:", err);
                toast({
                    title: TOAST_TITLE_ERROR,
                    description:
                        "reCAPTCHA verification failed. Please try again.",
                    variant: "destructive",
                });
                setLoading(false);
                return;
            }
        }

        try {
            const url = `/api/auth/code/generate?email=${encodeURIComponent(
                email,
            )}`;
            const response = await fetch(url);
            const resp = await response.json();
            if (response.ok) {
                setShowCode(true);
            } else {
                toast({
                    title: TOAST_TITLE_ERROR,
                    description: resp.error || "Failed to request code.",
                    variant: "destructive",
                });
            }
        } catch (err) {
            console.error("Error during requestCode:", err);
            toast({
                title: TOAST_TITLE_ERROR,
                description: "An unexpected error occurred. Please try again.",
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
            const response = await signIn("credentials", {
                email,
                code,
                redirect: false,
            });
            if (response?.error) {
                setError(`Can't sign you in at this time`);
            } else {
                window.location.href = redirectTo || "/dashboard/my-content";
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
                                        {/* <FormSubmit
                                            text={
                                                loading
                                                    ? LOADING
                                                    : BTN_LOGIN_GET_CODE
                                            }
                                            disabled={loading}
                                        /> */}
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
                                        {/* <FormSubmit
                                            text={loading ? LOADING : BTN_LOGIN}
                                            disabled={loading}
                                        /> */}
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
