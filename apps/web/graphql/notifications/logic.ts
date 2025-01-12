import { checkIfAuthenticated } from "@/lib/graphql";
import {
    Constants,
    Notification,
    NotificationEntityAction,
} from "@courselit/common-models";
import Community from "@models/Community";
import CommunityComment from "@models/CommunityComment";
import CommunityPost from "@models/CommunityPost";
import GQLContext from "@models/GQLContext";
import NotificationModel, { InternalNotification } from "@models/Notification";
import UserModel from "@models/User";
import { truncate } from "@ui-lib/utils";

export async function getNotification({
    ctx,
    notificationId,
}: {
    ctx: GQLContext;
    notificationId: string;
}): Promise<Notification | null> {
    checkIfAuthenticated(ctx);

    const notification = await NotificationModel.findOne({
        domain: ctx.subdomain._id,
        forUserId: ctx.user.userId,
        notificationId,
    });

    if (!notification) {
        return null;
    }

    return await formatNotification(notification, ctx);
}

export async function getNotifications({
    ctx,
    page = 1,
    limit = 10,
}: {
    ctx: GQLContext;
    page?: number;
    limit?: number;
}): Promise<{
    notifications: Notification[];
    total: number;
}> {
    const { notifications, total } = await (NotificationModel as any).paginate(
        ctx.user.userId,
        {
            page,
            limit,
        },
    );

    const result = notifications.length
        ? {
              notifications: await formatNotifications(notifications, ctx),
              total,
          }
        : {
              notifications: [],
              total: 0,
          };

    return result;
}

async function formatNotifications(
    notifications: InternalNotification[],
    ctx: GQLContext,
): Promise<Notification[]> {
    // const users = await UserModel.find(
    //     {
    //         userId: {
    //             $in: notifications.map((n) => n.userId),
    //         },
    //     },
    //     {
    //         userId: 1,
    //         name: 1,
    //         email: 1,
    //         _id: 0,
    //     },
    // );

    return Promise.all(
        notifications.map(async (notification) => {
            return await formatNotification(notification, ctx);
        }),
    );
}

async function formatNotification(notification, ctx): Promise<Notification> {
    return {
        notificationId: notification.notificationId,
        ...(await getMessage({
            entityAction: notification.entityAction,
            entityId: notification.entityId,
            userName: await getUserName(notification.userId),
            loggedInUserId: ctx.user.userId,
            entityTargetId: notification.entityTargetId,
        })),
        read: notification.read,
        createdAt: notification.createdAt,
    };
}

async function getUserName(userId: string): Promise<string> {
    const user = await UserModel.findOne({ userId });
    return user?.name || user?.email || "Someone";
}

