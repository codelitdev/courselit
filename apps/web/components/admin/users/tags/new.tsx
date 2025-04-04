import React, { useState, ChangeEvent } from "react";
import { Address } from "@courselit/common-models";
import {
    Breadcrumbs,
    Button,
    Form,
    FormField,
    Link,
    useToast,
} from "@courselit/components-library";
import { AppDispatch, AppState } from "@courselit/state-management";
import {
    BTN_CONTINUE,
    BTN_NEW_TAG,
    BUTTON_CANCEL_TEXT,
    TOAST_TITLE_ERROR,
    USERS_MANAGER_PAGE_HEADING,
    USERS_TAG_HEADER,
} from "@ui-config/strings";
import { connect } from "react-redux";
import { FetchBuilder } from "@courselit/utils";
import { actionCreators } from "@courselit/state-management";
import { FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
const { networkAction } = actionCreators;

interface NewTagProps {
    address: Address;
    dispatch?: AppDispatch;
}

export function NewTag({ address, dispatch }: NewTagProps) {
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const path = usePathname();
    const { toast } = useToast();

    const createTag = async (e: FormEvent) => {
        e.preventDefault();

        const mutation = `
            mutation CreateTag($name: [String!]!) {
              tags: addTags(tags: $name)
            }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload({
                query: mutation,
                variables: {
                    name: [name],
                },
            })
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            setLoading(true);
            dispatch && dispatch(networkAction(true));
            const response = await fetch.exec();
            if (response.tags) {
                router.replace(`/dashboard/users?tab=Tags`);
            }
        } catch (err: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
            dispatch && dispatch(networkAction(false));
        }
    };

    return (
        <div className="flex flex-col">
            <div className="mb-4">
                <Breadcrumbs aria-label="breakcrumb">
                    <Link href={`/dashboard/users?tab=All%20users`}>
                        {USERS_MANAGER_PAGE_HEADING}
                    </Link>

                    <Link href={`/dashboard/users?tab=Tags`}>
                        {USERS_TAG_HEADER}
                    </Link>

                    <p>{BTN_NEW_TAG}</p>
                </Breadcrumbs>
            </div>
            <div className="flex flex-col">
                <h1 className="text-4xl font-semibold mb-4">{BTN_NEW_TAG}</h1>
                <Form onSubmit={createTag} className="flex flex-col gap-4">
                    <FormField
                        required
                        label="Tag name"
                        name="name"
                        value={name}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            setName(e.target.value)
                        }
                    />
                    <div className="flex gap-2">
                        <Button
                            disabled={!name || loading}
                            onClick={createTag}
                            sx={{ mr: 1 }}
                        >
                            {BTN_CONTINUE}
                        </Button>
                        <Button
                            component="link"
                            href={`/dashboard/users?tab=Tags`}
                            variant="soft"
                        >
                            {BUTTON_CANCEL_TEXT}
                        </Button>
                    </div>
                </Form>
            </div>
        </div>
    );
}

const mapStateToProps = (state: AppState) => ({
    address: state.address,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
    dispatch: dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(NewTag);
