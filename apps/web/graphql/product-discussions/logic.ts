import { responses } from "@/config/strings";
import appConstants from "@/config/constants";
import CourseModel from "@/models/Course";
import ProductDiscussionCommentModel from "@/models/ProductDiscussionComment";
import ProductDiscussionLikeModel from "@/models/ProductDiscussionLike";
import ProductDiscussionReplyModel from "@/models/ProductDiscussionReply";
import ProductDiscussionReportModel from "@/models/ProductDiscussionReport";
import ProductDiscussionSubscriberModel from "@/models/ProductDiscussionSubscriber";
import ProductDiscussionSummaryModel from "@/models/ProductDiscussionSummary";
import RateLimitEventModel from "@/models/RateLimitEvent";
import UserModel from "@/models/User";
import LessonModel from "@/models/Lesson";
import GQLContext from "@/models/GQLContext";
import { Constants, TextEditorContent } from "@courselit/common-models";
import { getLessonDetails } from "../lessons/logic";
import {
    checkPermission,
    extractTextFromTextEditorContent,
} from "@courselit/utils";
import mongoose from "mongoose";
import { randomUUID } from "crypto";
import { recordActivity } from "@/lib/record-activity";
import { checkOwnershipWithoutModel } from "@/lib/graphql";
import { canManageCourseInContext } from "../courses/permissions";

export const MAX_DISCUSSION_CONTENT_BYTES = 32768;
export const MAX_DISCUSSION_TEXT_LENGTH = 5000;

export const COURSE_DISCUSSION_RATE_LIMITS = {
    commentsPerMinute: { window: 60 * 1000, limit: 5 },
    commentsPerDay: { window: 24 * 60 * 60 * 1000, limit: 50 },
    likesPerMinute: { window: 60 * 1000, limit: 60 },
    reportsPerHour: { window: 60 * 60 * 1000, limit: 10 },
} as const;

export type ProductDiscussionEntityType = "lesson" | "product";
export type ProductDiscussionContentType = "comment" | "reply";

const { permissions } = appConstants;

type CursorEnvelope<T> = {
    items: T[];
    nextCursor?: string;
    hasMore: boolean;
};

type CommentCursor = {
    createdAt: string;
    commentId: string;
};

type ReplyCursor = {
    createdAt: string;
    replyId: string;
};

type ReportCursor = {
    createdAt: string;
    reportId: string;
};

type SummaryCursor = {
    lastActivityAt: string;
    entityId: string;
};

type ProductDiscussionReportStatus = "pending" | "accepted" | "rejected";

export async function validateDiscussionTargetForLearner({
    ctx,
    productId,
    entityType,
    entityId,
}: {
    ctx: GQLContext;
    productId: string;
    entityType: ProductDiscussionEntityType;
    entityId: string;
}) {
    if (entityType === "product") {
        throw new Error(responses.action_not_allowed);
    }

    const product = await CourseModel.findOne({
        domain: ctx.subdomain._id,
        courseId: productId,
    });

    if (!product || product.type !== Constants.CourseType.COURSE) {
        throw new Error(responses.item_not_found);
    }

    if (!product.discussions) {
        throw new Error(responses.action_not_allowed);
    }

    const isAdminOrCreator =
        ctx.user &&
        (checkPermission(ctx.user.permissions, [permissions.manageAnyCourse]) ||
            (checkPermission(ctx.user.permissions, [
                permissions.manageCourse,
            ]) &&
                checkOwnershipWithoutModel(product, ctx)));

    let lesson;
    if (isAdminOrCreator) {
        lesson = await LessonModel.findOne({
            lessonId: entityId,
            domain: ctx.subdomain._id,
            courseId: productId,
        });
        if (!lesson) {
            throw new Error(responses.item_not_found);
        }
    } else {
        lesson = await getLessonDetails(entityId, ctx, productId);
    }

    return {
        product,
        lesson,
        productId,
        entityType,
        entityId,
    };
}

export function validateDiscussionContent(content: unknown): TextEditorContent {
    if (!content || typeof content !== "object") {
        throw new Error(responses.invalid_input);
    }

    const doc = content as TextEditorContent;
    if (doc.type !== "doc") {
        throw new Error(responses.invalid_input);
    }

    const contentBytes = Buffer.byteLength(JSON.stringify(doc), "utf8");
    if (contentBytes > MAX_DISCUSSION_CONTENT_BYTES) {
        throw new Error(responses.invalid_input);
    }

    const text = extractTextFromTextEditorContent(doc);
    if (!text.trim() || text.length > MAX_DISCUSSION_TEXT_LENGTH) {
        throw new Error(responses.invalid_input);
    }

    return doc;
}

export async function assertRateLimit({
    domain,
    userId,
    scope,
    action,
    subjectId,
    window,
    limit,
    fingerprint,
    record = true,
}: {
    domain: mongoose.Types.ObjectId;
    userId: string;
    scope: string;
    action: string;
    subjectId: string;
    window: number;
    limit: number;
    fingerprint?: string;
    record?: boolean;
}) {
    const since = new Date(Date.now() - window);
    const existingEvents = await RateLimitEventModel.countDocuments({
        domain,
        userId,
        scope,
        action,
        subjectId,
        createdAt: { $gte: since },
    });

    if (existingEvents >= limit) {
        throw new Error(responses.action_not_allowed);
    }

    if (fingerprint) {
        const duplicate = await RateLimitEventModel.findOne({
            domain,
            userId,
            scope,
            subjectId,
            fingerprint,
            createdAt: { $gte: since },
        }).select("_id");

        if (duplicate) {
            throw new Error(responses.action_not_allowed);
        }
    }

    if (record) {
        await RateLimitEventModel.create({
            domain,
            userId,
            scope,
            action,
            subjectId,
            fingerprint,
        });
    }
}

