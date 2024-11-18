"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Address, AppMessage } from "@courselit/common-models";
import {
    Form,
    FormField,
    Link,
    Button,
    ComboBox,
    Breadcrumbs,
    useToast,
} from "@courselit/components-library";
import { AppDispatch } from "@courselit/state-management";
import { FetchBuilder } from "@courselit/utils";
import {
    BTN_GO_BACK,
    BTN_INVITE,
    PRODUCT_TABLE_CONTEXT_MENU_INVITE_A_CUSTOMER,
    USER_TAGS_SUBHEADER,
} from "@/ui-config/strings";
import {
    networkAction,
    setAppMessage,
} from "@courselit/state-management/dist/action-creators";
import useCourse from "./editor/course-hook";

interface NewCustomerProps {
    address: Address;
    courseId: string;
    prefix: string;
    dispatch?: AppDispatch;
}

export default function NewCustomer({
    courseId,
    address,
    prefix,
    dispatch,
}: NewCustomerProps) {
    const [email, setEmail] = useState("");
    const [tags, setTags] = useState<string[]>([]);
    const [systemTags, setSystemTags] = useState<string[]>([]);
    const course = useCourse(courseId, address, dispatch);
    const { toast } = useToast();

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
            dispatch && dispatch(networkAction(true));
            const response = await fetch.exec();
            if (response.tags) {
                setSystemTags(response.tags);
            }
        } catch (err) {
        } finally {
            dispatch && dispatch(networkAction(false));
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
            dispatch && dispatch(networkAction(true));
            const response = await fetch.exec();
            if (response.user) {
                setEmail("");
                setTags([]);
                const message = `${response.user.email} has been invited.`;
                dispatch && dispatch(setAppMessage(new AppMessage(message)));
                toast({
                    title: "Success",
                    description: message,
                });
            }
        } catch (err: any) {
            dispatch && dispatch(setAppMessage(new AppMessage(err.message)));
            toast({
                title: "Error",
                description: err.message,
            });
        } finally {
            dispatch && dispatch(networkAction(false));
        }
    };

    return (
        <div className="flex flex-col gap-4">
            {prefix === "/dashboard" && (
                <Breadcrumbs aria-label="breakcrumb">
                    <Link href={`${prefix}/products/`}>Products</Link>
                    <Link href={`${prefix}/product/${courseId}/reports`}>
                        {course?.title || "..."}
                    </Link>
                    <p>{PRODUCT_TABLE_CONTEXT_MENU_INVITE_A_CUSTOMER}</p>
                </Breadcrumbs>
            )}
            <>
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
                            <h2>{USER_TAGS_SUBHEADER}</h2>
                            <ComboBox
                                key={
                                    JSON.stringify(systemTags) +
                                    JSON.stringify(tags)
                                }
                                side="bottom"
                                options={systemTags}
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
                            <Link
                                href={`${prefix}/product/${courseId}${
                                    prefix === "/dashboard" ? "/reports" : ""
                                }`}
                            >
                                <Button variant="soft">{BTN_GO_BACK}</Button>
                            </Link>
                        </div>
                    </Form>
                </div>
            </>
        </div>
    );
}
