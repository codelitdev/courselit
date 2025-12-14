import { Address } from "@courselit/common-models";
import {
    // Button,
    Form,
    FormField,
    useToast,
} from "@courselit/components-library";
import { FetchBuilder } from "@courselit/utils";
import {
    APIKEY_NEW_BTN_CAPTION,
    APIKEY_NEW_GENERATED_KEY_COPIED,
    APIKEY_NEW_GENERATED_KEY_DESC,
    APIKEY_NEW_GENERATED_KEY_HEADER,
    APIKEY_NEW_HEADER,
    APIKEY_NEW_LABEL,
    BUTTON_CANCEL_TEXT,
    BUTTON_DONE_TEXT,
    TOAST_TITLE_ERROR,
    TOAST_TITLE_SUCCESS,
} from "@ui-config/strings";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { Clipboard } from "@courselit/icons";
import { Button } from "@components/ui/button";

interface NewApikeyProps {
    address: Address;
    loading?: boolean;
}

export default function NewApikey({
    address,
    loading = false,
}: NewApikeyProps) {
    const [name, setName] = useState("");
    const [apikey, setApikey] = useState("");
    const { toast } = useToast();

    const copyApikey = (e: FormEvent) => {
        e.preventDefault();

        if (window.isSecureContext && navigator.clipboard) {
            navigator.clipboard.writeText(apikey);
            toast({
                title: TOAST_TITLE_SUCCESS,
                description: APIKEY_NEW_GENERATED_KEY_COPIED,
            });
        }
    };

    const createApikey = async (e: FormEvent) => {
        e.preventDefault();

        const query = `
            mutation {
                apikey: addApikey(
                    name: "${name}"
                ) {
                    keyId,
                    key,
                    name
                }
            }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload(query)
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            const response = await fetch.exec();
            if (response.apikey) {
                setApikey(response.apikey.key);
            }
        } catch (err: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        }
    };

    return (
        <div className="flex flex-col gap-4">
            <h1 className="text-4xl font-semibold mb-4">{APIKEY_NEW_HEADER}</h1>
            <Form
                method="post"
                onSubmit={createApikey}
                className="flex flex-col gap-4"
            >
                <FormField
                    required
                    label={APIKEY_NEW_LABEL}
                    name="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={!!apikey}
                />
                {apikey && (
                    <div className="flex flex-col gap-2">
                        <h2 className="text-lg font-medium">
                            {APIKEY_NEW_GENERATED_KEY_HEADER}
                        </h2>
                        <p className="text-slate-500">
                            {APIKEY_NEW_GENERATED_KEY_DESC}
                        </p>
                        <div className="flex gap-2 mb-4">
                            <FormField name="apikey" value={apikey} disabled />
                            <Button
                                className="px-3"
                                onClick={copyApikey}
                                size="icon"
                                variant="outline"
                            >
                                <Clipboard fontSize="small" />
                            </Button>
                        </div>
                        <Link href={`/dashboard/settings?tab=API%20Keys`}>
                            <Button>{BUTTON_DONE_TEXT}</Button>
                        </Link>
                    </div>
                )}
                {!apikey && (
                    <div className="flex gap-2">
                        <Button disabled={!name || loading} sx={{ mr: 1 }}>
                            {APIKEY_NEW_BTN_CAPTION}
                        </Button>
                        <Link href={`/dashboard/settings?tab=API%20Keys`}>
                            <Button variant="soft">{BUTTON_CANCEL_TEXT}</Button>
                        </Link>
                    </div>
                )}
            </Form>
        </div>
    );
}
