"use client";

import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button, Caption, Input, Text1 } from "@courselit/page-primitives";
import {
    FormControl,
    FormField,
    FormItem,
    FormMessage,
} from "@/components/ui/form";
import {
    AddressContext,
    ProfileContext,
    ServerConfigContext,
    SiteInfoContext,
    ThemeContext,
} from "@components/contexts";
import { useToast } from "@courselit/components-library";
import {
    LOGIN_CODE_INTIMATION_MESSAGE,
    LOGIN_FORM_DISCLAIMER,
    LOGIN_NO_CODE,
    BTN_LOGIN_NO_CODE,
    TOAST_TITLE_ERROR,
} from "@ui-config/strings";
import { getUserProfile } from "@/app/(with-contexts)/helpers";
import { authClient } from "@/lib/auth-client";
import Link from "next/link";
import { Constants, MembershipEntityType } from "@courselit/common-models";
import { useRecaptcha } from "@/hooks/use-recaptcha";
import type { RuntimeLoginProvider } from "@/lib/login-providers";
import RecaptchaScriptLoader from "@components/recaptcha-script-loader";
import ExternalLoginButton from "@/components/auth/external-login-button";

const loginFormSchema = z.object({
    email: z.string().email("Invalid email address"),
    otp: z.string().min(6, "OTP must be at least 6 characters").optional(),
});

type LoginStep = "email" | "otp" | "complete";

interface LoginFormProps {
    onLoginComplete: (email: string, name: string) => void;
    loginProviders?: RuntimeLoginProvider[];
    type?: MembershipEntityType;
    id?: string;
}

