"use client";

import { useContext, useEffect, useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    FormControl,
    FormField,
    FormItem,
    FormMessage,
} from "@/components/ui/form";
import Link from "next/link";
import { AddressContext, ProfileContext } from "@components/contexts";
import { useToast } from "@courselit/components-library";
import { TOAST_TITLE_ERROR } from "@ui-config/strings";
import { signIn } from "next-auth/react";
import { FetchBuilder } from "@courselit/utils";

const loginFormSchema = z.object({
    email: z.string().email("Invalid email address"),
    otp: z.string().min(6, "OTP must be at least 6 characters").optional(),
    name: z.string().min(2, "Name must be at least 2 characters").optional(),
});

type LoginStep = "email" | "otp" | "name" | "complete";

interface LoginFormProps {
    onLoginComplete: (email: string, name: string) => void;
}

export function LoginForm({ onLoginComplete }: LoginFormProps) {
    const address = useContext(AddressContext);
    const { profile, setProfile } = useContext(ProfileContext);
    const [loginStep, setLoginStep] = useState<LoginStep>("email");
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (profile && profile.email) {
            setLoginStep("complete");
            onLoginComplete(profile.email, profile.name || "");
        }
    }, [profile]);

    const form = useForm<z.infer<typeof loginFormSchema>>({
        resolver: zodResolver(loginFormSchema),
        defaultValues: {
            email: "",
            otp: "",
            name: "",
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

        // Simulate OTP request
        setLoginStep("otp");
    };

    const requestCode = async function (email: string) {
        const url = `/api/auth/code/generate?email=${encodeURIComponent(
            email,
        )}`;
        try {
            setLoading(true);
            const response = await fetch(url);
            const resp = await response.json();
            if (!response.ok) {
                toast({
                    title: TOAST_TITLE_ERROR,
                    description: resp.error,
                });
            }
        } catch (err) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
            });
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async () => {
        const email = form.getValues("email");
        const code = form.getValues("otp");
        try {
            setLoading(true);
            const response = await signIn("credentials", {
                email,
                code,
                redirect: false,
            });
            if (response?.error) {
                toast({
                    title: TOAST_TITLE_ERROR,
                    description: `Can't sign you in at this time`,
                });
            } else {
                await getProfile();
            }
        } finally {
            setLoading(false);
        }
    };

    const getProfile = async () => {
        const query = `
            { profile: getUser {
                name,
                id,
                email,
                userId,
                bio,
                permissions,
                purchases {
                    courseId,
                    completedLessons,
                    accessibleGroups
                }
                avatar {
                        mediaId,
                        originalFileName,
                        mimeType,
                        size,
                        access,
                        file,
                        thumbnail,
                        caption
                    },
                }
            }
            `;
        const fetch = new FetchBuilder()
            .setUrl(`${address}/api/graph`)
            .setPayload(query)
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            const response = await fetch.exec();
            if (response.profile) {
                setProfile(response.profile);
            }
        } catch (e) {}
    };

    const handleNameSubmit = () => {
        const { email, name } = form.getValues();
        onLoginComplete(email, name || "");
        setLoginStep("complete");
    };

    return (
        <FormProvider {...form}>
            <form className="space-y-4">
                {loginStep === "email" && (
                    <>
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <Input
                                            type="email"
                                            placeholder="Email address"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <p className="text-xs text-muted-foreground">
                            By signing in, you accept our{" "}
                            <Link
                                href="/terms"
                                className="underline hover:text-primary font-medium"
                            >
                                Terms
                            </Link>{" "}
                            and{" "}
                            <Link
                                href="/privacy"
                                className="underline hover:text-primary font-medium"
                            >
                                Privacy Policy
                            </Link>
                        </p>
                        <Button
                            type="button"
                            onClick={handleRequestOTP}
                            className="w-full"
                        >
                            Continue
                        </Button>
                    </>
                )}

                {loginStep === "otp" && (
                    <>
                        <p className="text-sm text-muted-foreground mb-2">
                            We have emailed you a one time password.
                        </p>
                        <FormField
                            control={form.control}
                            name="otp"
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <Input
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
                        >
                            Verify OTP
                        </Button>
                    </>
                )}

                {loginStep === "name" && (
                    <>
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <Input
                                            placeholder="Full name"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button
                            type="button"
                            onClick={handleNameSubmit}
                            className="w-full"
                        >
                            Continue
                        </Button>
                    </>
                )}
            </form>
        </FormProvider>
    );
}
