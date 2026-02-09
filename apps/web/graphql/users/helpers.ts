"use server";

import UserModel from "@courselit/orm-models/dao/user";
import { responses, internal } from "@/config/strings";
import constants from "@/config/constants";
import GQLContext from "@/models/GQLContext";
import {
    InternalUser,
    InternalMembership,
    InternalCourse,
} from "@courselit/common-logic";
import { Constants, UIConstants } from "@courselit/common-models";
import CourseModel from "@courselit/orm-models/dao/course";
import PageModel from "@courselit/orm-models/dao/page";
import EmailTemplateModel from "@courselit/orm-models/dao/email-template";
import SequenceModel from "@courselit/orm-models/dao/sequence";
import UserSegmentModel from "@courselit/orm-models/dao/user-segment";
import EmailDeliveryModel from "@courselit/orm-models/dao/email-delivery";
import UserThemeModel from "@courselit/orm-models/dao/user-theme";
import PaymentPlanModel from "@courselit/orm-models/dao/payment-plan";
import OngoingSequenceModel from "@courselit/orm-models/dao/ongoing-sequence";
import LessonModel from "@courselit/orm-models/dao/lesson";
import MembershipModel from "@courselit/orm-models/dao/membership";
import NotificationModel from "@courselit/orm-models/dao/notification";
import MailRequestStatusModel from "@courselit/orm-models/dao/mail-request-status";
import LessonEvaluationModel from "@courselit/orm-models/dao/lesson-evaluation";
import DownloadLinkModel from "@courselit/orm-models/dao/download-link";
import CommunityReportModel from "@courselit/orm-models/dao/community-report";
import CertificateModel from "@courselit/orm-models/dao/certificate";
import ActivityModel from "@courselit/orm-models/dao/activity";
import EmailEventModel from "@courselit/orm-models/dao/email-event";
import CommunityPostSubscriberModel from "@courselit/orm-models/dao/community-post-subscriber";
import {
    cancelAndDeleteMemberships,
    deleteCommunityPosts,
} from "../communities/logic";
import CommunityPostModel from "@courselit/orm-models/dao/community-post";
import CommunityCommentModel from "@courselit/orm-models/dao/community-comment";
import { deleteMedia } from "@/services/medialit";
import Account from "@courselit/orm-models/dao/account";

const { permissions } = UIConstants;

const CRITICAL_PERMISSIONS = [
    permissions.manageSite,
    permissions.manageSettings,
    permissions.manageUsers,
    permissions.manageCourse,
    permissions.manageCommunity,
    permissions.manageAnyCourse,
    permissions.publishCourse,
];

/**
 * Validates that the user can be safely deleted without breaking the system.
 * Ensures at least one other user has critical permissions.
 */
export async function validateUserDeletion(
    userToDelete: InternalUser,
    ctx: GQLContext,
): Promise<void> {
    for (const permission of CRITICAL_PERMISSIONS) {
        if (userToDelete.permissions?.includes(permission)) {
            const otherUsersWithPermission = await UserModel.countDocuments({
                domain: ctx.subdomain._id,
                userId: { $ne: userToDelete.userId },
                permissions: permission,
                active: true,
            });

            if (otherUsersWithPermission === 0) {
                throw new Error(
                    `${responses.cannot_delete_last_permission_user} ${permission}`,
                );
            }
        }
    }
}

/**
 * Migrates business entities from the user being deleted to the deleter user.
 * This ensures business continuity by transferring ownership of critical resources.
 */
