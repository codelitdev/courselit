import React, { useEffect, useState } from "react";
import { TOAST_TITLE_ERROR } from "@ui-config/strings";
import { FetchBuilder } from "@courselit/utils";
import type { Address, UserWithAdminFields } from "@courselit/common-models";
import { useToast } from "@courselit/components-library";
import { Checkbox } from "@components/ui/checkbox";
import permissionToCaptionMap from "./permissions-to-caption-map";

interface PermissionsEditorProps {
    user: UserWithAdminFields & { id: string };
    address: Address;
    disabled?: boolean;
}

export default function PermissionsEditor({
    user,
    address,
    disabled: disabledProp = false,
}: PermissionsEditorProps) {
    const [activePermissions, setActivePermissions] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        setActivePermissions(user.permissions);
    }, [user]);

    const disabled = disabledProp;

    const savePermissions = async (permission: string, value: boolean) => {
        if (disabled) {
            return;
        }

        let newPermissions: string[];
        if (value) {
            newPermissions = [...activePermissions, permission];
        } else {
            newPermissions = activePermissions.filter(
                (item) => item !== permission,
            );
        }

        const mutation = `
        mutation UpdateUserPermissions($id: ID!, $permissions: [String!]!) {
            user: updateUser(userData: {
                id: $id
                permissions: $permissions
            }) { 
                permissions
            }
        }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload({
                query: mutation,
                variables: {
                    id: user.userId,
                    permissions: newPermissions,
                },
            })
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
        <div className="space-y-3">
            {Object.keys(permissionToCaptionMap).map((permission) => (
                <div
                    className="flex items-center justify-between gap-2"
                    key={permission}
                >
                    <p>{permissionToCaptionMap[permission]}</p>
                    <Checkbox
                        disabled={loading || disabled}
                        checked={activePermissions?.includes(permission)}
                        onCheckedChange={(value: boolean) =>
                            savePermissions(permission, value)
                        }
                    />
                </div>
            ))}
        </div>
    );
}
