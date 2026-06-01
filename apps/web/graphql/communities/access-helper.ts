import GQLContext from "@/models/GQLContext";
import CommunityModel, { InternalCommunity } from "@models/Community";
import { Constants, Membership } from "@courselit/common-models";
import MembershipModel from "@models/Membership";
import { checkPermission } from "@courselit/utils";
import constants from "../../config/constants";
import CourseModel from "@models/Course";
import { assertCourseLessonAccess, getCourseOrThrow } from "../courses/logic";
import { responses } from "@/config/strings";

const { permissions } = constants;

// Private helpers to resolve common inputs and DRY the code
async function resolveCommunity(
    ctx: GQLContext,
    communityOrId: InternalCommunity | string,
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
    return community;
}

async function isEffectiveModerator(
    ctx: GQLContext,
    community: InternalCommunity,
): Promise<boolean> {
    if (!ctx.user || !community.courseId) return false;
    try {
        const course = await getCourseOrThrow(
            undefined,
            ctx,
            community.courseId,
        );
        return !!course;
    } catch {
        return false;
    }
}

async function assertIsManagerOrModerator(
    ctx: GQLContext,
    communityId: string,
): Promise<void> {
    if (!ctx.user) {
        throw new Error(responses.action_not_allowed);
    }
    const isManager = checkPermission(ctx.user.permissions, [
        permissions.manageCommunity,
    ]);
    if (isManager) return;

    const member = await getMembership(ctx, communityId);
    if (!member || member.role !== Constants.MembershipRole.MODERATE) {
        throw new Error(responses.action_not_allowed);
    }
}

// Exported unified membership resolution helper (shared with logic.ts)
export async function getMembership(
    ctx: GQLContext,
    communityId: string,
): Promise<Membership | null> {
    return await MembershipModel.findOne({
        domain: ctx.subdomain._id,
        entityId: communityId,
        entityType: Constants.MembershipEntityType.COMMUNITY,
        userId: ctx.user.userId,
        status: Constants.MembershipStatus.ACTIVE,
    });
}

// 1. READ ACCESS
export async function assertCanReadCommunity(
    ctx: GQLContext,
    communityOrId: InternalCommunity | string,
): Promise<InternalCommunity> {
    const community = await resolveCommunity(ctx, communityOrId);

    if (community.courseId) {
        const isMod = await isEffectiveModerator(ctx, community);
        if (!isMod) {
            throw new Error(responses.action_not_allowed);
        }
    } else {
        if (!community.enabled) {
            const isManager =
                ctx.user &&
                checkPermission(ctx.user.permissions, [
                    permissions.manageCommunity,
                ]);
            if (!isManager) {
                throw new Error(responses.item_not_found);
            }
        }
    }
    return community;
}

// 2. PARTICIPATION ACCESS (Likes, reports, deletion of own comment)
export async function assertCanParticipateInCommunity(
    ctx: GQLContext,
    communityOrId: InternalCommunity | string,
    options: { lessonId?: string; post?: any } = {},
): Promise<InternalCommunity> {
    const community = await resolveCommunity(ctx, communityOrId);
    if (!ctx.user) {
        throw new Error(responses.action_not_allowed);
    }

    if (community.courseId) {
        const isMod = await isEffectiveModerator(ctx, community);
        if (!isMod) {
            const lessonId = options.lessonId || options.post?.lessonId;
            if (!lessonId) {
                throw new Error(responses.action_not_allowed);
            }
            const linkedCourse = await CourseModel.findOne({
                domain: ctx.subdomain._id,
                courseId: community.courseId,
            });
            if (!linkedCourse) {
                throw new Error(responses.item_not_found);
            }
            await assertCourseLessonAccess(ctx, linkedCourse, lessonId);
        }
    } else {
        const member = await getMembership(ctx, community.communityId);
        if (!member) {
            throw new Error(responses.action_not_allowed);
        }
    }
    return community;
}

// 3. MODERATION ACCESS
export async function assertCanModerateCommunity(
    ctx: GQLContext,
    communityOrId: InternalCommunity | string,
): Promise<InternalCommunity> {
    const community = await resolveCommunity(ctx, communityOrId);

    if (community.courseId) {
        const isMod = await isEffectiveModerator(ctx, community);
        if (!isMod) {
            throw new Error(responses.action_not_allowed);
        }
    } else {
        await assertIsManagerOrModerator(ctx, community.communityId);
    }
    return community;
}

// 4. SETTINGS & LIFE CYCLE MANAGEMENT
export async function assertCanManageCommunitySettings(
    ctx: GQLContext,
    communityOrId: InternalCommunity | string,
): Promise<InternalCommunity> {
    const community = await resolveCommunity(ctx, communityOrId);

    if (community.courseId) {
        throw new Error(responses.action_not_allowed);
    }

    await assertIsManagerOrModerator(ctx, community.communityId);
    return community;
}

// 5. POST ACTIONS (pinnings, deletions, category updates)
export async function assertCanManageCommunityPosts(
    ctx: GQLContext,
    communityOrId: InternalCommunity | string,
    options: { post?: any } = {},
): Promise<InternalCommunity> {
    const community = await resolveCommunity(ctx, communityOrId);

    if (community.courseId) {
        if (options.post?.lessonId) {
            throw new Error(responses.action_not_allowed);
        }
        const isMod = await isEffectiveModerator(ctx, community);
        if (!isMod) {
            throw new Error(responses.action_not_allowed);
        }
    } else {
        await assertIsManagerOrModerator(ctx, community.communityId);
    }
    return community;
}

// 6. COMMENT ACTIONS
export async function assertCanCommentInCommunity(
    ctx: GQLContext,
    communityOrId: InternalCommunity | string,
): Promise<InternalCommunity> {
    const community = await resolveCommunity(ctx, communityOrId);

    if (community.courseId) {
        const isMod = await isEffectiveModerator(ctx, community);
        if (!isMod) {
            throw new Error(responses.action_not_allowed);
        }
    } else {
        if (!ctx.user) {
            throw new Error(responses.action_not_allowed);
        }
        const member = await getMembership(ctx, community.communityId);
        if (!member) {
            throw new Error(responses.action_not_allowed);
        }
    }
    return community;
}