export async function migrateBusinessEntities(
    userToDelete: InternalUser,
    deleterUser: InternalUser,
    ctx: GQLContext,
): Promise<void> {
    // ==========================================
    // COURSE OWNERSHIP MIGRATION
    // ==========================================
    const userCourses = await CourseModel.find<InternalCourse>({
        domain: ctx.subdomain._id,
        creatorId: userToDelete.userId,
    }).select("courseId");

    const courseIds = userCourses.map((course) => course.courseId);

    if (courseIds.length > 0) {
        await CourseModel.updateMany(
            {
                domain: ctx.subdomain._id,
                creatorId: userToDelete.userId,
            },
            {
                creatorId: deleterUser.userId,
            },
        );

        await PageModel.updateMany(
            {
                domain: ctx.subdomain._id,
                entityId: { $in: courseIds },
                type: constants.product,
            },
            { creatorId: deleterUser.userId },
        );
    }

    // ==========================================
    // BUSINESS ENTITY OWNERSHIP MIGRATION
    // ==========================================
    await Promise.all([
        EmailTemplateModel.updateMany(
            {
                domain: ctx.subdomain._id,
                creatorId: userToDelete.userId,
            },
            { creatorId: deleterUser.userId },
        ),
        SequenceModel.updateMany(
            {
                domain: ctx.subdomain._id,
                creatorId: userToDelete.userId,
            },
            { creatorId: deleterUser.userId },
        ),
        PageModel.updateMany(
            {
                domain: ctx.subdomain._id,
                creatorId: userToDelete.userId,
            },
            { creatorId: deleterUser.userId },
        ),
        UserSegmentModel.updateMany(
            {
                domain: ctx.subdomain._id,
                userId: userToDelete.userId,
            },
            { userId: deleterUser.userId },
        ),
        EmailDeliveryModel.updateMany(
            {
                domain: ctx.subdomain._id,
                userId: userToDelete.userId,
            },
            { userId: deleterUser.userId },
        ),
        UserThemeModel.updateMany(
            {
                domain: ctx.subdomain._id,
                userId: userToDelete.userId,
            },
            { userId: deleterUser.userId },
        ),
        PaymentPlanModel.updateMany(
            {
                domain: ctx.subdomain._id,
                userId: userToDelete.userId,
            },
            { userId: deleterUser.userId },
        ),
        OngoingSequenceModel.updateMany(
            {
                domain: ctx.subdomain._id,
                userId: userToDelete.userId,
            },
            { userId: deleterUser.userId },
        ),
    ]);

    // ==========================================
    // LESSON OWNERSHIP MIGRATION
    // ==========================================
    await LessonModel.updateMany(
        {
            domain: ctx.subdomain._id,
            creatorId: userToDelete.userId,
        },
        { creatorId: deleterUser.userId },
    );

    // ==========================================
    // COMMUNITY MODERATOR ROLE MIGRATION
    // ==========================================
    const creatorMemberships = await MembershipModel.find<InternalMembership>({
        domain: ctx.subdomain._id,
        userId: userToDelete.userId,
        entityType: Constants.MembershipEntityType.COMMUNITY,
        role: Constants.MembershipRole.MODERATE,
        joiningReason: internal.joining_reason_creator,
    });

    const communityIds = new Set<string>();

    for (const membership of creatorMemberships) {
        communityIds.add(membership.entityId);

        const existingMembership =
            await MembershipModel.findOne<InternalMembership>({
                domain: ctx.subdomain._id,
                userId: deleterUser.userId,
                entityId: membership.entityId,
                entityType: Constants.MembershipEntityType.COMMUNITY,
            });

        if (existingMembership) {
            // Update existing membership to moderator role
            existingMembership.role = Constants.MembershipRole.MODERATE;
            existingMembership.joiningReason = internal.joining_reason_creator;
            if (
                existingMembership.status !== Constants.MembershipStatus.ACTIVE
            ) {
                existingMembership.status = Constants.MembershipStatus.ACTIVE;
            }
            await existingMembership.save();
            await membership.deleteOne();
        } else {
            // Transfer membership to deleter user
            membership.userId = deleterUser.userId;
            membership.role = Constants.MembershipRole.MODERATE;
            membership.joiningReason = internal.joining_reason_creator;
            membership.status = Constants.MembershipStatus.ACTIVE;
            await membership.save();
        }
    }

    // Migrate community pages
    if (communityIds.size > 0) {
        await PageModel.updateMany(
            {
                domain: ctx.subdomain._id,
                entityId: { $in: Array.from(communityIds) },
                type: constants.communityPage,
            },
            { creatorId: deleterUser.userId },
        );
    }
}