export async function createDiscussionComment({
    ctx,
    productId,
    entityType,
    entityId,
    content,
}: {
    ctx: GQLContext;
    productId: string;
    entityType: ProductDiscussionEntityType;
    entityId: string;
    content: unknown;
}) {
    const target = await validateDiscussionTargetForLearner({
        ctx,
        productId,
        entityType,
        entityId,
    });
    const validatedContent = validateDiscussionContent(content);
    const subjectId = getDiscussionSubjectId({
        productId,
        entityType,
        entityId,
    });

    await assertRateLimit({
        domain: ctx.subdomain._id,
        userId: ctx.user.userId,
        scope: "course_discussion",
        action: "comment:create",
        subjectId,
        window: COURSE_DISCUSSION_RATE_LIMITS.commentsPerDay.window,
        limit: COURSE_DISCUSSION_RATE_LIMITS.commentsPerDay.limit,
        record: false,
    });

    await assertRateLimit({
        domain: ctx.subdomain._id,
        userId: ctx.user.userId,
        scope: "course_discussion",
        action: "comment:create",
        subjectId,
        window: COURSE_DISCUSSION_RATE_LIMITS.commentsPerMinute.window,
        limit: COURSE_DISCUSSION_RATE_LIMITS.commentsPerMinute.limit,
        fingerprint: getContentFingerprint(validatedContent),
    });

    const comment = await ProductDiscussionCommentModel.create({
        domain: ctx.subdomain._id,
        productId,
        entityType,
        entityId,
        commentId: randomUUID(),
        userId: ctx.user.userId,
        content: validatedContent,
    });

    await Promise.all([
        updateSummaryForCreate({
            domain: ctx.subdomain._id,
            productId,
            entityType,
            entityId,
            commentId: comment.commentId,
            createdAt: comment.createdAt,
            type: "comment",
        }),
        upsertSubscriber({
            domain: ctx.subdomain._id,
            productId,
            entityType,
            entityId,
            userId: ctx.user.userId,
        }),
    ]);

    await recordDiscussionActivity({
        ctx,
        product: target.product,
        productId,
        entityType,
        entityId,
        eventType: "comment_created",
        commentId: comment.commentId,
    });

    return comment;
}

export async function createDiscussionReply({
    ctx,
    productId,
    entityType,
    entityId,
    commentId,
    parentReplyId,
    content,
}: {
    ctx: GQLContext;
    productId: string;
    entityType: ProductDiscussionEntityType;
    entityId: string;
    commentId: string;
    parentReplyId?: string;
    content: unknown;
}) {
    const target = await validateDiscussionTargetForLearner({
        ctx,
        productId,
        entityType,
        entityId,
    });
    const validatedContent = validateDiscussionContent(content);
    const subjectId = getDiscussionSubjectId({
        productId,
        entityType,
        entityId,
    });

    const comment = await ProductDiscussionCommentModel.findOne({
        domain: ctx.subdomain._id,
        productId,
        entityType,
        entityId,
        commentId,
    });
    if (!comment || comment.deleted) {
        throw new Error(responses.item_not_found);
    }

    if (parentReplyId) {
        const parentReply = await ProductDiscussionReplyModel.findOne({
            domain: ctx.subdomain._id,
            productId,
            entityType,
            entityId,
            commentId,
            replyId: parentReplyId,
        }).select("_id");
        if (!parentReply) {
            throw new Error(responses.item_not_found);
        }
    }

    await assertRateLimit({
        domain: ctx.subdomain._id,
        userId: ctx.user.userId,
        scope: "course_discussion",
        action: "reply:create",
        subjectId,
        window: COURSE_DISCUSSION_RATE_LIMITS.commentsPerDay.window,
        limit: COURSE_DISCUSSION_RATE_LIMITS.commentsPerDay.limit,
        record: false,
    });

    await assertRateLimit({
        domain: ctx.subdomain._id,
        userId: ctx.user.userId,
        scope: "course_discussion",
        action: "reply:create",
        subjectId,
        window: COURSE_DISCUSSION_RATE_LIMITS.commentsPerMinute.window,
        limit: COURSE_DISCUSSION_RATE_LIMITS.commentsPerMinute.limit,
        fingerprint: getContentFingerprint(validatedContent),
    });

    const reply = await ProductDiscussionReplyModel.create({
        domain: ctx.subdomain._id,
        productId,
        entityType,
        entityId,
        commentId,
        replyId: randomUUID(),
        parentReplyId,
        userId: ctx.user.userId,
        content: validatedContent,
    });

    await Promise.all([
        updateSummaryForCreate({
            domain: ctx.subdomain._id,
            productId,
            entityType,
            entityId,
            replyId: reply.replyId,
            createdAt: reply.createdAt,
            type: "reply",
        }),
        upsertSubscriber({
            domain: ctx.subdomain._id,
            productId,
            entityType,
            entityId,
            userId: ctx.user.userId,
        }),
    ]);

    await recordDiscussionActivity({
        ctx,
        product: target.product,
        productId,
        entityType,
        entityId,
        eventType: "reply_created",
        commentId,
        replyId: reply.replyId,
    });

    return reply;
}

