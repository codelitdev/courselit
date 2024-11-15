"use client";

import React, { useState, ChangeEvent, useContext } from "react";
import { Button, Form, FormField } from "@courselit/components-library";
import {
    BTN_CONTINUE,
    BTN_NEW_TAG,
    BUTTON_CANCEL_TEXT,
    USERS_MANAGER_PAGE_HEADING,
    USERS_TAG_HEADER,
    USERS_TAG_NEW_HEADER,
} from "@ui-config/strings";
import { FetchBuilder } from "@courselit/utils";
import { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AddressContext, ProfileContext } from "@components/contexts";
import DashboardContent from "@components/admin/dashboard-content";
import { UIConstants } from "@courselit/common-models";
import { checkPermission } from "@courselit/utils";
import LoadingScreen from "@components/admin/loading-screen";

const { permissions } = UIConstants;

const breadcrumbs = [
    {
        label: USERS_MANAGER_PAGE_HEADING,
        href: "/dashboard4/users",
    },
    {
        label: USERS_TAG_HEADER,
        href: "/dashboard4/users/tags",
    },
    {
        label: USERS_TAG_NEW_HEADER,
        href: "#",
    },
];

export default function Page() {
    const address = useContext(AddressContext);
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const profile = useContext(ProfileContext);

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
            const response = await fetch.exec();
            if (response.tags) {
                router.replace("/dashboard4/users/tags");
            }
        } catch (err: any) {
        } finally {
            setLoading(false);
        }
    };

    if (!checkPermission(profile.permissions!, [permissions.manageUsers])) {
        return <LoadingScreen />;
    }

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
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
                    <Button disabled={!name || loading} onClick={createTag}>
                        {BTN_CONTINUE}
                    </Button>
                    <Button
                        component="link"
                        href="/dashboard4/users/tags"
                        variant="soft"
                    >
                        {BUTTON_CANCEL_TEXT}
                    </Button>
                </div>
            </Form>
        </DashboardContent>
    );
}
