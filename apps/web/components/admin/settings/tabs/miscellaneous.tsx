import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter,
} from "@components/ui/card";
import { Checkbox } from "@components/ui/checkbox";
import { Constants, LoginProvider } from "@courselit/common-models";
import {
    ALPHA_LABEL,
    APIKEY_CARD_DESCRIPTION,
    APIKEY_EXISTING_HEADER,
    APIKEY_EXISTING_TABLE_HEADER_CREATED,
    APIKEY_EXISTING_TABLE_HEADER_NAME,
    APIKEY_NEW_BUTTON,
    APIKEY_REMOVE_BTN,
    APIKEY_REMOVE_DIALOG_DESC,
    APIKEY_REMOVE_DIALOG_HEADER,
    LOGIN_METHODS_CARD_DESCRIPTION,
    LOGIN_METHODS_HEADER,
    TOAST_TITLE_ERROR,
    TOAST_TITLE_SUCCESS,
} from "@ui-config/strings";
import { useContext, useEffect, useState } from "react";
import {
    AddressContext,
    FeaturesContext,
    SiteInfoContext,
} from "@components/contexts";
import { capitalize, FetchBuilder } from "@courselit/utils";
import {
    Chip,
    useToast,
    Table,
    TableHead,
    TableBody,
    TableRow,
    Dialog2,
} from "@courselit/components-library";
import { Button } from "@components/ui/button";
import { CogIcon, Key, Trash2 } from "lucide-react";
import Link from "next/link";

type ApiKeyListItem = {
    name: string;
    keyId: string;
    createdAt?: string | number | Date;
};

