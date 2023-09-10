import React, { useEffect, useState } from "react";
import {
    PERM_COURSE_MANAGE,
    PERM_COURSE_MANAGE_ANY,
    PERM_COURSE_PUBLISH,
    PERM_ENROLL_IN_COURSE,
    PERM_MEDIA_MANAGE,
    PERM_MEDIA_MANAGE_ANY,
    PERM_MEDIA_VIEW_ANY,
    PERM_MEDIA_UPLOAD,
    PERM_SECTION_HEADER,
    PERM_SETTINGS,
    PERM_USERS,
    PERM_SITE,
} from "../../../ui-config/strings";
import { connect } from "react-redux";
import { FetchBuilder } from "@courselit/utils";
import type { AppDispatch, AppState } from "@courselit/state-management";
import { actionCreators } from "@courselit/state-management";
import { AppMessage } from "@courselit/common-models";
import type { User, Auth, Address } from "@courselit/common-models";
import { UIConstants } from "@courselit/common-models";
import { Checkbox } from "@courselit/components-library";
import { Section } from "@courselit/components-library";

const { networkAction, setAppMessage } = actionCreators;
const { permissions } = UIConstants;

interface PermissionsEditorProps {
    user: User;
    auth: Auth;
    address: Address;
    dispatch: AppDispatch;
    networkAction: boolean;
}

function PermissionsEditor({
    user,
    auth,
    address,
    dispatch,
    networkAction: networkCallUnderway,
}: PermissionsEditorProps) {
    const [activePermissions, setActivePermissions] = useState<string[]>([]);
    const [expanded, setExpanded] = useState<boolean>(false);

    const permissionToCaptionMap = {
        [permissions.manageCourse]: PERM_COURSE_MANAGE,
        [permissions.manageAnyCourse]: PERM_COURSE_MANAGE_ANY,
        [permissions.publishCourse]: PERM_COURSE_PUBLISH,
        [permissions.enrollInCourse]: PERM_ENROLL_IN_COURSE,
        [permissions.viewAnyMedia]: PERM_MEDIA_VIEW_ANY,
        [permissions.uploadMedia]: PERM_MEDIA_UPLOAD,
        [permissions.manageMedia]: PERM_MEDIA_MANAGE,
        [permissions.manageAnyMedia]: PERM_MEDIA_MANAGE_ANY,
        [permissions.manageSite]: PERM_SITE,
        [permissions.manageSettings]: PERM_SETTINGS,
        [permissions.manageUsers]: PERM_USERS,
    };

    useEffect(() => {
        setActivePermissions(user.permissions);
    }, [user]);

    const toggleExpandedState = () => {
        setExpanded(!expanded);
    };

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
            (dispatch as ThunkDispatch<State, null, AnyAction>)(
                networkAction(true),
            );
            const response = await fetch.exec();
            if (response.user) {
                setActivePermissions(response.user.permissions);
            }
        } catch (err: any) {
            (dispatch as ThunkDispatch<State, null, AnyAction>)(
                setAppMessage(new AppMessage(err.message)),
            );
        } finally {
            (dispatch as ThunkDispatch<State, null, AnyAction>)(
                networkAction(false),
            );
        }
    };

    return (
        <Section className="md:w-1/2" header={PERM_SECTION_HEADER}>
            {Object.keys(permissionToCaptionMap).map((permission) => (
                <div className="flex justify-between" key={permission}>
                    <p>{permissionToCaptionMap[permission]}</p>
                    <Checkbox
                        name={permission}
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
    auth: state.auth,
    address: state.address,
    networkAction: state.networkAction,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
    dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(PermissionsEditor);
