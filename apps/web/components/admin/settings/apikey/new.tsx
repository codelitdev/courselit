import { Address, AppMessage } from "@courselit/common-models";
import {
    Breadcrumbs,
    Button,
    Form,
    FormField,
    IconButton,
} from "@courselit/components-library";
import { AppDispatch } from "@courselit/state-management";
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
} from "@ui-config/strings";
import Link from "next/link";
import { FormEvent, useState } from "react";
import {
    networkAction,
    setAppMessage,
} from "@courselit/state-management/dist/action-creators";
import { Clipboard } from "@courselit/icons";

interface NewApikeyProps {
    address: Address;
    dispatch?: AppDispatch;
    loading?: boolean;
    prefix: string;
}

export default function NewApikey({
    address,
    dispatch,
    loading = false,
    prefix,
}: NewApikeyProps) {
    const [name, setName] = useState("");
    const [apikey, setApikey] = useState("");

    const copyApikey = (e: FormEvent) => {
        e.preventDefault();

        if (window.isSecureContext && navigator.clipboard) {
            navigator.clipboard.writeText(apikey);
            dispatch &&
                dispatch(
                    setAppMessage(
                        new AppMessage(APIKEY_NEW_GENERATED_KEY_COPIED),
                    ),
                );
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
            dispatch && dispatch(networkAction(true));
            const response = await fetch.exec();
            if (response.apikey) {
                setApikey(response.apikey.key);
            }
        } catch (err: any) {
            dispatch && dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            dispatch && dispatch(networkAction(false));
        }
    };

    return (
        <div className="flex flex-col gap-4">
            {prefix === "/dasboard" && (
                <Breadcrumbs aria-label="new-apikey-breadcrumbs">
                    <Link href="/dashboard/settings">Apikeys</Link>
                </Breadcrumbs>
            )}
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
                            <IconButton
                                className="px-3"
                                onClick={copyApikey}
                                variant="soft"
                            >
                                <Clipboard fontSize="small" />
                            </IconButton>
                        </div>
                        <Link href={`${prefix}/settings?tab=API%20Keys`}>
                            <Button>{BUTTON_DONE_TEXT}</Button>
                        </Link>
                    </div>
                )}
                {!apikey && (
                    <div className="flex gap-2">
                        <Button disabled={!name || loading} sx={{ mr: 1 }}>
                            {APIKEY_NEW_BTN_CAPTION}
                        </Button>
                        <Link href={`${prefix}/settings?tab=API%20Keys`}>
                            <Button variant="soft">{BUTTON_CANCEL_TEXT}</Button>
                        </Link>
                    </div>
                )}
            </Form>
        </div>
    );
}

// const mapStateToProps = (state: AppState) => ({
//     address: state.address,
//     networkAction: state.networkAction,
// });

// const mapDispatchToProps = (dispatch: AppDispatch) => ({ dispatch });

// export default connect(mapStateToProps, mapDispatchToProps)(NewApikey);
