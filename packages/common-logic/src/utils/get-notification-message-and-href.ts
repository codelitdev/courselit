import { ActivityType, Constants } from "@courselit/common-models";
import { truncate } from "@courselit/utils";
import { createNotificationEntityResolver } from "./notification-entity-resolver";

export interface NotificationReplyEntity {
    replyId: string;
    userId: string;
    content: string;
    parentReplyId?: string;
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
    lessonId?: string | null;
}

export interface NotificationCommunityEntity {
    communityId: string;
    name: string;
    courseId?: string | null;
}

export interface NotificationCourseEntity {
    courseId: string;
    title: string;
    slug?: string | null;
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
    canAccessCourseLesson?(
        courseId: string,
        lessonId: string,
        userId: string,
        domainId?: unknown,
    ): Promise<boolean>;
}

const defaultNotificationEntityResolver = createNotificationEntityResolver();

export async function getNotificationMessageAndHref({
    activityType,
    entityId,
    actorName,
    recipientUserId,
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

            const courseDiscussionNotification =
                await getCourseDiscussionNotification({
                    actorName,
                    recipientUserId,
                    entityResolver,
                    domainId,
                    metadata,
                    post,
                    community,
                    anchorId: post.postId,
                    action: "created a course discussion post",
                    hrefPrefix,
                });
            if (courseDiscussionNotification) {
                return courseDiscussionNotification;
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

            const courseDiscussionNotification =
                await getCourseDiscussionNotification({
                    actorName,
                    recipientUserId,
                    entityResolver,
                    domainId,
                    metadata,
                    post,
                    community,
                    anchorId: entityId,
                    action: "commented in a course discussion",
                    hrefPrefix,
                });
            if (courseDiscussionNotification) {
                return courseDiscussionNotification;
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

            const reply = comment.replies.find((r) => r.replyId === entityId);
            if (!reply) {
                return { message: "", href: "" };
            }

            const parentReply = reply.parentReplyId
                ? comment.replies.find((r) => r.replyId === reply.parentReplyId)
                : undefined;

            const [post, community] = await Promise.all([
                entityResolver.getPost(comment.postId, domainId),
                entityResolver.getCommunity(comment.communityId, domainId),
            ]);
            if (!post || !community) {
                return { message: "", href: "" };
            }

            const courseDiscussionNotification =
                await getCourseDiscussionNotification({
                    actorName,
                    recipientUserId,
                    entityResolver,
                    domainId,
                    metadata,
                    post,
                    community,
                    anchorId: entityId,
                    action: "replied in a course discussion",
                    hrefPrefix,
                });
            if (courseDiscussionNotification) {
                return courseDiscussionNotification;
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

            const courseDiscussionNotification =
                await getCourseDiscussionNotification({
                    actorName,
                    recipientUserId,
                    entityResolver,
                    domainId,
                    metadata,
                    post,
                    community,
                    anchorId: post.postId,
                    action: "liked your course discussion post",
                    hrefPrefix,
                });
            if (courseDiscussionNotification) {
                return courseDiscussionNotification;
            }

            return {
                message: `${actorName} liked your post '${truncate(post.title, 20).trim()}' in ${community.name}`,
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

            const courseDiscussionNotification =
                await getCourseDiscussionNotification({
                    actorName,
                    recipientUserId,
                    entityResolver,
                    domainId,
                    metadata,
                    post,
                    community,
                    anchorId: entityId,
                    action: "liked your course discussion comment",
                    hrefPrefix,
                });
            if (courseDiscussionNotification) {
                return courseDiscussionNotification;
            }

            return {
                message: `${actorName} liked your comment '${truncate(comment.content, 20).trim()}' on '${truncate(post.title, 20).trim()}' in ${community.name}`,
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

            const courseDiscussionNotification =
                await getCourseDiscussionNotification({
                    actorName,
                    recipientUserId,
                    entityResolver,
                    domainId,
                    metadata,
                    post,
                    community,
                    anchorId: entityId,
                    action: "liked your course discussion reply",
                    hrefPrefix,
                });
            if (courseDiscussionNotification) {
                return courseDiscussionNotification;
            }

            return {
                message: `${actorName} liked your reply '${truncate(reply.content, 20).trim()}' on '${truncate(post.title, 20).trim()}' in ${community.name}`,
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

        default:
            return {
                message: `${actorName} triggered ${humanizeActivityType(activityType)}`,
                href: toHref("/dashboard", hrefPrefix),
            };
    }
}

async function getCourseDiscussionNotification({
    actorName,
    recipientUserId,
    entityResolver,
    domainId,
    metadata,
    post,
    community,
    anchorId,
    action,
    hrefPrefix,
}: {
    actorName: string;
    recipientUserId: string;
    entityResolver: NotificationEntityResolver;
    domainId?: unknown;
    metadata?: Record<string, unknown>;
    post: NotificationPostEntity;
    community: NotificationCommunityEntity;
    anchorId: string;
    action: string;
    hrefPrefix: string;
}): Promise<{ message: string; href: string } | null> {
    const courseId = (metadata?.courseId as string) || community.courseId;
    const lessonId = (metadata?.lessonId as string) || post.lessonId;

    if (!courseId || !lessonId) {
        return null;
    }

    if (!entityResolver.canAccessCourseLesson) {
        return { message: "", href: "" };
    }

    const hasAccess = await entityResolver.canAccessCourseLesson(
        courseId,
        lessonId,
        recipientUserId,
        domainId,
    );
    if (!hasAccess) {
        return { message: "", href: "" };
    }

    const course = await entityResolver.getCourse(courseId, domainId);
    if (!course) {
        return { message: "", href: "" };
    }

    const coursePathId = course.slug || course.courseId;

    return {
        message: `${actorName} ${action} in ${truncate(course.title, 20).trim()}`,
        href: toHref(
            `/course/${coursePathId}/${course.courseId}/${lessonId}?discussion=open#${anchorId}`,
            hrefPrefix,
        ),
    };
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