export async function listDiscussionComments({
    ctx,
    productId,
    entityType,
    entityId,
    targetContentType,
    targetContentId,
    cursor,
    limit = 10,
    replyPreviewLimit = 2,
}: {
    ctx: GQLContext;
    productId: string;
    entityType: ProductDiscussionEntityType;
    entityId: string;
    targetContentType?: ProductDiscussionContentType;
    targetContentId?: string;
    cursor?: string;
    limit?: number;
    replyPreviewLimit?: number;
}): Promise<CursorEnvelope<any>> {
    assertLessonDiscussionTarget(entityType);

    await validateDiscussionTargetForLearner({
        ctx,
        productId,
        entityType,
        entityId,
    });

    const filter: Record<string, unknown> = {
        domain: ctx.subdomain._id,
        productId,
        entityType,
        entityId,
    };
    const decodedCursor = cursor ? decodeCursor<CommentCursor>(cursor) : null;
    if (decodedCursor) {
        filter.$or = [
            { createdAt: { $lt: new Date(decodedCursor.createdAt) } },
            {
                createdAt: new Date(decodedCursor.createdAt),
                commentId: { $lt: decodedCursor.commentId },
            },
        ];
    }

    const targetComment = !cursor
        ? await getTargetCommentForList({
              domain: ctx.subdomain._id,
              productId,
              entityType,
              entityId,
              targetContentType,
              targetContentId,
          })
        : null;

    const comments = await ProductDiscussionCommentModel.find({
        ...filter,
        ...(targetComment
            ? { commentId: { $ne: targetComment.commentId } }
            : {}),
    })
        .sort({ createdAt: -1, commentId: -1 })
        .limit(limit + 1 - (targetComment ? 1 : 0));
    const visibleComments = [
        ...(targetComment ? [targetComment] : []),
        ...comments.slice(0, limit - (targetComment ? 1 : 0)),
    ];
    const commentIds = visibleComments.map((comment) => comment.commentId);
    const repliesByCommentId = new Map<string, any[]>();
    const replyCountsByCommentId = new Map<string, number>();

    const commentReplyData = await Promise.all(
        visibleComments.map(async (comment) => {
            const [replyCount, repliesPage, targetReply] = await Promise.all([
                ProductDiscussionReplyModel.countDocuments({
                    domain: ctx.subdomain._id,
                    commentId: comment.commentId,
                }),
                ProductDiscussionReplyModel.find({
                    domain: ctx.subdomain._id,
                    commentId: comment.commentId,
                })
                    .sort({ createdAt: 1, replyId: 1 })
                    .limit(replyPreviewLimit + 1),
                targetContentType === "reply" && targetContentId
                    ? ProductDiscussionReplyModel.findOne({
                          domain: ctx.subdomain._id,
                          productId,
                          entityType,
                          entityId,
                          commentId: comment.commentId,
                          replyId: targetContentId,
                      })
                    : null,
            ]);
            const visibleReplies = repliesPage.slice(0, replyPreviewLimit);
            const lastVisibleReply = visibleReplies[visibleReplies.length - 1];
            const replies =
                targetReply &&
                !visibleReplies.some(
                    (reply) => reply.replyId === targetReply.replyId,
                )
                    ? [targetReply, ...visibleReplies]
                    : visibleReplies;

            return {
                commentId: comment.commentId,
                replyCount,
                replies,
                hasMoreReplies: repliesPage.length > replyPreviewLimit,
                replyNextCursor:
                    repliesPage.length > replyPreviewLimit && lastVisibleReply
                        ? encodeCursor({
                              createdAt:
                                  lastVisibleReply.createdAt.toISOString(),
                              replyId: lastVisibleReply.replyId,
                          })
                        : undefined,
            };
        }),
    );
    for (const { commentId, replyCount, replies } of commentReplyData) {
        replyCountsByCommentId.set(commentId, replyCount);
        repliesByCommentId.set(commentId, replies);
    }

    const previewReplyIds = commentReplyData.flatMap(({ replies }) =>
        replies.map((reply) => reply.replyId),
    );
    const likedContentIds = await getLikedContentIds({
        domain: ctx.subdomain._id,
        userId: ctx.user.userId,
        contentIds: [...commentIds, ...previewReplyIds],
    });

    const items = visibleComments.map((comment) => ({
        ...formatDiscussionContent(comment, "comment", {
            redactDeleted: true,
        }),
        hasLiked: likedContentIds.has(comment.commentId),
        replyCount: replyCountsByCommentId.get(comment.commentId) || 0,
        replyNextCursor: commentReplyData.find(
            (replyData) => replyData.commentId === comment.commentId,
        )?.replyNextCursor,
        hasMoreReplies: Boolean(
            commentReplyData.find(
                (replyData) => replyData.commentId === comment.commentId,
            )?.hasMoreReplies,
        ),
        replies: (repliesByCommentId.get(comment.commentId) || []).map(
            (reply) => ({
                ...formatDiscussionContent(reply, "reply", {
                    redactDeleted: true,
                }),
                hasLiked: likedContentIds.has(reply.replyId),
            }),
        ),
    }));

    const hasMore = comments.length > limit - (targetComment ? 1 : 0);
    const lastItem = visibleComments[visibleComments.length - 1];

    return {
        items,
        hasMore,
        nextCursor:
            hasMore && lastItem
                ? encodeCursor({
                      createdAt: lastItem.createdAt.toISOString(),
                      commentId: lastItem.commentId,
                  })
                : undefined,
    };
}

export async function listDiscussionReplies({
    ctx,
    commentId,
    cursor,
    limit = 10,
}: {
    ctx: GQLContext;
    commentId: string;
    cursor?: string;
    limit?: number;
}): Promise<CursorEnvelope<any>> {
    const comment = await ProductDiscussionCommentModel.findOne({
        domain: ctx.subdomain._id,
        commentId,
    });
    if (!comment) {
        throw new Error(responses.item_not_found);
    }
    assertLessonDiscussionTarget(comment.entityType);

    await validateDiscussionTargetForLearner({
        ctx,
        productId: comment.productId,
        entityType: comment.entityType,
        entityId: comment.entityId,
    });

    const filter: Record<string, unknown> = {
        domain: ctx.subdomain._id,
        commentId,
    };
    const decodedCursor = cursor ? decodeCursor<ReplyCursor>(cursor) : null;
    if (decodedCursor) {
        filter.$or = [
            { createdAt: { $gt: new Date(decodedCursor.createdAt) } },
            {
                createdAt: new Date(decodedCursor.createdAt),
                replyId: { $gt: decodedCursor.replyId },
            },
        ];
    }

    const replies = await ProductDiscussionReplyModel.find(filter)
        .sort({ createdAt: 1, replyId: 1 })
        .limit(limit + 1);
    const visibleReplies = replies.slice(0, limit);
    const likedContentIds = await getLikedContentIds({
        domain: ctx.subdomain._id,
        userId: ctx.user.userId,
        contentIds: visibleReplies.map((reply) => reply.replyId),
    });
    const hasMore = replies.length > limit;
    const lastItem = visibleReplies[visibleReplies.length - 1];

    return {
        items: visibleReplies.map((reply) => ({
            ...formatDiscussionContent(reply, "reply", {
                redactDeleted: true,
            }),
            hasLiked: likedContentIds.has(reply.replyId),
        })),
        hasMore,
        nextCursor:
            hasMore && lastItem
                ? encodeCursor({
                      createdAt: lastItem.createdAt.toISOString(),
                      replyId: lastItem.replyId,
                  })
                : undefined,
    };
}

