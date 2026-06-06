import constants from "@/config/constants";
import { checkOwnershipWithoutModel } from "@/lib/graphql";
import GQLContext from "@/models/GQLContext";
import { checkPermission } from "@courselit/utils";
import mongoose from "mongoose";

const { permissions } = constants;

export function getCourseManagementAccess(
    course: { creatorId: mongoose.Types.ObjectId | string },
    ctx: GQLContext,
): { canManage: boolean; isOwner: boolean } {
    if (!ctx.user) {
        return { canManage: false, isOwner: false };
    }

    if (checkPermission(ctx.user.permissions, [permissions.manageAnyCourse])) {
        return { canManage: true, isOwner: true };
    }

    const isOwner = checkOwnershipWithoutModel(course, ctx);

    return {
        canManage:
            isOwner &&
            checkPermission(ctx.user.permissions, [permissions.manageCourse]),
        isOwner,
    };
}

export function canManageCourseInContext(
    course: { creatorId: mongoose.Types.ObjectId | string },
    ctx: GQLContext,
): boolean {
    return getCourseManagementAccess(course, ctx).canManage;
}