export default function MiscellaneousTab() {
    const [loading, setLoading] = useState(false);
    const features = useContext(FeaturesContext);
    const address = useContext(AddressContext);
    const siteinfo = useContext(SiteInfoContext);
    const [logins, setLogins] = useState<LoginProvider[]>(
        siteinfo.logins || [],
    );
    const [apikeyPage, setApikeyPage] = useState(1);
    const [apikeys, setApikeys] = useState<ApiKeyListItem[]>([]);
    const { toast } = useToast();

    const fetch = new FetchBuilder()
        .setUrl(`${address.backend}/api/graph`)
        .setIsGraphQLEndpoint(true);

    useEffect(() => {
        const loadApiKeys = async () => {
            const query = `
                query {
                    apikeys: getApikeys {
                        name,
                        keyId,
                        createdAt
                    }
                }
            `;
            const fetchRequest = fetch
                .setPayload({
                    query,
                })
                .build();
            setLoading(true);
            try {
                const response = await fetchRequest.exec();
                if (response.apikeys) {
                    setApikeys(response.apikeys as ApiKeyListItem[]);
                }
            } catch (error: any) {
                toast({
                    title: TOAST_TITLE_ERROR,
                    description: error.message,
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        };

        loadApiKeys();
    }, []);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({
            title: TOAST_TITLE_SUCCESS,
            description: "Webhook URL copied to clipboard",
        });
    };

    const removeApikey = async (keyId: string) => {
        const query = `
            mutation {
                removed: removeApikey(keyId: "${keyId}")
            }
        `;
        try {
            setLoading(true);
            const fetchRequest = fetch.setPayload(query).build();
            await fetchRequest.exec();
            setApikeys(apikeys.filter((item) => item.keyId !== keyId));
        } catch (e: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: e.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const toggleLoginProvider = async (provider: string, value: boolean) => {
        const query = `
            mutation toggleLoginProvider($provider: String!, $value: Boolean!) {
                providers: toggleLoginProvider(provider: $provider, value: $value)
            }
        `;
        try {
            const fetchRequest = fetch
                .setPayload({
                    query,
                    variables: {
                        provider,
                        value,
                    },
                })
                .build();
            setLoading(true);
            const response = await fetchRequest.exec();
            if (response.providers) {
                setLogins(response.providers);
            }
        } catch (error) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-4 pt-4">
            <Card>
                <CardHeader>
                    <CardTitle>{LOGIN_METHODS_HEADER}</CardTitle>
                    <CardDescription>
                        {LOGIN_METHODS_CARD_DESCRIPTION}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col gap-3">
                        {[
                            Constants.LoginProvider.EMAIL,
                            Constants.LoginProvider.SSO,
                        ].map((provider) => (
                            <div
                                className="group flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/30 px-4 py-3.5 transition-all duration-200 hover:bg-muted/60 hover:shadow-sm"
                                key={provider}
                            >
                                <div className="flex items-center gap-3 flex-1">
                                    <Checkbox
                                        disabled={
                                            loading ||
                                            (provider ===
                                                Constants.LoginProvider.SSO &&
                                                !features.includes(
                                                    Constants.Features.SSO,
                                                )) ||
                                            (provider ===
                                                Constants.LoginProvider.EMAIL &&
                                                logins.length === 1 &&
                                                logins.includes(
                                                    Constants.LoginProvider
                                                        .EMAIL,
                                                ))
                                        }
                                        checked={logins.includes(provider)}
                                        onCheckedChange={(value: boolean) => {
                                            toggleLoginProvider(
                                                provider,
                                                value,
                                            );
                                        }}
                                    />
                                    <div className="flex items-center gap-2 flex-1">
                                        <span className="font-medium text-foreground">
                                            {provider ===
                                            Constants.LoginProvider.SSO
                                                ? provider.toUpperCase()
                                                : capitalize(provider)}
                                        </span>
                                        {provider ===
                                            Constants.LoginProvider.SSO && (
                                            <>
                                                {!features.includes(
                                                    Constants.Features.SSO,
                                                ) && <Chip>Upgrade</Chip>}
                                                {<Chip>{ALPHA_LABEL}</Chip>}
                                            </>
                                        )}
                                    </div>
                                </div>
                                {provider !== Constants.LoginProvider.EMAIL && (
                                    <Link
                                        href={`/dashboard/settings/login-provider/${provider}`}
                                    >
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8"
                                            disabled={
                                                provider ===
                                                    Constants.LoginProvider
                                                        .SSO &&
                                                !features.includes(
                                                    Constants.Features.SSO,
                                                )
                                            }
                                        >
                                            <CogIcon className="w-4 h-4" />
                                        </Button>
                                    </Link>
                                )}
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>{APIKEY_EXISTING_HEADER}</CardTitle>
                    <CardDescription>
                        {APIKEY_CARD_DESCRIPTION}.{" "}
                        <a
                            href="https://docs.courselit.app/en/developers/introduction"
                            className="underline"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Learn more
                        </a>
                        .
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {apikeys.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                            <Key className="h-8 w-8 mb-2 opacity-50" />
                            <p>No API keys found</p>
                        </div>
                    ) : (
                        <Table aria-label="API keys" className="mb-4 w-full">
                            <TableHead className="border-0 border-b border-slate-200">
                                <td>{APIKEY_EXISTING_TABLE_HEADER_NAME}</td>
                                <td>{APIKEY_EXISTING_TABLE_HEADER_CREATED}</td>
                                <td align="right"> </td>
                            </TableHead>
                            <TableBody
                                endReached={true}
                                page={apikeyPage}
                                onPageChange={(value: number) => {
                                    setApikeyPage(value);
                                }}
                            >
                                {apikeys.map(
                                    (item: ApiKeyListItem, index: number) => (
                                        <TableRow key={item.name}>
                                            <td className="py-4">
                                                {item.name}
                                            </td>
                                            <td>
                                                {new Date(
                                                    item.createdAt ?? 0,
                                                ).toLocaleDateString()}
                                            </td>
                                            <td align="right">
                                                <Dialog2
                                                    title={
                                                        APIKEY_REMOVE_DIALOG_HEADER
                                                    }
                                                    trigger={
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-8 w-8"
                                                        >
                                                            <Trash2 />
                                                        </Button>
                                                    }
                                                    okButton={
                                                        <Button
                                                            onClick={() =>
                                                                removeApikey(
                                                                    item.keyId,
                                                                )
                                                            }
                                                        >
                                                            {APIKEY_REMOVE_BTN}
                                                        </Button>
                                                    }
                                                >
                                                    {APIKEY_REMOVE_DIALOG_DESC}
                                                </Dialog2>
                                            </td>
                                        </TableRow>
                                    ),
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
                <CardFooter>
                    {features.includes(Constants.Features.API) ? (
                        <Link href={`/dashboard/settings/apikeys/new`}>
                            <Button variant="secondary">
                                {APIKEY_NEW_BUTTON}
                            </Button>
                        </Link>
                    ) : (
                        <Button variant="secondary" disabled>
                            Upgrade
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}