async function getLikedContentIds({
    domain,
    userId,
    contentIds,
}: {
    domain: mongoose.Types.ObjectId;
    userId: string;
    contentIds: string[];
}) {
    if (!contentIds.length) {
        return new Set<string>();
    }

    const likes = await ProductDiscussionLikeModel.find({
        domain,
        userId,
        contentId: { $in: contentIds },
    }).select("contentId");

    return new Set(likes.map((like) => like.contentId));
}

async function getTargetCommentForList({
    domain,
    productId,
    entityType,
    entityId,
    targetContentType,
    targetContentId,
}: {
    domain: mongoose.Types.ObjectId;
    productId: string;
    entityType: ProductDiscussionEntityType;
    entityId: string;
    targetContentType?: ProductDiscussionContentType;
    targetContentId?: string;
}) {
    if (!targetContentType || !targetContentId) {
        return null;
    }

    if (targetContentType === "comment") {
        return await ProductDiscussionCommentModel.findOne({
            domain,
            productId,
            entityType,
            entityId,
            commentId: targetContentId,
        });
    }

    const reply = await ProductDiscussionReplyModel.findOne({
        domain,
        productId,
        entityType,
        entityId,
        replyId: targetContentId,
    }).select("commentId");
    if (!reply) {
        return null;
    }

    return await ProductDiscussionCommentModel.findOne({
        domain,
        productId,
        entityType,
        entityId,
        commentId: reply.commentId,
    });
}

function formatDiscussionContent(
    item: any,
    type: ProductDiscussionContentType,
    { redactDeleted }: { redactDeleted: boolean },
) {
    const object = item.toObject();
    const id = type === "comment" ? object.commentId : object.replyId;

    return {
        ...object,
        content: redactDeleted && object.deleted ? null : object.content,
        contentId: id,
    };
}

export async function toggleDiscussionLike({
    ctx,
    productId,
    entityType,
    entityId,
    contentType,
    contentId,
    liked,
}: {
    ctx: GQLContext;
    productId: string;
    entityType: ProductDiscussionEntityType;
    entityId: string;
    contentType: ProductDiscussionContentType;
    contentId: string;
    liked: boolean;
}) {
    await validateDiscussionTargetForLearner({
        ctx,
        productId,
        entityType,
        entityId,
    });

    const target = await getDiscussionContentTarget({
        domain: ctx.subdomain._id,
        productId,
        entityType,
        entityId,
        contentType,
        contentId,
    });

    const subjectId = getDiscussionSubjectId({
        productId,
        entityType,
        entityId,
    });

    if (liked) {
        const existingLike = await ProductDiscussionLikeModel.findOne({
            domain: ctx.subdomain._id,
            contentType,
            contentId,
            userId: ctx.user.userId,
        }).select("_id");

        if (!existingLike) {
            await assertRateLimit({
                domain: ctx.subdomain._id,
                userId: ctx.user.userId,
                scope: "course_discussion",
                action: "like:toggle",
                subjectId,
                window: COURSE_DISCUSSION_RATE_LIMITS.likesPerMinute.window,
                limit: COURSE_DISCUSSION_RATE_LIMITS.likesPerMinute.limit,
            });
            await ProductDiscussionLikeModel.create({
                domain: ctx.subdomain._id,
                productId,
                entityType,
                entityId,
                contentType,
                contentId,
                commentId:
                    contentType === "reply"
                        ? target.commentId
                        : target.commentId,
                userId: ctx.user.userId,
            });
            await incrementLikesCount({ contentType, contentId, delta: 1 });
            if (target.userId !== ctx.user.userId) {
                await recordActivity({
                    domain: ctx.subdomain._id,
                    userId: ctx.user.userId,
                    type: Constants.ActivityType.COURSE_DISCUSSION_REACTED,
                    entityId: contentId,
                    metadata: {
                        courseId: productId,
                        entityType,
                        entityId,
                        contentType,
                        commentId: target.commentId,
                        ...(contentType === "reply"
                            ? { replyId: contentId }
                            : {}),
                        forUserIds: [target.userId],
                    },
                });
            }
        }
    } else {
        const deletedLike = await ProductDiscussionLikeModel.findOneAndDelete({
            domain: ctx.subdomain._id,
            contentType,
            contentId,
            userId: ctx.user.userId,
        });

        if (deletedLike) {
            await assertRateLimit({
                domain: ctx.subdomain._id,
                userId: ctx.user.userId,
                scope: "course_discussion",
                action: "like:toggle",
                subjectId,
                window: COURSE_DISCUSSION_RATE_LIMITS.likesPerMinute.window,
                limit: COURSE_DISCUSSION_RATE_LIMITS.likesPerMinute.limit,
            });
            await incrementLikesCount({ contentType, contentId, delta: -1 });
        }
    }

    const updatedTarget = await getDiscussionContentTarget({
        domain: ctx.subdomain._id,
        productId,
        entityType,
        entityId,
        contentType,
        contentId,
    });

    return {
        contentType,
        contentId,
        likesCount: updatedTarget.likesCount,
        hasLiked: liked,
    };
}

