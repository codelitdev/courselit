"use client";

import { Address } from "@courselit/common-models";
import { useToast } from "@courselit/components-library";
import { FetchBuilder } from "@courselit/utils";
import {
    BUTTON_DONE_TEXT,
    SITE_MISCELLANEOUS_SETTING_HEADER,
    SSO_PROVIDER_CALLBACK_URL_LABEL,
    SSO_PROVIDER_CERT_LABEL,
    SSO_PROVIDER_DOMAIN_LABEL,
    SSO_PROVIDER_ENTRY_POINT_LABEL,
    SSO_PROVIDER_IDP_METADATA_LABEL,
    SSO_PROVIDER_NEW_HEADER,
    SSO_PROVIDER_PROVIDER_ID_LABEL,
    SSO_PROVIDER_SUCCESS_MESSAGE,
    TOAST_TITLE_ERROR,
    TOAST_TITLE_SUCCESS,
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
import { useState } from "react";

const formSchema = z.object({
    providerId: z
        .string()
        .min(1, "Provider ID is required")
        .regex(
            /^[a-z-0-9]+$/,
            "Provider ID can only contain lowercase letters and hyphens",
        ),
    idpMetadata: z.string().min(1, "IDP Metadata is required"),
    domain: z.string().min(1, "Domain is required"),
    entryPoint: z.string().min(1, "Entry Point is required"),
    cert: z.string().min(1, "Certificate is required"),
    callbackUrl: z.string().min(1, "Callback URL is required"),
});

type FormData = z.infer<typeof formSchema>;

interface NewSSOProviderProps {
    address: Address;
}

export default function NewSSOProvider({ address }: NewSSOProviderProps) {
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            providerId: "",
            idpMetadata: "",
            domain: "",
            entryPoint: "",
            cert: "",
            callbackUrl: "",
        },
    });

    const createSSOProvider = async (values: FormData) => {
        const query = `
            mutation (
                $domain: String!, 
                $idpMetadata: String!, 
                $providerId: String!, 
                $entryPoint: String!, 
                $cert: String!, 
                $callbackUrl: String!
            ) {
                ssoProvider: addSSOProvider(
                    providerId: $providerId
                    idpMetadata: $idpMetadata,
                    domain: $domain,
                    entryPoint: $entryPoint,
                    cert: $cert,
                    callbackUrl: $callbackUrl,
                ) {
                    providerId
                }
            }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload({
                query,
                variables: values,
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
                router.push(
                    `/dashboard/settings?tab=${SITE_MISCELLANEOUS_SETTING_HEADER}`,
                );
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

    return (
        <div className="flex flex-col gap-4">
            <h1 className="text-4xl font-semibold mb-4">
                {SSO_PROVIDER_NEW_HEADER}
            </h1>
            <FormProvider {...form}>
                <form
                    onSubmit={form.handleSubmit(createSSOProvider)}
                    className="flex flex-col gap-4"
                >
                    <FormField
                        control={form.control}
                        name="providerId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>
                                    {SSO_PROVIDER_PROVIDER_ID_LABEL}
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
                                    {SSO_PROVIDER_IDP_METADATA_LABEL}
                                </FormLabel>
                                <FormControl>
                                    <Textarea {...field} rows={10} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="domain"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>
                                    {SSO_PROVIDER_DOMAIN_LABEL}
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
                        name="cert"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{SSO_PROVIDER_CERT_LABEL}</FormLabel>
                                <FormControl>
                                    <Textarea {...field} rows={10} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="callbackUrl"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>
                                    {SSO_PROVIDER_CALLBACK_URL_LABEL}
                                </FormLabel>
                                <FormControl>
                                    <Input {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <div>
                        <Button type="submit" disabled={loading}>
                            {BUTTON_DONE_TEXT}
                        </Button>
                    </div>
                </form>
            </FormProvider>
            <Resources
                links={[
                    {
                        href: "https://docs.courselit.app/en/school/sso#add-sso-provider",
                        text: "Add SSO Provider",
                    },
                ]}
            />
        </div>
    );
}
