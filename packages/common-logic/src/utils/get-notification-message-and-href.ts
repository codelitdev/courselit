import {
    ActivityType,
    COMMUNITY_HEART_EMOJI,
    Constants,
    type ProductDiscussionEntityType,
} from "@courselit/common-models";
import { truncate } from "@courselit/utils";
import { createNotificationEntityResolver } from "./notification-entity-resolver";
import { getCourseManagementAccess } from "./course-management-access";

export interface NotificationReplyEntity {
    replyId: string;
    userId: string;
    content: string;
    parentReplyId?: string;
    deleted?: boolean;
}

export interface NotificationCommentEntity {
    commentId: string;
    userId: string;
    content: string;
    postId: string;
    communityId: string;
    replies: NotificationReplyEntity[];
}

export interface NotificationPostEntity {
    postId: string;
    title: string;
    userId: string;
    communityId: string;
    content?: unknown;
}

export interface NotificationCommunityEntity {
    communityId: string;
    name: string;
}

export interface NotificationCourseEntity {
    courseId: string;
    title: string;
    slug?: string;
    creatorId?: string;
}

export interface NotificationDiscussionCommentEntity {
    commentId: string;
    userId: string;
    productId: string;
    entityType: ProductDiscussionEntityType;
    entityId: string;
    content: unknown;
}

export interface NotificationDiscussionReplyEntity
    extends NotificationDiscussionCommentEntity {
    replyId: string;
    parentReplyId?: string;
}

export interface NotificationEntityResolver {
    getCommunity(
        communityId: string,
        domainId?: unknown,
    ): Promise<NotificationCommunityEntity | null>;
    getPost(
        postId: string,
        domainId?: unknown,
    ): Promise<NotificationPostEntity | null>;
    getComment(
        commentId: string,
        domainId?: unknown,
    ): Promise<NotificationCommentEntity | null>;
    getCourse(
        courseId: string,
        domainId?: unknown,
    ): Promise<NotificationCourseEntity | null>;
    getDiscussionComment?(
        commentId: string,
        domainId?: unknown,
    ): Promise<NotificationDiscussionCommentEntity | null>;
    getDiscussionReply?(
        replyId: string,
        domainId?: unknown,
    ): Promise<NotificationDiscussionReplyEntity | null>;
}

const defaultNotificationEntityResolver = createNotificationEntityResolver();

