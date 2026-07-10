import { Constants, ActivityType } from "@courselit/common-models";
import { truncate, extractTextFromTextEditorContent } from "@courselit/utils";
import { createNotificationEntityResolver } from "./notification-entity-resolver";
import type { NotificationEntityResolver, NotificationCommentEntity, NotificationPostEntity, NotificationCommunityEntity, NotificationCourseEntity } from "./get-notification-message-and-href";

export interface RicherNotificationContent {
    message: string;
    href: string;
    subject: string;
    authorName: string;
    discussionTitle?: string;
    parentCommentContent?: string;
    commentContent?: string;
    postContent?: string;
    communityName?: string;
    courseTitle?: string;
    entityType: "community_post" | "community_comment" | "community_reply" | "course_discussion_comment" | "course_discussion_reply" | "other";
}

const defaultEntityResolver = createNotificationEntityResolver();

function extractContentString(content: unknown): string {
    if (!content) return "";
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
        return extractTextFromTextEditorContent(content as any) || "";
    }
    return String(content);
}

export async function getRicherNotificationContent({
    activityType,
    entityId,
    actorName,
    recipientUserId,
    recipientPermissions = [],
    entityTargetId,
    metadata,
    hrefPrefix = "",
    domainId,
    resolver,
}: {
    activityType: ActivityType;
    entityId: string;
    actorName: string;
    recipientUserId: string;
    recipientPermissions?: string[];
    entityTargetId?: string;
    metadata?: Record<string, unknown>;
    hrefPrefix?: string;
    domainId?: unknown;
    resolver?: NotificationEntityResolver;
}): Promise<RicherNotificationContent> {
    const entityResolver = resolver || defaultEntityResolver;

    const base: RicherNotificationContent = {
        message: "",
        href: "",
        subject: "",
        authorName: actorName,
        entityType: "other",
    };

    switch (activityType) {
        case Constants.ActivityType.COMMUNITY_POST_CREATED: {
            const post = await entityResolver.getPost(entityId, domainId);
            if (!post) return base;

            const community = await entityResolver.getCommunity(post.communityId, domainId);
            if (!community) return base;

            const postContentStr = extractContentString(metadata?.postContent);

            return {
                ...base,
                message: `${actorName} created a post '${truncate(post.title, 60).trim()}' in ${community.name}`,
                subject: `New post: ${post.title}`,
                href: toHref(`/dashboard/community/${community.communityId}/${post.postId}`, hrefPrefix),
                discussionTitle: post.title,
                postContent: postContentStr || undefined,
                communityName: community.name,
                entityType: "community_post",
            };
        }

        case Constants.ActivityType.COMMUNITY_COMMENT_CREATED: {
            const postId = (metadata?.postId as string) || (await entityResolver.getComment(entityId, domainId))?.postId || entityId;
            const post = await entityResolver.getPost(postId, domainId);
            if (!post) return base;

            const community = await entityResolver.getCommunity(post.communityId, domainId);
            if (!community) return base;

            const comment = await entityResolver.getComment(entityId, domainId);

            return {
                ...base,
                message: `${actorName} commented on ${recipientUserId === post.userId ? "your" : "a"} post '${truncate(post.title, 60).trim()}' in ${community.name}`,
                subject: `Re: ${post.title}`,
                href: toHref(`/dashboard/community/${community.communityId}/${post.postId}#${entityId}`, hrefPrefix),
                discussionTitle: post.title,
                commentContent: comment?.content ? truncate(comment.content, 200).trim() : undefined,
                communityName: community.name,
                entityType: "community_comment",
            };
        }

        case Constants.ActivityType.COMMUNITY_REPLY_CREATED:
        case Constants.ActivityType.COMMUNITY_COMMENT_REPLIED: {
            const commentId = entityTargetId || (metadata?.commentId as string) || "";
            if (!commentId) return base;

            const comment = await entityResolver.getComment(commentId, domainId);
            if (!comment) return base;

            const reply = comment.replies.find((r) => r.replyId === entityId);
            if (!reply) return base;

            const parentReply = reply.parentReplyId
                ? comment.replies.find((r) => r.replyId === reply.parentReplyId)
                : undefined;

            const [post, community] = await Promise.all([
                entityResolver.getPost(comment.postId, domainId),
                entityResolver.getCommunity(comment.communityId, domainId),
            ]);
            if (!post || !community) return base;

            const prefix = parentReply
                ? recipientUserId === parentReply.userId ? "your" : "a"
                : recipientUserId === comment.userId ? "your" : "a";

            return {
                ...base,
                message: `${actorName} replied to ${prefix} comment on '${truncate(post.title, 60).trim()}' in ${community.name}`,
                subject: `Re: ${post.title}`,
                href: toHref(`/dashboard/community/${community.communityId}/${post.postId}#${entityId}`, hrefPrefix),
                discussionTitle: post.title,
                parentCommentContent: parentReply
                    ? truncate(parentReply.content, 200).trim()
                    : comment.content
                        ? truncate(comment.content, 200).trim()
                        : undefined,
                commentContent: truncate(reply.content, 200).trim(),
                communityName: community.name,
                entityType: "community_reply",
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
            const commentContent = metadata?.commentContent as string | undefined;
            const parentCommentContent = metadata?.parentCommentContent as string | undefined;

            if (!productId || entityType !== Constants.ProductDiscussionEntityType.LESSON || !lessonId) {
                return base;
            }

            const course = await entityResolver.getCourse(productId, domainId);
            if (!course?.slug) return base;

            const targetId = replyId || commentId;
            const targetHash = replyId
                ? `discussion-reply-${replyId}`
                : commentId
                    ? `discussion-comment-${commentId}`
                    : undefined;
            const query = new URLSearchParams({ discussion: "open" });

            // Import would create circular dep, so inline the check
            const canManage = String(course.creatorId) === recipientUserId ||
                recipientPermissions.includes("course:manage_any");
            if (canManage) {
                query.set("preview", "true");
            }

            const isReply = eventType === "reply_created" || contentType === Constants.ProductDiscussionContentType.REPLY;
            const isReact = activityType === Constants.ActivityType.COURSE_DISCUSSION_REACTED;

            return {
                ...base,
                message: isReact
                    ? `${actorName} reacted to your ${contentType === Constants.ProductDiscussionContentType.REPLY ? "reply" : "comment"} on ${truncate(course.title, 60).trim()}`
                    : `${actorName} ${isReply ? "replied" : "commented"} on ${truncate(course.title, 60).trim()}`,
                subject: isReact
                    ? `Reaction on: ${course.title}`
                    : `Re: ${course.title}`,
                href: toHref(
                    `/course/${course.slug}/${course.courseId}/${lessonId}?${query.toString()}${targetId && targetHash ? `#${targetHash}` : ""}`,
                    hrefPrefix,
                ),
                discussionTitle: course.title,
                commentContent: commentContent || undefined,
                parentCommentContent: parentCommentContent || undefined,
                courseTitle: course.title,
                entityType: isReply ? "course_discussion_reply" : "course_discussion_comment",
            };
        }

        default: {
            return {
                ...base,
                message: `${actorName} triggered ${humanizeActivityType(activityType)}`,
                subject: `Notification: ${actorName}`,
                href: toHref("/dashboard", hrefPrefix),
            };
        }
    }
}

function humanizeActivityType(activityType: string): string {
    return activityType.replace(/_/g, " ");
}

function toHref(path: string, hrefPrefix: string): string {
    if (!hrefPrefix) return path;
    return `${hrefPrefix.replace(/\/$/, "")}${path}`;
}
