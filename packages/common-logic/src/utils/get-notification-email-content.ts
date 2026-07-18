import {
    ActivityType,
    Constants,
    type ReplyByEmailContext,
} from "@courselit/common-models";
import { extractTextFromTextEditorContent, truncate } from "@courselit/utils";
import {
    getNotificationMessageAndHref,
    type NotificationEntityResolver,
} from "./get-notification-message-and-href";
import { createNotificationEntityResolver } from "./notification-entity-resolver";

const COMMENT_TEXT_LIMIT = 1000;
const PARENT_TEXT_LIMIT = 200;
const defaultNotificationEntityResolver = createNotificationEntityResolver();

export type { ReplyByEmailContext } from "@courselit/common-models";

export interface NotificationEmailContent {
    subject: string;
    message: string;
    href: string;
    commentText?: string;
    parentText?: string;
    parentAuthorName?: string;
    threadTitle?: string;
    conversationLabel?: "New post" | "New comment" | "New reply";
    replyContext?: ReplyByEmailContext;
}

interface GetNotificationEmailContentOptions {
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
    resolveUserName?: (userId: string) => Promise<string | undefined>;
}

export async function getNotificationEmailContent(
    options: GetNotificationEmailContentOptions,
): Promise<NotificationEmailContent> {
    const resolver = createCachedNotificationEntityResolver(
        options.resolver || defaultNotificationEntityResolver,
    );
    const { message, href } = await getNotificationMessageAndHref({
        ...options,
        resolver,
    });
    const content: NotificationEmailContent = {
        subject: message,
        message,
        href,
    };
    if (!message || !href) {
        return content;
    }

    switch (options.activityType) {
        case Constants.ActivityType.COMMUNITY_POST_CREATED: {
            const post = await resolver.getPost(
                options.entityId,
                options.domainId,
            );
            if (!post) return content;

            return {
                ...content,
                commentText: excerpt(post.content, COMMENT_TEXT_LIMIT),
                threadTitle: post.title,
                conversationLabel: "New post",
                replyContext: {
                    community: {
                        communityId: post.communityId,
                        postId: post.postId,
                    },
                },
            };
        }

        case Constants.ActivityType.COMMUNITY_COMMENT_CREATED: {
            const comment = await resolver.getComment(
                options.entityId,
                options.domainId,
            );
            if (!comment) return content;
            const post = await resolver.getPost(
                comment.postId,
                options.domainId,
            );
            if (!post) return content;

            return {
                ...content,
                commentText: excerpt(comment.content, COMMENT_TEXT_LIMIT),
                threadTitle: post.title,
                conversationLabel: "New comment",
                replyContext: {
                    community: {
                        communityId: comment.communityId,
                        postId: comment.postId,
                        parentCommentId: comment.commentId,
                    },
                },
            };
        }

        case Constants.ActivityType.COMMUNITY_REPLY_CREATED:
        case Constants.ActivityType.COMMUNITY_COMMENT_REPLIED: {
            const commentId =
                options.entityTargetId ||
                (options.metadata?.commentId as string);
            if (!commentId) return content;
            const comment = await resolver.getComment(
                commentId,
                options.domainId,
            );
            const reply = comment?.replies.find(
                (candidate) =>
                    candidate.replyId === options.entityId &&
                    !candidate.deleted,
            );
            if (!comment || !reply) return content;
            const parent = reply.parentReplyId
                ? comment.replies.find(
                      (candidate) =>
                          candidate.replyId === reply.parentReplyId &&
                          !candidate.deleted,
                  )
                : comment;
            const post = await resolver.getPost(
                comment.postId,
                options.domainId,
            );
            if (!post) return content;

            return {
                ...content,
                commentText: excerpt(reply.content, COMMENT_TEXT_LIMIT),
                parentText: parent
                    ? excerpt(parent.content, PARENT_TEXT_LIMIT)
                    : undefined,
                parentAuthorName:
                    parent && options.resolveUserName
                        ? await options.resolveUserName(parent.userId)
                        : undefined,
                threadTitle: post.title,
                conversationLabel: "New reply",
                replyContext: {
                    community: {
                        communityId: comment.communityId,
                        postId: comment.postId,
                        parentCommentId: comment.commentId,
                        parentReplyId: reply.replyId,
                    },
                },
            };
        }

        case Constants.ActivityType.COURSE_DISCUSSION_COMMENT_CREATED:
            return await getCourseDiscussionEmailContent(
                { ...options, resolver },
                content,
            );

        default:
            return content;
    }
}

