import React, { useEffect, useState } from "react";
import {
    TOAST_TITLE_ERROR,
    PERM_SECTION_HEADER,
    USER_PERMISSION_AREA_SUBTEXT,
} from "@ui-config/strings";
import { connect } from "react-redux";
import { FetchBuilder } from "@courselit/utils";
import type { AppDispatch, AppState } from "@courselit/state-management";
import { actionCreators } from "@courselit/state-management";
import type { User, Address, State } from "@courselit/common-models";
import { Checkbox, useToast } from "@courselit/components-library";
import { Section } from "@courselit/components-library";
import permissionToCaptionMap from "./permissions-to-caption-map";
import DocumentationLink from "@components/public/documentation-link";
import { ThunkDispatch } from "redux-thunk";
import { AnyAction } from "redux";

const { networkAction } = actionCreators;

interface PermissionsEditorProps {
    user: User;
    address: Address;
    dispatch?: AppDispatch;
    networkAction: boolean;
}

export function PermissionsEditor({
    user,
    address,
    dispatch,
    networkAction: networkCallUnderway,
}: PermissionsEditorProps) {
    const [activePermissions, setActivePermissions] = useState<string[]>([]);
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
            dispatch &&
                (dispatch as ThunkDispatch<State, null, AnyAction>)(
                    networkAction(true),
                );
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
            dispatch &&
                (dispatch as ThunkDispatch<State, null, AnyAction>)(
                    networkAction(false),
                );
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
                        disabled={networkCallUnderway}
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

const mapStateToProps = (state: AppState) => ({
    address: state.address,
    networkAction: state.networkAction,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
    dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(PermissionsEditor);
