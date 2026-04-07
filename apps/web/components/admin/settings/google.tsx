"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { type Address } from "@courselit/common-models";
import { useToast } from "@courselit/components-library";
import { FetchBuilder } from "@courselit/utils";
import {
    BTN_RESET,
    BUTTON_SAVE,
    GOOGLE_PROVIDER_CARD_DESCRIPTION,
    GOOGLE_PROVIDER_CARD_HEADER,
    GOOGLE_PROVIDER_CLIENT_ID_LABEL,
    GOOGLE_PROVIDER_CLIENT_SECRET_LABEL,
    GOOGLE_PROVIDER_HEADER,
    GOOGLE_PROVIDER_ORIGIN_LABEL,
    GOOGLE_PROVIDER_REDIRECT_URI_LABEL,
    GOOGLE_PROVIDER_REMOVE_DIALOG_HEADER,
    GOOGLE_PROVIDER_SECRET_HELPER,
    GOOGLE_PROVIDER_SECRET_SAVED,
    GOOGLE_PROVIDER_SETTINGS_DESCRIPTION,
    GOOGLE_PROVIDER_SETTINGS_HEADER,
    GOOGLE_PROVIDER_SUCCESS_MESSAGE,
    PROVIDER_RESET_SUCCESS_MESSAGE,
    SITE_MISCELLANEOUS_SETTING_HEADER,
    TOAST_TITLE_ERROR,
    TOAST_TITLE_SUCCESS,
    URL_COPIED_TO_CLIPBOARD,
} from "@ui-config/strings";
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@components/ui/button";
import Resources from "@components/resources";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@components/ui/alert-dialog";
import { Copy, Loader2, Save, Trash2 } from "lucide-react";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@components/ui/card";
import { Label } from "@components/ui/label";

