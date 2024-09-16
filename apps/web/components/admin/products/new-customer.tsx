"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Address, AppMessage } from "@courselit/common-models";
import {
    Form,
    FormField,
    Section,
    Link,
    Button,
    ComboBox,
    Breadcrumbs,
} from "@courselit/components-library";
import { AppDispatch, AppState } from "@courselit/state-management";
import { FetchBuilder } from "@courselit/utils";
import { connect } from "react-redux";
import {
    BTN_GO_BACK,
    BTN_INVITE,
    PRODUCT_TABLE_CONTEXT_MENU_INVITE_A_CUSTOMER,
    USER_TAGS_SUBHEADER,
} from "../../../ui-config/strings";
import {
    networkAction,
    setAppMessage,
} from "@courselit/state-management/dist/action-creators";

interface NewCustomerProps {
    address: Address;
    dispatch: AppDispatch;
    networkAction: boolean;
    courseId: string;
}

function NewCustomer({
    courseId,
    address,
    dispatch,
    networkAction: loading,
}: NewCustomerProps) {
    const [email, setEmail] = useState("");
    const [tags, setTags] = useState([]);

    const getTags = useCallback(async () => {
        const query = `
            query {
                tags
            }
            `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload(query)
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            dispatch(networkAction(true));
            const response = await fetch.exec();
            if (response.tags) {
                setTags(response.tags);
            }
        } catch (err) {
        } finally {
            dispatch(networkAction(false));
        }
    }, [address.backend, dispatch]);

    useEffect(() => {
        getTags();
    }, [getTags]);

    const inviteCustomer = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const query = `
        query InviteCustomer($email: String!, $tags: [String]!, $courseId: ID!) {
          user: inviteCustomer(email: $email, tags: $tags, id: $courseId) {
                name,
                email,
                id,
                subscribedToUpdates,
                active,
                permissions,
                userId,
                tags,
                invited
            }
        }
    `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload({
                query,
                variables: {
                    email: email,
                    tags: tags,
                    courseId: courseId,
                },
            })
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            dispatch(networkAction(true));
            const response = await fetch.exec();
            if (response.user) {
                setEmail("");
                dispatch(
                    setAppMessage(
                        new AppMessage(
                            `${response.user.email} has been invited.`,
                        ),
                    ),
                );
            }
        } catch (err: any) {
            dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            dispatch(networkAction(false));
        }
    };

    return (
        <div className="flex flex-col gap-4">
            <Breadcrumbs aria-label="breakcrumb">
                <Link href="/dashboard/products/">Products</Link>
                <Link href={`/dashboard/product/${courseId}/reports`}>Product</Link>
                <p>{PRODUCT_TABLE_CONTEXT_MENU_INVITE_A_CUSTOMER}</p>
            </Breadcrumbs>
            <Section>
                <div className="flex flex-col">
                    <h1 className="text-4xl font-semibold mb-4">
                        {PRODUCT_TABLE_CONTEXT_MENU_INVITE_A_CUSTOMER}
                    </h1>
                    <Form
                        onSubmit={inviteCustomer}
                        className="flex flex-col gap-4"
                    >
                        <FormField
                            required
                            label="Email"
                            name="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <div className="flex flex-col gap-2">
                            <p>{USER_TAGS_SUBHEADER}</p>
                            <ComboBox
                                side="bottom"
                                options={tags}
                                selectedOptions={new Set(tags)}
                                onChange={(values: string[]) => setTags(values)}
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button
                                disabled={!email}
                                onClick={inviteCustomer}
                                sx={{ mr: 1 }}
                            >
                                {BTN_INVITE}
                            </Button>
                            <Link href={`/dashboard/products`}>
                                <Button variant="soft">{BTN_GO_BACK}</Button>
                            </Link>
                        </div>
                    </Form>
                </div>
            </Section>
        </div>
    );
}

const mapStateToProps = (state: AppState) => ({
    address: state.address,
    networkAction: state.networkAction,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({ dispatch });

export default connect(mapStateToProps, mapDispatchToProps)(NewCustomer);
