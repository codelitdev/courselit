import { UIConstants } from "@courselit/common-models";
import { checkPermission } from "@courselit/utils";

export type CourseManagementAccess = {
    canManage: boolean;
    isOwner: boolean;
};

export function getCourseManagementAccess({
    creatorId,
    userId,
    permissions,
}: {
    creatorId: string;
    userId?: string;
    permissions?: string[];
}): CourseManagementAccess {
    if (!userId) {
        return { canManage: false, isOwner: false };
    }

    if (
        checkPermission(permissions || [], [
            UIConstants.permissions.manageAnyCourse,
        ])
    ) {
        return { canManage: true, isOwner: true };
    }

    const isOwner = creatorId === userId;

    return {
        canManage:
            isOwner &&
            checkPermission(permissions || [], [
                UIConstants.permissions.manageCourse,
            ]),
        isOwner,
    };
}
