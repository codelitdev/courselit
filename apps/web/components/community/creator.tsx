import { Address } from "@courselit/common-models";
import {
    Button,
    Form,
    FormField,
    useToast,
} from "@courselit/components-library";
import { FetchBuilder } from "@courselit/utils";
import {
    BUTTON_CANCEL_TEXT,
    COMMUNITY_FIELD_NAME,
    COMMUNITY_NEW_BTN_CAPTION,
    NEW_COMMUNITY_BUTTON,
} from "@ui-config/strings";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function CommunityCreator({
    address,
    prefix,
}: {
    address: Address;
    prefix;
}) {
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { toast } = useToast();

    const createCommunity = async (e: FormEvent) => {
        e.preventDefault();

        const query = `
            mutation($name: String!) {
                community: createCommunity(name: $name) {
                    communityId,
                }
            }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload({ query, variables: { name } })
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            setLoading(true);
            const response = await fetch.exec();
            if (response.community) {
                router.replace(`${prefix}/communities`);
            }
        } catch (err: any) {
            toast({
                title: "Error",
                description: err.message,
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h1 className="text-4xl font-semibold mb-4">
                {NEW_COMMUNITY_BUTTON}
            </h1>
            <Form
                method="post"
                onSubmit={createCommunity}
                className="flex flex-col gap-4"
            >
                <FormField
                    required
                    label={COMMUNITY_FIELD_NAME}
                    name="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
                <div className="flex gap-2">
                    <Button disabled={!name || loading} sx={{ mr: 1 }}>
                        {COMMUNITY_NEW_BTN_CAPTION}
                    </Button>
                    <Link href={`${prefix}/communities`}>
                        <Button variant="soft">{BUTTON_CANCEL_TEXT}</Button>
                    </Link>
                </div>
            </Form>
        </div>
    );
}