export async function createDiscussionReport({
    ctx,
    productId,
    entityType,
    entityId,
    contentType,
    contentId,
    reason,
}: {
    ctx: GQLContext;
    productId: string;
    entityType: ProductDiscussionEntityType;
    entityId: string;
    contentType: ProductDiscussionContentType;
    contentId: string;
    reason: string;
}) {
    try {
        await validateDiscussionTargetForLearner({
            ctx,
            productId,
            entityType,
            entityId,
        });
    } catch (err) {
        await validateProductDiscussionAdmin({ ctx, productId });
        if (entityType !== "lesson") {
            throw err;
        }
        const lesson = await LessonModel.findOne({
            domain: ctx.subdomain._id,
            courseId: productId,
            lessonId: entityId,
        }).select("_id");
        if (!lesson) {
            throw err;
        }
    }

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
        throw new Error(responses.invalid_input);
    }

    const target = await getDiscussionContentTarget({
        domain: ctx.subdomain._id,
        productId,
        entityType,
        entityId,
        contentType,
        contentId,
    });

    await assertRateLimit({
        domain: ctx.subdomain._id,
        userId: ctx.user.userId,
        scope: "course_discussion",
        action: "report:create",
        subjectId: getDiscussionSubjectId({ productId, entityType, entityId }),
        window: COURSE_DISCUSSION_RATE_LIMITS.reportsPerHour.window,
        limit: COURSE_DISCUSSION_RATE_LIMITS.reportsPerHour.limit,
    });

    try {
        return await ProductDiscussionReportModel.create({
            domain: ctx.subdomain._id,
            productId,
            entityType,
            entityId,
            reportId: randomUUID(),
            contentType,
            contentId,
            commentId: target.commentId,
            userId: ctx.user.userId,
            reason: trimmedReason,
        });
    } catch (err: any) {
        if (err?.code === 11000) {
            throw new Error(responses.invalid_input);
        }
        throw err;
    }
}

export async function deleteDiscussionComment({
    ctx,
    commentId,
}: {
    ctx: GQLContext;
    commentId: string;
}) {
    const comment = await ProductDiscussionCommentModel.findOne({
        domain: ctx.subdomain._id,
        commentId,
    });
    if (!comment) {
        throw new Error(responses.item_not_found);
    }
    if (comment.userId !== ctx.user.userId) {
        throw new Error(responses.action_not_allowed);
    }

    await validateDiscussionTargetForLearner({
        ctx,
        productId: comment.productId,
        entityType: comment.entityType,
        entityId: comment.entityId,
    });

    if (!comment.deleted) {
        comment.deleted = true;
        comment.deletedAt = new Date();
        comment.deletedBy = ctx.user.userId;
        comment.deletedByRole = "author";
        await comment.save();

        await updateSummaryForSoftDelete({
            domain: ctx.subdomain._id,
            productId: comment.productId,
            entityType: comment.entityType,
            entityId: comment.entityId,
            type: "comment",
        });
        await refreshSubscriberForUser({
            domain: ctx.subdomain._id,
            productId: comment.productId,
            entityType: comment.entityType,
            entityId: comment.entityId,
            userId: ctx.user.userId,
        });
    }

    return comment;
}

export async function deleteDiscussionReply({
    ctx,
    replyId,
}: {
    ctx: GQLContext;
    replyId: string;
}) {
    const reply = await ProductDiscussionReplyModel.findOne({
        domain: ctx.subdomain._id,
        replyId,
    });
    if (!reply) {
        throw new Error(responses.item_not_found);
    }
    if (reply.userId !== ctx.user.userId) {
        throw new Error(responses.action_not_allowed);
    }

    await validateDiscussionTargetForLearner({
        ctx,
        productId: reply.productId,
        entityType: reply.entityType,
        entityId: reply.entityId,
    });

    if (!reply.deleted) {
        reply.deleted = true;
        reply.deletedAt = new Date();
        reply.deletedBy = ctx.user.userId;
        reply.deletedByRole = "author";
        await reply.save();

        await updateSummaryForSoftDelete({
            domain: ctx.subdomain._id,
            productId: reply.productId,
            entityType: reply.entityType,
            entityId: reply.entityId,
            type: "reply",
        });
        await refreshSubscriberForUser({
            domain: ctx.subdomain._id,
            productId: reply.productId,
            entityType: reply.entityType,
            entityId: reply.entityId,
            userId: ctx.user.userId,
        });
    }

    return reply;
}

export async function listDiscussionReports({
    ctx,
    productId,
    status,
    page,
    cursor,
    limit = 10,
}: {
    ctx: GQLContext;
    productId: string;
    status?: ProductDiscussionReportStatus;
    page?: number;
    cursor?: string;
    limit?: number;
}): Promise<CursorEnvelope<any>> {
    await validateProductDiscussionAdmin({ ctx, productId });

    const filter: Record<string, unknown> = {
        domain: ctx.subdomain._id,
        productId,
    };
    if (status) {
        filter.status = status;
    }

    if (page) {
        const currentPage = Math.max(1, page);
        const reports = await ProductDiscussionReportModel.find(filter)
            .sort({ createdAt: -1, reportId: -1 })
            .skip((currentPage - 1) * limit)
            .limit(limit);

        return {
            items: reports.map((report) => report.toObject()),
            hasMore:
                (await ProductDiscussionReportModel.countDocuments(filter)) >
                currentPage * limit,
        };
    }

    const decodedCursor = cursor ? decodeCursor<ReportCursor>(cursor) : null;
    if (decodedCursor) {
        filter.$or = [
            { createdAt: { $lt: new Date(decodedCursor.createdAt) } },
            {
                createdAt: new Date(decodedCursor.createdAt),
                reportId: { $lt: decodedCursor.reportId },
            },
        ];
    }

    const reports = await ProductDiscussionReportModel.find(filter)
        .sort({ createdAt: -1, reportId: -1 })
        .limit(limit + 1);
    const visibleReports = reports.slice(0, limit);
    const hasMore = reports.length > limit;
    const lastItem = visibleReports[visibleReports.length - 1];

    return {
        items: visibleReports.map((report) => report.toObject()),
        hasMore,
        nextCursor:
            hasMore && lastItem
                ? encodeCursor({
                      createdAt: lastItem.createdAt.toISOString(),
                      reportId: lastItem.reportId,
                  })
                : undefined,
    };
}