export function LoginForm({
    onLoginComplete,
    loginProviders = [],
    type,
    id,
}: LoginFormProps) {
    const address = useContext(AddressContext);
    const { profile, setProfile } = useContext(ProfileContext);
    const [loginStep, setLoginStep] = useState<LoginStep>("email");
    const [loading, setLoading] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(
        null,
    );
    const { toast } = useToast();
    const { theme } = useContext(ThemeContext);
    const siteinfo = useContext(SiteInfoContext);
    const serverConfig = useContext(ServerConfigContext);
    const { executeRecaptcha } = useRecaptcha();

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

    useEffect(() => {
        if (profile && profile.email) {
            setLoginStep("complete");
            onLoginComplete(profile.email, profile.name || "");
        }
    }, [profile]);

    useEffect(() => {
        return () => {
            if (cooldownTimerRef.current) {
                clearInterval(cooldownTimerRef.current);
            }
        };
    }, []);

    const startResendCooldown = useCallback(() => {
        setResendCooldown(30);
        cooldownTimerRef.current = setInterval(() => {
            setResendCooldown((prev) => {
                if (prev <= 1) {
                    clearInterval(cooldownTimerRef.current!);
                    cooldownTimerRef.current = null;
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, []);

    const form = useForm<z.infer<typeof loginFormSchema>>({
        resolver: zodResolver(loginFormSchema as any),
        defaultValues: {
            email: "",
            otp: "",
        },
    });

    const handleRequestOTP = async () => {
        const emailValue = form.getValues("email");
        if (!emailValue || !/\S+@\S+\.\S+/.test(emailValue)) {
            form.setError("email", {
                type: "manual",
                message: "Please enter a valid email address",
            });
            return;
        }

        await requestCode(emailValue);
    };

    const requestCode = async function (email: string) {
        setLoading(true);

        if (!validateRecaptcha()) {
            return;
        }

        try {
            const { error } = await authClient.emailOtp.sendVerificationOtp({
                email: email.trim().toLowerCase(),
                type: "sign-in",
            });
            if (error) {
                toast({
                    title: TOAST_TITLE_ERROR,
                    description: error.message,
                    variant: "destructive",
                });
            } else {
                setLoginStep("otp");
                startResendCooldown();
            }
        } finally {
            setLoading(false);
        }
    };

    const handleResendOTP = async () => {
        const emailValue = form.getValues("email");
        await requestCode(emailValue);
    };

    const handleVerifyOTP = async () => {
        const email = form.getValues("email");
        const code = form.getValues("otp");
        try {
            setLoading(true);
            const { error } = await authClient.signIn.emailOtp({
                email: email.trim().toLowerCase(),
                otp: code!,
            });
            if (error) {
                toast({
                    title: TOAST_TITLE_ERROR,
                    description: error.message,
                    variant: "destructive",
                });
            } else {
                const profile = await getUserProfile(address.backend);
                if (profile) {
                    setProfile(profile);
                }
            }
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLFormElement>) => {
        if (event.key === "Enter") {
            event.preventDefault();
            if (loginStep === "email") {
                handleRequestOTP();
            } else if (loginStep === "otp") {
                handleVerifyOTP();
            }
        }
    };

    return (
        <div className="flex flex-col gap-4">
            {siteinfo.logins?.includes(Constants.LoginProvider.EMAIL) && (
                <FormProvider {...form}>
                    <form className="space-y-4" onKeyDown={handleKeyDown}>
                        {loginStep === "email" && (
                            <>
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Input
                                                    theme={theme.theme}
                                                    type="email"
                                                    placeholder="Email address"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                {/* <Text2 className="text-xs" theme={theme.theme}>
                                        <Caption
                                            theme={theme.theme}
                                            className="text-center"
                                        >
                                            {LOGIN_FORM_DISCLAIMER}
                                            <Link href="/p/terms">
                                                <PageLink
                                                    href="/p/terms"
                                                    className="underline"
                                                >
                                                    Terms
                                                </PageLink>
                                            </Link>{" "}
                                            and{" "}
                                            <Link href="/p/privacy">
                                                <PageLink
                                                    href="/p/privacy"
                                                    className="underline"
                                                >
                                                    Privacy Policy
                                                </PageLink>
                                            </Link>
                                        </Caption>
                                    </Text2> */}
                                <Button
                                    type="button"
                                    onClick={handleRequestOTP}
                                    className="w-full"
                                    disabled={loading}
                                    theme={theme.theme}
                                >
                                    Continue
                                </Button>
                            </>
                        )}

                        {loginStep === "otp" && (
                            <>
                                <Text1 className="mb-2" theme={theme.theme}>
                                    {LOGIN_CODE_INTIMATION_MESSAGE}
                                </Text1>
                                <FormField
                                    control={form.control}
                                    name="otp"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Input
                                                    theme={theme.theme}
                                                    type="text"
                                                    placeholder="Enter OTP"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <Button
                                    type="button"
                                    onClick={handleVerifyOTP}
                                    className="w-full"
                                    disabled={loading}
                                    theme={theme.theme}
                                >
                                    Verify OTP
                                </Button>
                                <div className="flex items-center justify-center gap-2">
                                    <Caption
                                        theme={theme.theme}
                                        className="text-center"
                                    >
                                        {LOGIN_NO_CODE}
                                    </Caption>
                                    <Button
                                        type="button"
                                        variant="link"
                                        onClick={handleResendOTP}
                                        disabled={loading || resendCooldown > 0}
                                        theme={theme.theme}
                                        className="p-0 h-auto"
                                    >
                                        {resendCooldown > 0
                                            ? `${BTN_LOGIN_NO_CODE} (${resendCooldown}s)`
                                            : BTN_LOGIN_NO_CODE}
                                    </Button>
                                </div>
                            </>
                        )}
                    </form>
                </FormProvider>
            )}
            {loginProviders.map((provider) => (
                <ExternalLoginButton
                    key={provider.key}
                    provider={provider}
                    theme={theme.theme}
                    className="w-full"
                    onClick={async () => {
                        await authClient.signIn.sso({
                            providerId: provider.providerId,
                            callbackURL: `/checkout?type=${type}&id=${id}`,
                        });
                    }}
                />
            ))}
            <Caption theme={theme.theme} className="text-center">
                {LOGIN_FORM_DISCLAIMER}
                <Link href="/p/terms">
                    <span className="underline">Terms</span>
                </Link>
            </Caption>
            <RecaptchaScriptLoader />
        </div>
    );
}