const formSchema = z.object({
    clientId: z.string().trim().min(1, "Client ID is required"),
    clientSecret: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface GoogleProviderProps {
    address: Address;
}

export default function GoogleProvider({ address }: GoogleProviderProps) {
    const [loading, setLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [canSubmit, setCanSubmit] = useState(false);
    const [hasSavedSecret, setHasSavedSecret] = useState(false);
    const [isGoogleProviderSet, setIsGoogleProviderSet] = useState(false);
    const { toast } = useToast();
    const valuesRef = useRef<FormData>({
        clientId: "",
        clientSecret: "",
    });

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema as any),
        defaultValues: {
            clientId: "",
            clientSecret: "",
        },
    });

    const updateCanSubmit = useCallback(() => {
        const clientId = valuesRef.current.clientId.trim();
        const clientSecret = valuesRef.current.clientSecret?.trim() || "";

        setCanSubmit(
            !loading && !!clientId && (!!clientSecret || hasSavedSecret),
        );
    }, [hasSavedSecret, loading]);

    useEffect(() => {
        const subscription = form.watch((values) => {
            valuesRef.current = {
                clientId: values.clientId || "",
                clientSecret: values.clientSecret || "",
            };
            updateCanSubmit();
        });

        return () => subscription.unsubscribe();
    }, [form, updateCanSubmit]);

    useEffect(() => {
        updateCanSubmit();
    }, [updateCanSubmit]);

    useEffect(() => {
        const fetchGoogleProvider = async () => {
            const query = `
                query {
                    googleProvider: getGoogleProviderSettings {
                        clientId
                        hasClientSecret
                    }
                }
            `;
            const fetcher = new FetchBuilder()
                .setUrl(`${address.backend}/api/graph`)
                .setPayload({ query })
                .setIsGraphQLEndpoint(true)
                .build();

            try {
                const response = await fetcher.exec();
                const { googleProvider } = response;

                if (googleProvider) {
                    form.reset({
                        clientId: googleProvider.clientId,
                        clientSecret: "",
                    });
                    valuesRef.current = {
                        clientId: googleProvider.clientId,
                        clientSecret: "",
                    };
                    setHasSavedSecret(googleProvider.hasClientSecret);
                    setIsGoogleProviderSet(true);
                }
            } catch (err: any) {
                toast({
                    title: TOAST_TITLE_ERROR,
                    description: err.message,
                    variant: "destructive",
                });
            }
        };

        fetchGoogleProvider();
    }, [address.backend, form, toast]);

    const updateGoogleProvider = async (values: FormData) => {
        const query = `
            mutation (
                $clientId: String!,
                $clientSecret: String,
                $backend: String!
            ) {
                googleProvider: updateGoogleProvider(
                    clientId: $clientId,
                    clientSecret: $clientSecret,
                    backend: $backend,
                ) {
                    providerId
                }
            }
        `;
        const nextClientSecret = values.clientSecret?.trim() || undefined;

        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload({
                query,
                variables: {
                    clientId: values.clientId.trim(),
                    clientSecret: nextClientSecret,
                    backend: address.backend,
                },
            })
            .setIsGraphQLEndpoint(true)
            .build();

        try {
            setLoading(true);
            const response = await fetch.exec();

            if (response.googleProvider) {
                toast({
                    title: TOAST_TITLE_SUCCESS,
                    description: GOOGLE_PROVIDER_SUCCESS_MESSAGE,
                });
                form.setValue("clientSecret", "");
                valuesRef.current = {
                    clientId: values.clientId.trim(),
                    clientSecret: "",
                };
                setHasSavedSecret(true);
                setIsGoogleProviderSet(true);
                updateCanSubmit();
            } else {
                toast({
                    title: TOAST_TITLE_ERROR,
                    description: response.error,
                    variant: "destructive",
                });
            }
        } catch (err: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const resetProvider = async () => {
        const query = `
            mutation {
                removeGoogleProvider
            }
        `;

        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload(query)
            .setIsGraphQLEndpoint(true)
            .build();

        try {
            setIsDeleting(true);
            const response = await fetch.exec();

            if (response.removeGoogleProvider) {
                toast({
                    title: TOAST_TITLE_SUCCESS,
                    description: PROVIDER_RESET_SUCCESS_MESSAGE,
                });
                window.location.href = `/dashboard/settings?tab=${SITE_MISCELLANEOUS_SETTING_HEADER}`;
            }
        } catch (err: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setIsDeleting(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({
            title: TOAST_TITLE_SUCCESS,
            description: URL_COPIED_TO_CLIPBOARD,
        });
    };

    const redirectUri = `${address.backend}/api/auth/sso/callback/google`;

    return (
        <div className="flex flex-col gap-4">
            <h1 className="text-4xl font-semibold mb-4">
                {GOOGLE_PROVIDER_HEADER}
            </h1>
            <div className="flex flex-col lg:flex-row gap-4">
                <Card className="w-full lg:w-1/2">
                    <CardHeader>
                        <CardTitle>{GOOGLE_PROVIDER_CARD_HEADER}</CardTitle>
                        <CardDescription>
                            {GOOGLE_PROVIDER_CARD_DESCRIPTION}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <FormProvider {...form}>
                            <form
                                onSubmit={form.handleSubmit(
                                    updateGoogleProvider,
                                )}
                                className="flex flex-col gap-4"
                            >
                                <FormField
                                    control={form.control}
                                    name="clientId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                {
                                                    GOOGLE_PROVIDER_CLIENT_ID_LABEL
                                                }
                                            </FormLabel>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="clientSecret"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                {
                                                    GOOGLE_PROVIDER_CLIENT_SECRET_LABEL
                                                }
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    type="password"
                                                />
                                            </FormControl>
                                            <CardDescription>
                                                {hasSavedSecret
                                                    ? `${GOOGLE_PROVIDER_SECRET_SAVED} ${GOOGLE_PROVIDER_SECRET_HELPER}`
                                                    : GOOGLE_PROVIDER_SECRET_HELPER}
                                            </CardDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div>
                                    <Button
                                        type="submit"
                                        disabled={loading || !canSubmit}
                                    >
                                        <Save className="mr-2 h-4 w-4" />
                                        {BUTTON_SAVE}
                                    </Button>
                                </div>
                            </form>
                        </FormProvider>
                    </CardContent>
                    <CardContent className="pt-0">
                        <Resources
                            links={[
                                {
                                    href: "https://docs.courselit.app/en/schools/google-sign-in",
                                    text: "Set up Google sign in",
                                },
                            ]}
                        />
                    </CardContent>
                    <CardFooter>
                        {isGoogleProviderSet && (
                            <AlertDialog
                                onOpenChange={(open) =>
                                    !open && setIsDeleting(false)
                                }
                            >
                                <AlertDialogTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={isDeleting}
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        {BTN_RESET}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>
                                            {
                                                GOOGLE_PROVIDER_REMOVE_DIALOG_HEADER
                                            }
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action is irreversible. The
                                            current Google app configuration
                                            will be removed.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>
                                            Cancel
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={resetProvider}
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isDeleting ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Resetting...
                                                </>
                                            ) : (
                                                "Reset"
                                            )}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                    </CardFooter>
                </Card>
                <Card className="w-full lg:w-1/2">
                    <CardHeader>
                        <CardTitle>{GOOGLE_PROVIDER_SETTINGS_HEADER}</CardTitle>
                        <CardDescription>
                            {GOOGLE_PROVIDER_SETTINGS_DESCRIPTION}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label>{GOOGLE_PROVIDER_REDIRECT_URI_LABEL}</Label>
                            <div className="flex gap-2">
                                <Input
                                    type="text"
                                    disabled={true}
                                    value={redirectUri}
                                />
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => copyToClipboard(redirectUri)}
                                >
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                        <div>
                            <Label>{GOOGLE_PROVIDER_ORIGIN_LABEL}</Label>
                            <div className="flex gap-2">
                                <Input
                                    type="text"
                                    disabled={true}
                                    value={address.backend}
                                />
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() =>
                                        copyToClipboard(address.backend)
                                    }
                                >
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