async function getCourseDiscussionEmailContent(
    options: GetNotificationEmailContentOptions,
    content: NotificationEmailContent,
): Promise<NotificationEmailContent> {
    const resolver = options.resolver || defaultNotificationEntityResolver;
    const productId = options.metadata?.courseId as string | undefined;
    const entityType = options.metadata?.entityType as string | undefined;
    const entityId = options.metadata?.entityId as string | undefined;
    const commentId = options.metadata?.commentId as string | undefined;
    const replyId = options.metadata?.replyId as string | undefined;

    if (
        !resolver ||
        !productId ||
        !entityId ||
        !commentId ||
        entityType !== Constants.ProductDiscussionEntityType.LESSON
    ) {
        return content;
    }

    if (
        (replyId && !resolver.getDiscussionReply) ||
        (!replyId && !resolver.getDiscussionComment)
    ) {
        return content;
    }

    const discussionReply = replyId
        ? await resolver.getDiscussionReply!(replyId, options.domainId)
        : undefined;
    const discussionEntity = replyId
        ? discussionReply
        : await resolver.getDiscussionComment!(commentId, options.domainId);
    if (!discussionEntity) {
        return { subject: "", message: "", href: "" };
    }

    const course = await resolver.getCourse(productId, options.domainId);
    if (!course) return content;

    let parentText: string | undefined;
    let parentAuthorName: string | undefined;
    if (discussionReply) {
        const parent = discussionReply.parentReplyId
            ? await resolver.getDiscussionReply?.(
                  discussionReply.parentReplyId,
                  options.domainId,
              )
            : await resolver.getDiscussionComment?.(
                  commentId,
                  options.domainId,
              );
        parentText = parent
            ? excerpt(parent.content, PARENT_TEXT_LIMIT)
            : undefined;
        parentAuthorName =
            parent && options.resolveUserName
                ? await options.resolveUserName(parent.userId)
                : undefined;
    }

    return {
        ...content,
        commentText: excerpt(discussionEntity.content, COMMENT_TEXT_LIMIT),
        parentText,
        parentAuthorName,
        threadTitle: course.title,
        conversationLabel: replyId ? "New reply" : "New comment",
        replyContext: {
            product: {
                productId,
                entityType,
                entityId,
                commentId,
                ...(replyId ? { parentReplyId: replyId } : {}),
            },
        },
    };
}

function excerpt(value: unknown, maxLength: number): string {
    return truncate(extractTextFromTextEditorContent(value), maxLength).trim();
}

function createCachedNotificationEntityResolver(
    resolver: NotificationEntityResolver,
): NotificationEntityResolver {
    const cache = new Map<string, Promise<unknown>>();
    const cached = <T>(key: string, resolve: () => Promise<T>): Promise<T> => {
        const existing = cache.get(key);
        if (existing) {
            return existing as Promise<T>;
        }

        const result = resolve();
        cache.set(key, result);
        return result;
    };
    const key = (type: string, id: string, domainId?: unknown) =>
        `${type}:${String(domainId ?? "")}:${id}`;

    return {
        getCommunity: (communityId, domainId) =>
            cached(key("community", communityId, domainId), () =>
                resolver.getCommunity(communityId, domainId),
            ),
        getPost: (postId, domainId) =>
            cached(key("post", postId, domainId), () =>
                resolver.getPost(postId, domainId),
            ),
        getComment: (commentId, domainId) =>
            cached(key("comment", commentId, domainId), () =>
                resolver.getComment(commentId, domainId),
            ),
        getCourse: (courseId, domainId) =>
            cached(key("course", courseId, domainId), () =>
                resolver.getCourse(courseId, domainId),
            ),
        ...(resolver.getDiscussionComment
            ? {
                  getDiscussionComment: (
                      commentId: string,
                      domainId?: unknown,
                  ) =>
                      cached(
                          key("discussion-comment", commentId, domainId),
                          () =>
                              resolver.getDiscussionComment!(
                                  commentId,
                                  domainId,
                              ),
                      ),
              }
            : {}),
        ...(resolver.getDiscussionReply
            ? {
                  getDiscussionReply: (replyId: string, domainId?: unknown) =>
                      cached(key("discussion-reply", replyId, domainId), () =>
                          resolver.getDiscussionReply!(replyId, domainId),
                      ),
              }
            : {}),
    };
}
