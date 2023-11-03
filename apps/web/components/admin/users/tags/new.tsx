import React, { useState, ChangeEvent } from "react";
import { Address, AppMessage } from "@courselit/common-models";
import {
    Button,
    Form,
    FormField,
    Section,
} from "@courselit/components-library";
import { AppDispatch, AppState } from "@courselit/state-management";
import {
    BTN_CONTINUE,
    BTN_NEW_TAG,
    BUTTON_CANCEL_TEXT,
} from "@ui-config/strings";
import { connect } from "react-redux";
import { FetchBuilder } from "@courselit/utils";
import { actionCreators } from "@courselit/state-management";
import { useRouter } from "next/router";
import { FormEvent } from "react";
const { networkAction, setAppMessage } = actionCreators;

interface NewTagProps {
    address: Address;
    dispatch: AppDispatch;
}

function NewTag({ address, dispatch }: NewTagProps) {
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

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
            dispatch(networkAction(true));
            const response = await fetch.exec();
            if (response.tags) {
                router.replace("/dashboard/users/tags");
            }
        } catch (err: any) {
            dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            setLoading(false);
            dispatch(networkAction(false));
        }
    };

    return (
        <Section>
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
                            href="/dashboard/users/tags"
                            variant="soft"
                        >
                            {BUTTON_CANCEL_TEXT}
                        </Button>
                    </div>
                </Form>
            </div>
        </Section>
    );
}

const mapStateToProps = (state: AppState) => ({
    address: state.address,
    profile: state.profile,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
    dispatch: dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(NewTag);
