import React, { useEffect, useState } from "react";
import {
    TOAST_TITLE_ERROR,
    PERM_SECTION_HEADER,
    USER_PERMISSION_AREA_SUBTEXT,
} from "@ui-config/strings";
import { FetchBuilder } from "@courselit/utils";
import type { User, Address } from "@courselit/common-models";
import { Checkbox, useToast } from "@courselit/components-library";
import { Section } from "@courselit/components-library";
import permissionToCaptionMap from "./permissions-to-caption-map";
import DocumentationLink from "@components/public/documentation-link";

interface PermissionsEditorProps {
    user: User;
    address: Address;
}

export default function PermissionsEditor({
    user,
    address,
}: PermissionsEditorProps) {
    const [activePermissions, setActivePermissions] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        setActivePermissions(user.permissions);
    }, [user]);

    const savePermissions = async (permission: string, value: boolean) => {
        let newPermissions: string[];
        if (value) {
            newPermissions = [...activePermissions, permission];
        } else {
            newPermissions = activePermissions.filter(
                (item) => item !== permission,
            );
        }

        const mutation = `
        mutation {
            user: updateUser(userData: {
                id: "${user.id}"
                permissions: [${newPermissions
                    .map((item) => `"${item}"`)
                    .join()}]
            }) { 
                permissions
            }
        }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload(mutation)
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            setLoading(true);
            const response = await fetch.exec();
            if (response.user) {
                setActivePermissions(response.user.permissions);
            }
        } catch (err: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Section
            className="md:w-1/2"
            header={PERM_SECTION_HEADER}
            subtext={
                <span>
                    {USER_PERMISSION_AREA_SUBTEXT}{" "}
                    <DocumentationLink path="/en/users/permissions/" />.
                </span>
            }
        >
            {Object.keys(permissionToCaptionMap).map((permission) => (
                <div className="flex justify-between" key={permission}>
                    <p>{permissionToCaptionMap[permission]}</p>
                    <Checkbox
                        disabled={loading}
                        checked={activePermissions.includes(permission)}
                        onChange={(value: boolean) =>
                            savePermissions(permission, value)
                        }
                    />
                </div>
            ))}
        </Section>
    );
}
