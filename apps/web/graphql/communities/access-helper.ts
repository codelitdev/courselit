import GQLContext from "@/models/GQLContext";
import CommunityModel, { InternalCommunity } from "@models/Community";
import { Constants } from "@courselit/common-models";
import MembershipModel from "@models/Membership";
import { checkPermission } from "@courselit/utils";
import constants from "../../config/constants";
import CourseModel from "@models/Course";
import { assertCourseLessonAccess, getCourseOrThrow } from "../courses/logic";
import { responses } from "@/config/strings";

const { permissions } = constants;

export type CommunityAccessAction =
    | "readFeed"
    | "readPost"
    | "comment"
    | "deleteComment"
    | "react"
    | "report"
    | "moderate"
    | "updateSettings"
    | "deleteCommunity"
    | "manageMembers"
    | "managePosts";

export async function assertCommunityAccess(
    ctx: GQLContext,
    communityOrId: InternalCommunity | string,
    action: CommunityAccessAction,
    options: {
        post?: any;
        lessonId?: string;
        courseId?: string;
        contentId?: string;
        skipCourseCheck?: boolean;
    } = {},
): Promise<InternalCommunity> {
    const domainId = ctx.subdomain._id;
    let community: InternalCommunity | null = null;

    if (typeof communityOrId === "string") {
        community = await CommunityModel.findOne({
            domain: domainId,
            communityId: communityOrId,
            deleted: false,
        });
    } else {
        community = communityOrId;
    }

    if (!community) {
        throw new Error(responses.item_not_found);
    }

    // Check if course-linked
    if (community.courseId) {
        const linkedCourse = await CourseModel.findOne({
            domain: domainId,
            courseId: community.courseId,
        });
        if (!linkedCourse) {
            throw new Error(responses.item_not_found);
        }

        // Course-linked community
        // 1. Check if user is effective moderator
        let isEffectiveModerator = false;
        if (ctx.user) {
            try {
                const courseId = community.courseId;
                const course = await getCourseOrThrow(undefined, ctx, courseId);
                if (course) {
                    isEffectiveModerator = true;
                }
            } catch (err) {
                // Not a moderator
            }
        }

        // Action routing
        if (action === "manageMembers") {
            throw new Error(responses.action_not_allowed);
        }

        if (action === "moderate") {
            if (!isEffectiveModerator) {
                const explicitMembership = ctx.user
                    ? await MembershipModel.findOne({
                          domain: domainId,
                          entityId: community.communityId,
                          entityType: Constants.MembershipEntityType.COMMUNITY,
                          userId: ctx.user.userId,
                          status: Constants.MembershipStatus.ACTIVE,
                          role: Constants.MembershipRole.MODERATE,
                      })
                    : null;

                if (!explicitMembership) {
                    throw new Error(responses.action_not_allowed);
                }
            }
            return community;
        }

        if (action === "updateSettings" || action === "deleteCommunity") {
            throw new Error(responses.action_not_allowed);
        }

        if (action === "managePosts") {
            if (options.post?.lessonId) {
                throw new Error(responses.action_not_allowed);
            }
            if (!isEffectiveModerator) {
                throw new Error(responses.action_not_allowed);
            }
            return community;
        }

        // Learner Actions
        if (action === "readFeed" || action === "readPost") {
            if (!options.skipCourseCheck && !isEffectiveModerator) {
                throw new Error(responses.action_not_allowed);
            }
            return community;
        }

        if (action === "comment") {
            if (!options.skipCourseCheck && !isEffectiveModerator) {
                throw new Error(responses.action_not_allowed);
            }
            return community;
        }

        if (
            action === "react" ||
            action === "report" ||
            action === "deleteComment"
        ) {
            if (!ctx.user) {
                throw new Error(responses.action_not_allowed);
            }

            if (!isEffectiveModerator) {
                const lessonId =
                    options.lessonId ||
                    (options.post ? options.post.lessonId : null);
                if (!lessonId) {
                    throw new Error(responses.action_not_allowed);
                }

                await assertCourseLessonAccess(ctx, linkedCourse, lessonId);
            }

            return community;
        }
    } else {
        // Standalone community
        if (action === "updateSettings" || action === "deleteCommunity") {
            if (!ctx.user) {
                throw new Error(responses.action_not_allowed);
            }
            const isManager = checkPermission(ctx.user.permissions, [
                permissions.manageCommunity,
            ]);
            if (!isManager) {
                const member = await getMembership(ctx, community.communityId);
                if (
                    !member ||
                    member.role !== Constants.MembershipRole.MODERATE
                ) {
                    throw new Error(responses.action_not_allowed);
                }
            }
            return community;
        }

        if (
            action === "moderate" ||
            action === "manageMembers" ||
            action === "managePosts"
        ) {
            if (!ctx.user) {
                throw new Error(responses.action_not_allowed);
            }
            const isManager = checkPermission(ctx.user.permissions, [
                permissions.manageCommunity,
            ]);
            if (!isManager) {
                const member = await getMembership(ctx, community.communityId);
                if (
                    !member ||
                    member.role !== Constants.MembershipRole.MODERATE
                ) {
                    throw new Error(responses.action_not_allowed);
                }
            }
            return community;
        }

        if (action === "readFeed" || action === "readPost") {
            if (!community.enabled) {
                if (
                    !ctx.user ||
                    !checkPermission(ctx.user.permissions, [
                        permissions.manageCommunity,
                    ])
                ) {
                    throw new Error(responses.item_not_found);
                }
            }
            return community;
        }

        if (action === "comment" || action === "react" || action === "report") {
            if (!ctx.user) {
                throw new Error(responses.action_not_allowed);
            }
            const member = await getMembership(ctx, community.communityId);
            if (!member) {
                throw new Error(responses.action_not_allowed);
            }
            return community;
        }
    }

    return community;
}

async function getMembership(
    ctx: GQLContext,
    communityId: string,
): Promise<any> {
    return await MembershipModel.findOne({
        domain: ctx.subdomain._id,
        entityId: communityId,
        entityType: Constants.MembershipEntityType.COMMUNITY,
        userId: ctx.user.userId,
        status: Constants.MembershipStatus.ACTIVE,
    });
}