export async function getNotificationMessageAndHref({
    activityType,
    entityId,
    actorName,
    recipientUserId,
    recipientPermissions = [],
    resolver,
    entityTargetId,
    metadata,
    hrefPrefix = "",
    domainId,
}: {
    activityType: ActivityType;
    entityId: string;
    actorName: string;
    recipientUserId: string;
    recipientPermissions?: string[];
    resolver?: NotificationEntityResolver;
    entityTargetId?: string;
    metadata?: Record<string, unknown>;
    hrefPrefix?: string;
    domainId?: unknown;
}): Promise<{ message: string; href: string }> {
    const entityResolver = resolver || defaultNotificationEntityResolver;

    switch (activityType) {
        case Constants.ActivityType.COMMUNITY_POST_CREATED: {
            const post = await entityResolver.getPost(entityId, domainId);
            if (!post) {
                return { message: "", href: "" };
            }

            const community = await entityResolver.getCommunity(
                post.communityId,
                domainId,
            );
            if (!community) {
                return { message: "", href: "" };
            }

            return {
                message: `${actorName} created a post '${truncate(post.title, 20).trim()}' in ${community.name}`,
                href: toHref(
                    `/dashboard/community/${community.communityId}/${post.postId}`,
                    hrefPrefix,
                ),
            };
        }

        case Constants.ActivityType.COMMUNITY_COMMENT_CREATED: {
            const postId =
                (metadata?.postId as string) ||
                (await entityResolver.getComment(entityId, domainId))?.postId ||
                entityId;

            const post = await entityResolver.getPost(postId, domainId);
            if (!post) {
                return { message: "", href: "" };
            }

            const community = await entityResolver.getCommunity(
                post.communityId,
                domainId,
            );
            if (!community) {
                return { message: "", href: "" };
            }

            return {
                message: `${actorName} commented on ${recipientUserId === post.userId ? "your" : "a"} post '${truncate(post.title, 20).trim()}' in ${community.name}`,
                href: toHref(
                    `/dashboard/community/${community.communityId}/${post.postId}#${entityId}`,
                    hrefPrefix,
                ),
            };
        }

        case Constants.ActivityType.COMMUNITY_REPLY_CREATED:
        case Constants.ActivityType.COMMUNITY_COMMENT_REPLIED: {
            const commentId =
                entityTargetId || (metadata?.commentId as string) || "";
            if (!commentId) {
                return { message: "", href: "" };
            }

            const comment = await entityResolver.getComment(
                commentId,
                domainId,
            );
            if (!comment) {
                return { message: "", href: "" };
            }

            const reply = comment.replies.find(
                (r) => r.replyId === entityId && !r.deleted,
            );
            if (!reply) {
                return { message: "", href: "" };
            }

            const parentReply = reply.parentReplyId
                ? comment.replies.find(
                      (r) => r.replyId === reply.parentReplyId && !r.deleted,
                  )
                : undefined;

            const [post, community] = await Promise.all([
                entityResolver.getPost(comment.postId, domainId),
                entityResolver.getCommunity(comment.communityId, domainId),
            ]);
            if (!post || !community) {
                return { message: "", href: "" };
            }

            const prefix = parentReply
                ? recipientUserId === parentReply.userId
                    ? "your"
                    : "a"
                : recipientUserId === comment.userId
                  ? "your"
                  : "a";

            return {
                message: `${actorName} replied to ${prefix} comment on '${truncate(post.title, 20).trim()}' in ${community.name}`,
                href: toHref(
                    `/dashboard/community/${community.communityId}/${post.postId}#${entityId}`,
                    hrefPrefix,
                ),
            };
        }

        case Constants.ActivityType.COMMUNITY_POST_LIKED: {
            const post = await entityResolver.getPost(entityId, domainId);
            if (!post) {
                return { message: "", href: "" };
            }

            const community = await entityResolver.getCommunity(
                post.communityId,
                domainId,
            );
            if (!community) {
                return { message: "", href: "" };
            }

            const emoji = (metadata?.emoji as string) || COMMUNITY_HEART_EMOJI;

            return {
                message: `${actorName} reacted ${emoji} to your post '${truncate(post.title, 20).trim()}' in ${community.name}`,
                href: toHref(
                    `/dashboard/community/${community.communityId}/${post.postId}`,
                    hrefPrefix,
                ),
            };
        }

        case Constants.ActivityType.COMMUNITY_COMMENT_LIKED: {
            const comment = await entityResolver.getComment(entityId, domainId);
            if (!comment) {
                return { message: "", href: "" };
            }

            const [post, community] = await Promise.all([
                entityResolver.getPost(comment.postId, domainId),
                entityResolver.getCommunity(comment.communityId, domainId),
            ]);
            if (!post || !community) {
                return { message: "", href: "" };
            }

            const emoji = (metadata?.emoji as string) || COMMUNITY_HEART_EMOJI;

            return {
                message: `${actorName} reacted ${emoji} to your comment '${truncate(comment.content, 20).trim()}' on '${truncate(post.title, 20).trim()}' in ${community.name}`,
                href: toHref(
                    `/dashboard/community/${community.communityId}/${post.postId}#${entityId}`,
                    hrefPrefix,
                ),
            };
        }

        case Constants.ActivityType.COMMUNITY_REPLY_LIKED: {
            const commentId =
                entityTargetId || (metadata?.commentId as string) || "";
            if (!commentId) {
                return { message: "", href: "" };
            }

            const comment = await entityResolver.getComment(
                commentId,
                domainId,
            );
            if (!comment) {
                return { message: "", href: "" };
            }

            const reply = comment.replies.find((r) => r.replyId === entityId);
            if (!reply) {
                return { message: "", href: "" };
            }

            const [post, community] = await Promise.all([
                entityResolver.getPost(comment.postId, domainId),
                entityResolver.getCommunity(comment.communityId, domainId),
            ]);
            if (!post || !community) {
                return { message: "", href: "" };
            }

            const emoji = (metadata?.emoji as string) || COMMUNITY_HEART_EMOJI;

            return {
                message: `${actorName} reacted ${emoji} to your reply '${truncate(reply.content, 20).trim()}' on '${truncate(post.title, 20).trim()}' in ${community.name}`,
                href: toHref(
                    `/dashboard/community/${community.communityId}/${post.postId}#${entityId}`,
                    hrefPrefix,
                ),
            };
        }

        case Constants.ActivityType.COMMUNITY_MEMBERSHIP_REQUESTED: {
            const community = await entityResolver.getCommunity(
                entityId,
                domainId,
            );
            if (!community) {
                return { message: "", href: "" };
            }

            return {
                message: `${actorName} requested to join ${community.name}`,
                href: toHref(
                    `/dashboard/community/${community.communityId}/manage/memberships`,
                    hrefPrefix,
                ),
            };
        }

        case Constants.ActivityType.COMMUNITY_MEMBERSHIP_GRANTED: {
            const community = await entityResolver.getCommunity(
                entityId,
                domainId,
            );
            if (!community) {
                return { message: "", href: "" };
            }

            return {
                message: `${actorName} granted your request to join ${community.name}`,
                href: toHref(
                    `/dashboard/community/${community.communityId}`,
                    hrefPrefix,
                ),
            };
        }

        case Constants.ActivityType.COMMUNITY_JOINED: {
            const community = await entityResolver.getCommunity(
                entityId,
                domainId,
            );
            if (!community) {
                return { message: "", href: "" };
            }

            return {
                message: `${actorName} joined ${community.name}`,
                href: toHref(
                    `/dashboard/community/${community.communityId}/manage/memberships`,
                    hrefPrefix,
                ),
            };
        }

        case Constants.ActivityType.COMMUNITY_LEFT: {
            const community = await entityResolver.getCommunity(
                entityId,
                domainId,
            );
            if (!community) {
                return { message: "", href: "" };
            }

            return {
                message: `${actorName} left ${community.name}`,
                href: toHref(
                    `/dashboard/community/${community.communityId}/manage/memberships`,
                    hrefPrefix,
                ),
            };
        }

        case Constants.ActivityType.NEWSLETTER_SUBSCRIBED:
            return {
                message: `${actorName} subscribed to the updates`,
                href: toHref(`/dashboard/users/${entityId}`, hrefPrefix),
            };

        case Constants.ActivityType.NEWSLETTER_UNSUBSCRIBED:
            return {
                message: `${actorName} unsubscribed from the updates`,
                href: toHref(`/dashboard/users/${entityId}`, hrefPrefix),
            };

        case Constants.ActivityType.ENROLLED: {
            const course = await entityResolver.getCourse(entityId, domainId);
            if (!course) {
                return { message: "", href: "" };
            }

            return {
                message: `${actorName} enrolled in ${truncate(course.title, 20).trim()}`,
                href: toHref(
                    `/dashboard/product/${course.courseId}/customers`,
                    hrefPrefix,
                ),
            };
        }

        case Constants.ActivityType.USER_CREATED:
            return {
                message: `${actorName} signed up`,
                href: toHref(`/dashboard/users/${entityId}`, hrefPrefix),
            };

        case Constants.ActivityType.DOWNLOADED: {
            const course = await entityResolver.getCourse(entityId, domainId);
            if (!course) {
                return { message: "", href: "" };
            }

            return {
                message: `${actorName} downloaded ${truncate(course.title, 20).trim()}`,
                href: toHref(
                    `/dashboard/product/${course.courseId}/customers`,
                    hrefPrefix,
                ),
            };
        }

        case Constants.ActivityType.COURSE_DISCUSSION_COMMENT_CREATED:
        case Constants.ActivityType.COURSE_DISCUSSION_REACTED: {
            const productId = metadata?.courseId as string | undefined;
            const entityType = metadata?.entityType as string | undefined;
            const lessonId = metadata?.entityId as string | undefined;
            const commentId = metadata?.commentId as string | undefined;
            const replyId = metadata?.replyId as string | undefined;
            const eventType = metadata?.eventType as string | undefined;
            const contentType = metadata?.contentType as string | undefined;

            if (
                !productId ||
                entityType !== Constants.ProductDiscussionEntityType.LESSON ||
                !lessonId
            ) {
                return { message: "", href: "" };
            }

            const course = await entityResolver.getCourse(productId, domainId);
            if (!course?.slug) {
                return { message: "", href: "" };
            }

            const targetId = replyId || commentId;
            const targetHash = replyId
                ? `discussion-reply-${replyId}`
                : commentId
                  ? `discussion-comment-${commentId}`
                  : undefined;
            const query = new URLSearchParams({ discussion: "open" });
            if (
                getCourseManagementAccess({
                    creatorId: String(course.creatorId),
                    userId: recipientUserId,
                    permissions: recipientPermissions,
                }).canManage
            ) {
                query.set("preview", "true");
            }

            return {
                message:
                    activityType ===
                    Constants.ActivityType.COURSE_DISCUSSION_REACTED
                        ? `${actorName} reacted to your ${contentType === Constants.ProductDiscussionContentType.REPLY ? Constants.ProductDiscussionContentType.REPLY : Constants.ProductDiscussionContentType.COMMENT} on ${truncate(course.title, 20).trim()}`
                        : `${actorName} ${eventType === "reply_created" ? "replied" : "commented"} on ${truncate(course.title, 20).trim()}`,
                href: toHref(
                    `/course/${course.slug}/${course.courseId}/${lessonId}?${query.toString()}${
                        targetId && targetHash ? `#${targetHash}` : ""
                    }`,
                    hrefPrefix,
                ),
            };
        }

        default:
            return {
                message: `${actorName} triggered ${humanizeActivityType(activityType)}`,
                href: toHref("/dashboard", hrefPrefix),
            };
    }
}

function humanizeActivityType(activityType: ActivityType): string {
    return activityType.replace(/_/g, " ");
}

function toHref(path: string, hrefPrefix: string): string {
    if (!hrefPrefix) {
        return path;
    }

    return `${hrefPrefix.replace(/\/$/, "")}${path}`;
}
