"use client";

import { Address } from "@courselit/common-models";
import { useToast } from "@courselit/components-library";
import { FetchBuilder } from "@courselit/utils";
import {
    SITE_MISCELLANEOUS_SETTING_HEADER,
    SSO_PROVIDER_CERT_LABEL,
    SSO_PROVIDER_ENTRY_POINT_LABEL,
    SSO_PROVIDER_IDP_METADATA_LABEL,
    SSO_PROVIDER_HEADER,
    SSO_PROVIDER_SUCCESS_MESSAGE,
    TOAST_TITLE_ERROR,
    TOAST_TITLE_SUCCESS,
    PROVIDER_RESET_SUCCESS_MESSAGE,
    BTN_RESET,
    BUTTON_SAVE,
    SSO_PROVIDER_CARD_HEADER,
    SSO_PROVIDER_CARD_DESCRIPTION,
    SSO_PROVIDER_SP_ACS_LABEL,
    SSO_PROVIDER_SP_ENTITY_ID_LABEL,
} from "@ui-config/strings";
import { useRouter } from "next/navigation";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@components/ui/button";
import Resources from "@components/resources";
import { useEffect, useState } from "react";
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
import { Trash2, Loader2, Save, Copy } from "lucide-react";
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
    idpMetadata: z.string().min(1, "IDP Metadata is required"),
    entryPoint: z.string().min(1, "Entry Point is required"),
    cert: z.string().min(1, "Certificate is required"),
});

type FormData = z.infer<typeof formSchema>;

interface NewSSOProviderProps {
    address: Address;
}

export default function SSOProvider({ address }: NewSSOProviderProps) {
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSSOProviderSet, setIsSSOProviderSet] = useState(false);

    const fetch = new FetchBuilder()
        .setUrl(`${address.backend}/api/graph`)
        .setIsGraphQLEndpoint(true);

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            idpMetadata: "",
            entryPoint: "",
            cert: "",
        },
    });

    useEffect(() => {
        const fetchSSOProvider = async () => {
            const query = `
                query {
                    ssoProvider: getSSOProviderSettings {
                        idpMetadata
                        entryPoint
                        cert
                    }
                }
            `;
            const fetcher = fetch
                .setPayload({
                    query,
                })
                .build();
            try {
                const response = await fetcher.exec();
                const { ssoProvider } = response;
                if (ssoProvider) {
                    form.setValue("idpMetadata", ssoProvider.idpMetadata);
                    form.setValue("entryPoint", ssoProvider.entryPoint);
                    form.setValue("cert", ssoProvider.cert);
                    setIsSSOProviderSet(true);
                }
            } catch (err: any) {
                toast({
                    title: TOAST_TITLE_ERROR,
                    description: err.message,
                    variant: "destructive",
                });
            }
        };
        fetchSSOProvider();
    }, []);

    const updateSSOProvider = async (values: FormData) => {
        const query = `
            mutation (
                $idpMetadata: String!, 
                $entryPoint: String!, 
                $cert: String!, 
                $backend: String!
            ) {
                ssoProvider: updateSSOProvider(
                    idpMetadata: $idpMetadata,
                    entryPoint: $entryPoint,
                    cert: $cert,
                    backend: $backend,
                ) {
                    providerId
                }
            }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload({
                query,
                variables: {
                    ...values,
                    backend: address.backend,
                },
            })
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            setLoading(true);
            const response = await fetch.exec();
            if (response.ssoProvider) {
                toast({
                    title: TOAST_TITLE_SUCCESS,
                    description: SSO_PROVIDER_SUCCESS_MESSAGE,
                });
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
                removeSSOProvider
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

            if (response.removeSSOProvider) {
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
            description: "URL copied to clipboard",
        });
    };

    return (
        <div className="flex flex-col gap-4">
            <h1 className="text-4xl font-semibold mb-4">
                {SSO_PROVIDER_HEADER}
            </h1>
            <div className="flex flex-col lg:flex-row gap-4">
                <Card className="w-full lg:w-1/2">
                    <CardHeader>
                        <CardTitle>{SSO_PROVIDER_CARD_HEADER}</CardTitle>
                        <CardDescription>
                            {SSO_PROVIDER_CARD_DESCRIPTION}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <FormProvider {...form}>
                            <form
                                onSubmit={form.handleSubmit(updateSSOProvider)}
                                className="flex flex-col gap-4"
                            >
                                <FormField
                                    control={form.control}
                                    name="entryPoint"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                {SSO_PROVIDER_ENTRY_POINT_LABEL}
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
                                    name="idpMetadata"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                {
                                                    SSO_PROVIDER_IDP_METADATA_LABEL
                                                }
                                            </FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    {...field}
                                                    rows={10}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="cert"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                {SSO_PROVIDER_CERT_LABEL}
                                            </FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    {...field}
                                                    rows={10}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div>
                                    <Button type="submit" disabled={loading}>
                                        <Save className="mr-2 h-4 w-4" />
                                        {BUTTON_SAVE}
                                    </Button>
                                </div>
                            </form>
                        </FormProvider>
                        <div></div>
                        <Resources
                            links={[
                                {
                                    href: "https://docs.courselit.app/en/school/sso#add-sso-provider",
                                    text: "Add SSO Provider",
                                },
                            ]}
                        />
                    </CardContent>
                    <CardFooter>
                        {isSSOProviderSet && (
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
                                            Clear SSO config?
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action is irreversible. All
                                            provider config will be wiped off.
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
                        <CardTitle>School Settings</CardTitle>
                        <CardDescription>
                            Configuration to be entered in your IDP (Okta, Azure
                            AD, OneLogin etc.)
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <>
                            <div>
                                <Label>{SSO_PROVIDER_SP_ACS_LABEL}</Label>
                                <div className="flex gap-2">
                                    <Input
                                        type="text"
                                        disabled={true}
                                        value={`${address.backend}/api/auth/sso/saml2/sp/acs/sso`}
                                    />
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() =>
                                            copyToClipboard(
                                                `${address.backend}/api/auth/sso/saml2/sp/acs/sso`,
                                            )
                                        }
                                    >
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                            <div>
                                <Label>{SSO_PROVIDER_SP_ENTITY_ID_LABEL}</Label>
                                <div className="flex gap-2">
                                    <Input
                                        type="text"
                                        disabled={true}
                                        value={`${address.backend}/api/auth/sso/saml2/sp/metadata?providerId=sso`}
                                    />
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() =>
                                            copyToClipboard(
                                                `${address.backend}/api/auth/sso/saml2/sp/metadata?providerId=sso`,
                                            )
                                        }
                                    >
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