export async function getDiscussionReportsCount({
    ctx,
    productId,
    status,
}: {
    ctx: GQLContext;
    productId: string;
    status?: ProductDiscussionReportStatus;
}) {
    await validateProductDiscussionAdmin({ ctx, productId });

    return await ProductDiscussionReportModel.countDocuments({
        domain: ctx.subdomain._id,
        productId,
        ...(status ? { status } : {}),
    });
}

export async function updateDiscussionReportStatus({
    ctx,
    productId,
    reportId,
    rejectionReason,
}: {
    ctx: GQLContext;
    productId: string;
    reportId: string;
    rejectionReason?: string;
}) {
    await validateProductDiscussionAdmin({ ctx, productId });

    const report = await ProductDiscussionReportModel.findOne({
        domain: ctx.subdomain._id,
        productId,
        reportId,
    });
    if (!report) {
        throw new Error(responses.item_not_found);
    }

    const previousStatus = report.status;
    const nextStatus = getNextReportStatus(report.status);

    if (nextStatus === "rejected") {
        if (!rejectionReason?.trim()) {
            throw new Error(responses.invalid_input);
        }
        report.rejectionReason = rejectionReason.trim();
    } else {
        report.rejectionReason = "";
    }
    report.status = nextStatus;
    await report.save();

    if (nextStatus === "accepted" && previousStatus !== "accepted") {
        await moderationSoftDelete({
            ctx,
            report,
        });
    }

    if (previousStatus === "accepted" && nextStatus !== "accepted") {
        const acceptedReportsCount =
            await ProductDiscussionReportModel.countDocuments({
                domain: ctx.subdomain._id,
                contentType: report.contentType,
                contentId: report.contentId,
                status: "accepted",
            });
        if (acceptedReportsCount === 0) {
            await moderationRestore({
                ctx,
                report,
            });
        }
    }

    return report;
}

export async function listDiscussionSummaries({
    ctx,
    productId,
    preview = false,
    cursor,
    limit = 10,
}: {
    ctx: GQLContext;
    productId: string;
    preview?: boolean;
    cursor?: string;
    limit?: number;
}): Promise<CursorEnvelope<any>> {
    const accessibleLessonIds = await getAccessibleDiscussionLessonIds({
        ctx,
        productId,
        preview,
    });

    const filter: Record<string, unknown> = {
        domain: ctx.subdomain._id,
        productId,
        entityType: "lesson",
        activityCountIncludingDeleted: { $gt: 0 },
    };
    if (accessibleLessonIds) {
        filter.entityId = { $in: accessibleLessonIds };
    }

    const decodedCursor = cursor ? decodeCursor<SummaryCursor>(cursor) : null;
    if (decodedCursor) {
        filter.$or = [
            { lastActivityAt: { $lt: new Date(decodedCursor.lastActivityAt) } },
            {
                lastActivityAt: new Date(decodedCursor.lastActivityAt),
                entityId: { $gt: decodedCursor.entityId },
            },
        ];
    }

    const summaries = await ProductDiscussionSummaryModel.find(filter)
        .sort({ lastActivityAt: -1, entityId: 1 })
        .limit(limit + 1);
    const visibleSummaries = summaries.slice(0, limit);
    const hasMore = summaries.length > limit;
    const lastItem = visibleSummaries[visibleSummaries.length - 1];

    return {
        items: visibleSummaries.map((summary) => summary.toObject()),
        hasMore,
        nextCursor:
            hasMore && lastItem
                ? encodeCursor({
                      lastActivityAt: lastItem.lastActivityAt.toISOString(),
                      entityId: lastItem.entityId,
                  })
                : undefined,
    };
}

function getDiscussionSubjectId({
    productId,
    entityType,
    entityId,
}: {
    productId: string;
    entityType: ProductDiscussionEntityType;
    entityId: string;
}) {
    return `${productId}:${entityType}:${entityId}`;
}

function assertLessonDiscussionTarget(entityType: ProductDiscussionEntityType) {
    if (entityType !== "lesson") {
        throw new Error(responses.action_not_allowed);
    }
}

async function getDiscussionContentTarget({
    domain,
    productId,
    entityType,
    entityId,
    contentType,
    contentId,
}: {
    domain: mongoose.Types.ObjectId;
    productId: string;
    entityType: ProductDiscussionEntityType;
    entityId: string;
    contentType: ProductDiscussionContentType;
    contentId: string;
}) {
    const target =
        contentType === "comment"
            ? await ProductDiscussionCommentModel.findOne({
                  domain,
                  productId,
                  entityType,
                  entityId,
                  commentId: contentId,
              })
            : await ProductDiscussionReplyModel.findOne({
                  domain,
                  productId,
                  entityType,
                  entityId,
                  replyId: contentId,
              });

    if (!target || target.deleted) {
        throw new Error(responses.item_not_found);
    }

    return target;
}

async function getDiscussionContentTargetForModeration({
    domain,
    contentType,
    contentId,
}: {
    domain: mongoose.Types.ObjectId;
    contentType: ProductDiscussionContentType;
    contentId: string;
}) {
    const target =
        contentType === "comment"
            ? await ProductDiscussionCommentModel.findOne({
                  domain,
                  commentId: contentId,
              })
            : await ProductDiscussionReplyModel.findOne({
                  domain,
                  replyId: contentId,
              });

    if (!target) {
        throw new Error(responses.item_not_found);
    }

    return target;
}