/**
 * Cleans up personal data and user-specific records.
 * This ensures GDPR compliance by removing all personal information.
 */
export async function cleanupPersonalData(
    userToDelete: InternalUser,
    ctx: GQLContext,
): Promise<void> {
    await Promise.all([
        NotificationModel.deleteMany({
            domain: ctx.subdomain._id,
            $or: [
                { forUserId: userToDelete.userId },
                { userId: userToDelete.userId },
            ],
        }),
        MailRequestStatusModel.deleteMany({
            domain: ctx.subdomain._id,
            userId: userToDelete.userId,
        }),
        LessonEvaluationModel.deleteMany({
            domain: ctx.subdomain._id,
            userId: userToDelete.userId,
        }),
        DownloadLinkModel.deleteMany({
            domain: ctx.subdomain._id,
            userId: userToDelete.userId,
        }),
        CommunityReportModel.deleteMany({
            domain: ctx.subdomain._id,
            userId: userToDelete.userId,
        }),
        CertificateModel.deleteMany({
            domain: ctx.subdomain._id,
            userId: userToDelete.userId,
        }),
        ActivityModel.deleteMany({
            domain: ctx.subdomain._id,
            userId: userToDelete.userId,
        }),
        EmailEventModel.deleteMany({
            domain: ctx.subdomain._id,
            userId: userToDelete.userId,
        }),
        CommunityPostSubscriberModel.deleteMany({
            domain: ctx.subdomain._id,
            userId: userToDelete.userId,
        }),
    ]);

    // Delete all posts and comments created by the user
    await deleteCommunityPosts(ctx, "user", userToDelete.userId);

    // Remove user from likes on posts
    await CommunityPostModel.updateMany(
        { domain: ctx.subdomain._id },
        { $pull: { likes: userToDelete.userId } },
    );

    // Remove user from likes on comments and replies
    await CommunityCommentModel.updateMany(
        { domain: ctx.subdomain._id },
        {
            $pull: {
                likes: userToDelete.userId,
                "replies.$[].likes": userToDelete.userId,
            },
        },
    );

    // Delete memberships and cancel subscriptions
    const memberships = await MembershipModel.find<InternalMembership>({
        domain: ctx.subdomain._id,
        userId: userToDelete.userId,
    });

    // for (const membership of memberships) {
    //     // Cancel active subscriptions
    //     if (membership.subscriptionId) {
    //         const paymentMethod = await getPaymentMethodFromSettings(
    //             ctx.subdomain.settings,
    //             membership.subscriptionMethod,
    //         );
    //         await paymentMethod?.cancel(membership.subscriptionId);
    //     }

    //     // Delete associated invoices
    //     await InvoiceModel.deleteMany({
    //         domain: ctx.subdomain._id,
    //         membershipId: membership.membershipId,
    //     });

    //     // Delete membership
    //     await membership.deleteOne();
    // }
    await cancelAndDeleteMemberships(memberships, ctx);

    // Remove user from sequence entrants
    await SequenceModel.updateMany(
        { domain: ctx.subdomain._id },
        {
            $pull: {
                entrants: userToDelete.userId,
            },
        },
    );

    // Remove user from course customers
    await CourseModel.updateMany(
        { domain: ctx.subdomain._id },
        { $pull: { customers: userToDelete.userId } },
    );

    await Account.deleteOne({
        domain: ctx.subdomain._id,
        userId: userToDelete._id,
    });

    if (userToDelete.avatar?.mediaId) {
        await deleteMedia(userToDelete.avatar.mediaId);
    }

    await UserModel.deleteOne({
        domain: ctx.subdomain._id,
        _id: userToDelete._id,
    });
}
