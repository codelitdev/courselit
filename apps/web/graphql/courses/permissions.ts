import GQLContext from "@/models/GQLContext";
import {
    getCourseManagementAccess as getSharedCourseManagementAccess,
    type CourseManagementAccess,
} from "@courselit/common-logic";
import mongoose from "mongoose";

export function getCourseManagementAccess(
    course: { creatorId: mongoose.Types.ObjectId | string },
    ctx: GQLContext,
): CourseManagementAccess {
    // effectively using the same checks as checkOwnershipWithoutModel
    const userId = ctx.user
        ? mongoose.Types.ObjectId.isValid(course.creatorId)
            ? ctx.user._id.toString()
            : ctx.user.userId.toString()
        : undefined;

    return getSharedCourseManagementAccess({
        creatorId: course.creatorId.toString(),
        userId,
        permissions: ctx.user?.permissions,
    });
}

export function canManageCourseInContext(
    course: { creatorId: mongoose.Types.ObjectId | string },
    ctx: GQLContext,
): boolean {
    return getCourseManagementAccess(course, ctx).canManage;
}