async function getMessage({
    entityAction,
    entityId,
    userName,
    loggedInUserId,
    entityTargetId,
}: {
    entityAction: NotificationEntityAction;
    entityId: string;
    entityTargetId?: string;
    userName: string;
    loggedInUserId: string;
}): Promise<{ message: string; href: string }> {
    switch (entityAction) {
        case Constants.NotificationEntityAction.COMMUNITY_POSTED:
            let post = await CommunityPost.findOne({
                postId: entityId,
            });
            if (!post) {
                return { message: "", href: "" };
            }
            let community = await Community.findOne({
                communityId: post.communityId,
            });
            if (!community) {
                return { message: "", href: "" };
            }
            return {
                message: `${userName} created a post '${truncate(post.title, 20)}' in ${community.name}`,
                href: `/dashboard4/community/${community.communityId}`,
            };
        case Constants.NotificationEntityAction.COMMUNITY_COMMENTED:
            const post1 = await CommunityPost.findOne({
                postId: entityId,
            });
            if (!post1) {
                return { message: "", href: "" };
            }
            const community1 = await Community.findOne({
                communityId: post1.communityId,
            });
            if (!community1) {
                return { message: "", href: "" };
            }

            return {
                message: `${userName} commented on ${loggedInUserId === post1.postId ? "your" : ""} post '${truncate(post1.title, 20)}' in ${community1.name}`,
                href: `/dashboard4/community/${community1.communityId}`,
            };
        case Constants.NotificationEntityAction.COMMUNITY_REPLIED:
            const comment = await CommunityComment.findOne({
                commentId: entityTargetId,
            });
            if (!comment) {
                return { message: "", href: "" };
            }
            const reply = comment.replies.find((r) => r.replyId === entityId);
            if (!reply) {
                return { message: "", href: "" };
            }
            let parentReply;
            if (reply.parentReplyId) {
                parentReply = comment.replies.find(
                    (r) => r.replyId === reply.parentReplyId,
                );
            }

            const [post2, community2] = await Promise.all([
                CommunityPost.findOne({
                    postId: comment.postId,
                }),
                Community.findOne({
                    communityId: comment.communityId,
                }),
            ]);

            if (!post2 || !community2) {
                return { message: "", href: "" };
            }

            const prefix = parentReply
                ? loggedInUserId === parentReply.userId
                    ? "your"
                    : "a"
                : loggedInUserId === comment.userId
                  ? "your"
                  : "a";

            return {
                message: `${userName} replied to ${prefix} comment on '${truncate(post2.title, 20)}' in ${community2.name}`,
                href: `/dashboard4/community/${community2.communityId}`,
            };
        case Constants.NotificationEntityAction.COMMUNITY_POST_LIKED:
            const post3 = await CommunityPost.findOne({
                postId: entityId,
            });
            if (!post3) {
                return { message: "", href: "" };
            }
            const community3 = await Community.findOne({
                communityId: post3.communityId,
            });
            if (!community3) {
                return { message: "", href: "" };
            }

            return {
                message: `${userName} liked your post '${truncate(post3.title, 20)}' in ${community3.name}`,
                href: `/dashboard4/community/${community3.communityId}`,
            };
        case Constants.NotificationEntityAction.COMMUNITY_COMMENT_LIKED:
            const comment1 = await CommunityComment.findOne({
                commentId: entityId,
            });
            if (!comment1) {
                return { message: "", href: "" };
            }
            const [post4, community4] = await Promise.all([
                CommunityPost.findOne({
                    postId: comment1.postId,
                }),
                Community.findOne({
                    communityId: comment1.communityId,
                }),
            ]);

            if (!post4 || !community4) {
                return { message: "", href: "" };
            }

            return {
                message: `${userName} liked your comment '${truncate(comment1.content, 20)}' on '${truncate(post4.title, 20)}' in ${community4.name}`,
                href: `/dashboard4/community/${community4.communityId}`,
            };
        case Constants.NotificationEntityAction.COMMUNITY_REPLY_LIKED:
            const comment2 = await CommunityComment.findOne({
                commentId: entityTargetId,
            });
            if (!comment2) {
                return { message: "", href: "" };
            }
            const reply1 = comment2.replies.find((r) => r.replyId === entityId);
            if (!reply1) {
                return { message: "", href: "" };
            }

            const [post5, community5] = await Promise.all([
                CommunityPost.findOne({
                    postId: comment2.postId,
                }),
                Community.findOne({
                    communityId: comment2.communityId,
                }),
            ]);

            if (!post5 || !community5) {
                return { message: "", href: "" };
            }

            return {
                message: `${userName} liked your reply '${truncate(reply1.content, 20)}' on '${truncate(post5.title, 20)}' in ${community5.name}`,
                href: `/dashboard4/community/${community5.communityId}`,
            };
        case Constants.NotificationEntityAction.COMMUNITY_MEMBERSHIP_REQUESTED:
            const community6 = await Community.findOne({
                communityId: entityId,
            });
            if (!community6) {
                return { message: "", href: "" };
            }

            return {
                message: `${userName} requested to join ${community6.name}`,
                href: `/dashboard4/community/${community6.communityId}/manage/memberships`,
            };
        case Constants.NotificationEntityAction.COMMUNITY_MEMBERSHIP_GRANTED:
            const community7 = await Community.findOne({
                communityId: entityId,
            });
            if (!community7) {
                return { message: "", href: "" };
            }

            return {
                message: `${userName} granted your request to join ${community7.name}`,
                href: `/dashboard4/community/${community7.communityId}`,
            };
        default:
            return { message: "", href: "" };
    }
}

export async function markAsRead({
    ctx,
    notificationId,
}: {
    ctx: GQLContext;
    notificationId: string;
}): Promise<boolean> {
    checkIfAuthenticated(ctx);

    await NotificationModel.updateOne(
        {
            domain: ctx.subdomain._id,
            forUserId: ctx.user.userId,
            notificationId,
        },
        {
            read: true,
        },
    );

    return true;
}

export async function markAllAsRead(ctx: GQLContext): Promise<boolean> {
    checkIfAuthenticated(ctx);

    await NotificationModel.updateMany(
        {
            domain: ctx.subdomain._id,
            forUserId: ctx.user.userId,
            read: false,
        },
        {
            read: true,
        },
    );

    return true;
}