async function incrementLikesCount({
    contentType,
    contentId,
    delta,
}: {
    contentType: ProductDiscussionContentType;
    contentId: string;
    delta: 1 | -1;
}) {
    if (contentType === "comment") {
        await ProductDiscussionCommentModel.updateOne(
            { commentId: contentId },
            { $inc: { likesCount: delta } },
        );
    } else {
        await ProductDiscussionReplyModel.updateOne(
            { replyId: contentId },
            { $inc: { likesCount: delta } },
        );
    }
}

function getContentFingerprint(content: TextEditorContent) {
    return Buffer.from(
        extractTextFromTextEditorContent(content).trim().toLowerCase(),
    ).toString("base64");
}

async function updateSummaryForCreate({
    domain,
    productId,
    entityType,
    entityId,
    commentId,
    replyId,
    createdAt,
    type,
}: {
    domain: mongoose.Types.ObjectId;
    productId: string;
    entityType: ProductDiscussionEntityType;
    entityId: string;
    commentId?: string;
    replyId?: string;
    createdAt: Date;
    type: "comment" | "reply";
}) {
    await ProductDiscussionSummaryModel.updateOne(
        { domain, productId, entityType, entityId },
        {
            $setOnInsert: {
                domain,
                productId,
                entityType,
                entityId,
            },
            $set: {
                lastActivityAt: createdAt,
                ...(commentId ? { lastCommentId: commentId } : {}),
                ...(replyId ? { lastReplyId: replyId } : {}),
            },
            $inc: {
                commentsCount: type === "comment" ? 1 : 0,
                repliesCount: type === "reply" ? 1 : 0,
                totalCount: 1,
                activityCountIncludingDeleted: 1,
            },
        },
        { upsert: true },
    );
}

async function upsertSubscriber({
    domain,
    productId,
    entityType,
    entityId,
    userId,
}: {
    domain: mongoose.Types.ObjectId;
    productId: string;
    entityType: ProductDiscussionEntityType;
    entityId: string;
    userId: string;
}) {
    await ProductDiscussionSubscriberModel.updateOne(
        { domain, productId, entityType, entityId, userId },
        {
            $setOnInsert: {
                domain,
                productId,
                entityType,
                entityId,
                userId,
            },
            $set: { subscription: true },
        },
        { upsert: true },
    );
}

async function updateSummaryForSoftDelete({
    domain,
    productId,
    entityType,
    entityId,
    type,
}: {
    domain: mongoose.Types.ObjectId;
    productId: string;
    entityType: ProductDiscussionEntityType;
    entityId: string;
    type: "comment" | "reply";
}) {
    await ProductDiscussionSummaryModel.updateOne(
        { domain, productId, entityType, entityId },
        {
            $inc: {
                commentsCount: type === "comment" ? -1 : 0,
                repliesCount: type === "reply" ? -1 : 0,
                totalCount: -1,
            },
        },
    );
}

async function updateSummaryForRestore({
    domain,
    productId,
    entityType,
    entityId,
    type,
}: {
    domain: mongoose.Types.ObjectId;
    productId: string;
    entityType: ProductDiscussionEntityType;
    entityId: string;
    type: "comment" | "reply";
}) {
    await ProductDiscussionSummaryModel.updateOne(
        { domain, productId, entityType, entityId },
        {
            $inc: {
                commentsCount: type === "comment" ? 1 : 0,
                repliesCount: type === "reply" ? 1 : 0,
                totalCount: 1,
            },
        },
    );
}

async function refreshSubscriberForUser({
    domain,
    productId,
    entityType,
    entityId,
    userId,
}: {
    domain: mongoose.Types.ObjectId;
    productId: string;
    entityType: ProductDiscussionEntityType;
    entityId: string;
    userId: string;
}) {
    const [commentsCount, repliesCount] = await Promise.all([
        ProductDiscussionCommentModel.countDocuments({
            domain,
            productId,
            entityType,
            entityId,
            userId,
            deleted: false,
        }),
        ProductDiscussionReplyModel.countDocuments({
            domain,
            productId,
            entityType,
            entityId,
            userId,
            deleted: false,
        }),
    ]);

    await ProductDiscussionSubscriberModel.updateOne(
        { domain, productId, entityType, entityId, userId },
        { $set: { subscription: commentsCount + repliesCount > 0 } },
    );
}

async function recordDiscussionActivity({
    ctx,
    product,
    productId,
    entityType,
    entityId,
    eventType,
    commentId,
    replyId,
}: {
    ctx: GQLContext;
    product: { creatorId: string };
    productId: string;
    entityType: ProductDiscussionEntityType;
    entityId: string;
    eventType: "comment_created" | "reply_created" | "reacted";
    commentId: string;
    replyId?: string;
}) {
    const forUserIds = await getDiscussionNotificationRecipients({
        domain: ctx.subdomain._id,
        productId,
        entityType,
        entityId,
        actorUserId: ctx.user.userId,
        productCreatorId: product.creatorId,
    });

    await recordActivity({
        domain: ctx.subdomain._id,
        userId: ctx.user.userId,
        type: Constants.ActivityType.COURSE_DISCUSSION_COMMENT_CREATED,
        entityId: replyId || commentId,
        metadata: {
            eventType,
            courseId: productId,
            entityType,
            entityId,
            commentId,
            replyId,
            forUserIds,
        },
    });
}

