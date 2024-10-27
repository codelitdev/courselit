"use client";

import DashboardContent from "@components/admin/dashboard-content";
import { PermissionsEditor } from "@components/admin/users/permissions-editor";
import { AddressContext } from "@components/contexts";
import { UserWithAdminFields } from "@courselit/common-models";
import { ComboBox, Link, Section, Switch } from "@courselit/components-library";
import { FetchBuilder } from "@courselit/utils";
import {
    PAGE_HEADER_ALL_USER,
    PAGE_HEADER_EDIT_USER,
    SWITCH_ACCOUNT_ACTIVE,
    USER_BASIC_DETAILS_HEADER,
    USER_EMAIL_SUBHEADER,
    USER_NAME_SUBHEADER,
    USER_TAGS_SUBHEADER,
} from "@ui-config/strings";
import { useCallback, useContext, useEffect, useState } from "react";

const breadcrumbs = [
    { label: PAGE_HEADER_ALL_USER, href: "/dashboard4/users" },
    { label: PAGE_HEADER_EDIT_USER, href: "#" },
];

export default function Page({ params }: { params: { id: string } }) {
    const [userData, setUserData] = useState<UserWithAdminFields>();
    const [_, setEnrolledCourses] = useState([]);
    const [tags, setTags] = useState([]);
    const address = useContext(AddressContext);
    const { id } = params;

    useEffect(() => {
        getUserDetails();
    }, [id]);

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
            const response = await fetch.exec();
            if (response.tags) {
                setTags(response.tags);
            }
        } catch (err) {}
    }, [address.backend]);

    useEffect(() => {
        if (userData) {
            getEnrolledCourses();
        }
        getTags();
    }, [getTags]);

    const getUserDetails = async () => {
        const query = `
    query {
        user: getUser(userId: "${id}") { 
            id,
            email,
            name,
            active,
            permissions,
            userId,
            purchases {
               courseId 
            },
            tags
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
            if (response.user) {
                setUserData(response.user);
            }
        } catch (err: any) {}
    };

    // TODO: test this method. A hard-coded userId was there in the query.
    const getEnrolledCourses = async () => {
        const query = `
    query {
      enrolledCourses: getEnrolledCourses(userId: "${userData!.id}") {
        id,
        title
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
            setEnrolledCourses(response.enrolledCourses);
        } catch (err) {}
    };

    const toggleActiveState = async (value: boolean) => {
        const mutation = `
    mutation {
      user: updateUser(userData: {
          id: "${userData!.id}"
          active: ${value}
      }) { 
        id,
        email,
        name,
        active,
        permissions,
        userId,
        tags
      }
    }
    `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload(mutation)
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            const response = await fetch.exec();
            if (response.user) {
                setUserData(response.user);
            }
        } catch (err: any) {}
    };

    const updateTags = async (tags: string[]) => {
        const mutation = `
    mutation UpdateTags($id: ID!, $tags: [String]!) {
      user: updateUser(userData: {
          id: $id,
          tags: $tags
        }) { 
        id,
        email,
        name,
        active,
        permissions,
        userId,
        tags
      }
    }
    `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload({
                query: mutation,
                variables: {
                    id: userData.id,
                    tags,
                },
            })
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            const response = await fetch.exec();
            if (response.user) {
                setUserData(response.user);
            }
        } catch (err: any) {}
    };

    if (!userData) {
        return null;
    }

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            {/* <Breadcrumbs aria-label="breakcrumb">
                <Link href={"/dashboard2/users?tab=All%20users"}>
                    {USERS_MANAGER_PAGE_HEADING}
                </Link>

                <p>{PAGE_HEADER_EDIT_USER}</p>
            </Breadcrumbs> */}
            <h1 className="text-4xl font-semibold mb-4">
                {userData.name ? userData.name : userData.email}
            </h1>
            <div className="flex gap-2">
                <Section
                    className="md:w-1/2"
                    header={USER_BASIC_DETAILS_HEADER}
                >
                    <div className="flex items-center justify-between">
                        <p>{USER_NAME_SUBHEADER}</p>
                        <p>{userData.name || "--"}</p>
                    </div>
                    <div className="flex items-center justify-between">
                        <p>{USER_EMAIL_SUBHEADER}</p>
                        <p>
                            <Link href={`mailto:${userData.email}`}>
                                {userData.email}
                            </Link>
                        </p>
                    </div>
                    <div className="flex items-center justify-between">
                        {SWITCH_ACCOUNT_ACTIVE}
                        <Switch
                            type="checkbox"
                            name="active"
                            checked={userData.active}
                            onChange={(value) => toggleActiveState(value)}
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <p>{USER_TAGS_SUBHEADER}</p>
                        <ComboBox
                            options={tags}
                            selectedOptions={new Set(userData.tags)}
                            onChange={updateTags}
                        />
                    </div>
                </Section>
                <PermissionsEditor address={address} user={userData} />
            </div>
        </DashboardContent>
    );
}