async function getDiscussionNotificationRecipients({
    domain,
    productId,
    entityType,
    entityId,
    actorUserId,
    productCreatorId,
}: {
    domain: mongoose.Types.ObjectId;
    productId: string;
    entityType: ProductDiscussionEntityType;
    entityId: string;
    actorUserId: string;
    productCreatorId: string;
}) {
    const [subscribers, productAdmins] = await Promise.all([
        ProductDiscussionSubscriberModel.find({
            domain,
            productId,
            entityType,
            entityId,
            subscription: true,
        }).lean(),
        UserModel.find(
            {
                domain,
                active: true,
                $or: [
                    { permissions: permissions.manageAnyCourse },
                    {
                        userId: productCreatorId,
                        permissions: permissions.manageCourse,
                    },
                ],
            },
            { userId: 1 },
        ).lean(),
    ]);

    const recipientIds = new Set<string>();
    for (const subscriber of subscribers) {
        recipientIds.add(subscriber.userId);
    }
    for (const admin of productAdmins) {
        recipientIds.add(admin.userId);
    }
    recipientIds.delete(actorUserId);

    return Array.from(recipientIds);
}

async function validateProductDiscussionAdmin({
    ctx,
    productId,
}: {
    ctx: GQLContext;
    productId: string;
}) {
    const product = await CourseModel.findOne({
        domain: ctx.subdomain._id,
        courseId: productId,
    });

    if (!product) {
        throw new Error(responses.item_not_found);
    }

    const canManageAny = checkPermission(ctx.user.permissions, [
        permissions.manageAnyCourse,
    ]);
    const canManageOwn =
        product.creatorId === ctx.user.userId &&
        checkPermission(ctx.user.permissions, [permissions.manageCourse]);

    if (!canManageAny && !canManageOwn) {
        throw new Error(responses.action_not_allowed);
    }

    return product;
}

async function getAccessibleDiscussionLessonIds({
    ctx,
    productId,
    preview = false,
}: {
    ctx: GQLContext;
    productId: string;
    preview?: boolean;
}) {
    const product = await CourseModel.findOne({
        domain: ctx.subdomain._id,
        courseId: productId,
        type: Constants.CourseType.COURSE,
    });

    if (!product || !product.discussions) {
        throw new Error(responses.item_not_found);
    }

    const isManager = canManageCourseInContext(product, ctx);
    const isPreview = preview && isManager;
    if (!product.published && !isPreview) {
        throw new Error(responses.item_not_found);
    }

    const lessons = await LessonModel.find({
        domain: ctx.subdomain._id,
        courseId: productId,
        ...(isPreview ? {} : { published: true }),
    }).lean<
        {
            lessonId: string;
            groupId: string;
            requiresEnrollment: boolean;
        }[]
    >();

    if (isManager) {
        return lessons.map((lesson) => lesson.lessonId);
    }

    const progress = ctx.user?.purchases?.find(
        (purchase: any) => purchase.courseId === productId,
    );
    const accessibleGroups = new Set(progress?.accessibleGroups || []);

    const dripLockedGroupIds = new Set<string>();
    if (product && Array.isArray(product.groups)) {
        for (const group of product.groups) {
            const groupId = String(group.id);
            if (group.drip?.status && !accessibleGroups.has(groupId)) {
                dripLockedGroupIds.add(groupId);
            }
        }
    }

    const isEnrolled = !!progress;

    return lessons
        .filter((lesson) => {
            if (lesson.requiresEnrollment && !isEnrolled) {
                return false;
            }
            if (dripLockedGroupIds.has(lesson.groupId)) {
                return false;
            }
            return true;
        })
        .map((lesson) => lesson.lessonId);
}

function getNextReportStatus(
    status: ProductDiscussionReportStatus,
): ProductDiscussionReportStatus {
    if (status === "pending") {
        return "accepted";
    }
    if (status === "accepted") {
        return "rejected";
    }
    return "pending";
}

async function moderationSoftDelete({
    ctx,
    report,
}: {
    ctx: GQLContext;
    report: any;
}) {
    const target = await getDiscussionContentTargetForModeration({
        domain: ctx.subdomain._id,
        contentType: report.contentType,
        contentId: report.contentId,
    });

    if (target.deleted) {
        return;
    }

    target.deleted = true;
    target.deletedAt = new Date();
    target.deletedBy = ctx.user.userId;
    target.deletedByRole = "course_admin";
    target.deleteReason = report.reason;
    await target.save();

    await updateSummaryForSoftDelete({
        domain: ctx.subdomain._id,
        productId: target.productId,
        entityType: target.entityType,
        entityId: target.entityId,
        type: report.contentType,
    });
    await refreshSubscriberForUser({
        domain: ctx.subdomain._id,
        productId: target.productId,
        entityType: target.entityType,
        entityId: target.entityId,
        userId: target.userId,
    });
}

async function moderationRestore({
    ctx,
    report,
}: {
    ctx: GQLContext;
    report: any;
}) {
    const target = await getDiscussionContentTargetForModeration({
        domain: ctx.subdomain._id,
        contentType: report.contentType,
        contentId: report.contentId,
    });

    if (!target.deleted || target.deletedByRole !== "course_admin") {
        return;
    }

    target.deleted = false;
    target.restoredAt = new Date();
    target.restoredBy = ctx.user.userId;
    await target.save();

    await updateSummaryForRestore({
        domain: ctx.subdomain._id,
        productId: target.productId,
        entityType: target.entityType,
        entityId: target.entityId,
        type: report.contentType,
    });
    await refreshSubscriberForUser({
        domain: ctx.subdomain._id,
        productId: target.productId,
        entityType: target.entityType,
        entityId: target.entityId,
        userId: target.userId,
    });
}

function encodeCursor(
    cursor: CommentCursor | ReplyCursor | ReportCursor | SummaryCursor,
) {
    return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64");
}

function decodeCursor<T>(cursor: string): T {
    try {
        return JSON.parse(Buffer.from(cursor, "base64").toString("utf8"));
    } catch {
        throw new Error(responses.invalid_input);
    }
}
