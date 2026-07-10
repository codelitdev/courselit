import mongoose from "mongoose";
import crypto from "crypto";
import { verifyReplyToken } from "@courselit/common-logic";
import {
    CommunityCommentSchema,
    ProductDiscussionCommentSchema,
    ProductDiscussionReplySchema,
} from "@courselit/orm-models";
import { stripQuotedContent } from "./provider";
import type { InboundEmailPayload } from "./provider";

/**
 * Represents a parsed reply from an inbound email.
 */
interface ParsedReply {
    /** The verified reply token payload */
    token: {
        userId: string;
        domainId: string;
        entityId: string;
        entityType: "community" | "product";
        commentId?: string;
        parentReplyId?: string;
    };
    /** The stripped text content to save as the reply */
    content: string;
    /** The sender email address */
    senderEmail: string;
}

/**
 * Result of processing an inbound reply email.
 */
interface ProcessInboundReplyResult {
    success: boolean;
    error?: string;
    replyContent?: string;
}

/**
 * Extract the reply token from the To address.
 * Format: reply+<token>@<domain>
 */
function extractTokenFromToAddress(to: string): string | null {
    if (!to) return null;

    // Match reply+<base64token>@domain
    const match = to.match(/^reply\+([A-Za-z0-9\-_:]+)@/);
    return match ? match[1] : null;
}

/**
 * Process an inbound reply email.
 * 
 * Steps:
 * 1. Extract reply token from To address
 * 2. Verify and decrypt the token
 * 3. Validate sender email matches token user
 * 4. Find the target discussion/comment
 * 5. Strip quoted content from the email body
 * 6. Create the reply/comment in the correct collection
 */
export async function processInboundReply(
    email: InboundEmailPayload,
): Promise<ProcessInboundReplyResult> {
    try {
        // Step 1: Extract token
        const tokenStr = extractTokenFromToAddress(email.to);
        if (!tokenStr) {
            return {
                success: false,
                error: "No reply token found in To address",
            };
        }

        // Step 2: Verify token
        const token = verifyReplyToken(tokenStr);
        if (!token) {
            return {
                success: false,
                error: "Invalid or expired reply token",
            };
        }

        // Step 3: Validate sender email
        const senderEmail = email.from.toLowerCase().trim();

        // Look up the user associated with this token
        const UserModel = (mongoose.models.User ||
            mongoose.model("User", new mongoose.Schema({}, { strict: false }))) as mongoose.Model<any>;

        const user = await UserModel.findOne({
            domain: new mongoose.Types.ObjectId(token.domainId),
            userId: token.userId,
        }).lean<any>();

        if (!user) {
            return {
                success: false,
                error: "User not found for this reply token",
            };
        }

        // Compare sender email with user's email
        const userEmail = (user.email || "").toLowerCase().trim();
        if (senderEmail !== userEmail) {
            return {
                success: false,
                error:
                    "Sender email does not match the user associated with this reply token",
            };
        }

        // Step 4: Strip quoted content
        const replyContent = stripQuotedContent(email.text);
        if (!replyContent) {
            return {
                success: false,
                error: "No reply content found after stripping quoted text",
            };
        }

        // Step 5: Create the reply in the appropriate collection
        // Validate: target discussion/comment exists
        if (token.entityType === "community") {
            const exists = await validateCommunityTarget(token);
            if (!exists) {
                return {
                    success: false,
                    error: "Target discussion post or comment not found",
                };
            }
            await createCommunityReply(token, replyContent, user.userId);
        } else if (token.entityType === "product") {
            const exists = await validateProductTarget(token);
            if (!exists) {
                return {
                    success: false,
                    error: "Target product discussion not found",
                };
            }
            await createProductDiscussionReply(token, replyContent, user.userId);
        }

        return {
            success: true,
            replyContent,
        };
    } catch (err: any) {
        return {
            success: false,
            error: `Failed to process reply: ${err.message}`,
        };
    }
}

async function validateCommunityTarget(
    token: ParsedReply["token"],
): Promise<boolean> {
    const CommunityPostModel =
        (mongoose.models.CommunityPost ||
            mongoose.model(
                "CommunityPost",
                new mongoose.Schema({}, { strict: false }),
            )) as mongoose.Model<any>;

    const post = await CommunityPostModel.findOne({
        domain: new mongoose.Types.ObjectId(token.domainId),
        postId: token.entityId,
    }).lean<any>();

    if (!post) return false;

    if (token.commentId) {
        const CommunityCommentModel =
            (mongoose.models.CommunityComment ||
                mongoose.model("CommunityComment", CommunityCommentSchema)) as mongoose.Model<any>;

        const comment = await CommunityCommentModel.findOne({
            domain: new mongoose.Types.ObjectId(token.domainId),
            commentId: token.commentId,
        }).lean<any>();

        if (!comment) return false;
    }

    return true;
}

async function validateProductTarget(
    token: ParsedReply["token"],
): Promise<boolean> {
    const CourseModel =
        (mongoose.models.Course ||
            mongoose.model("Course", new mongoose.Schema({}, { strict: false }))) as mongoose.Model<any>;

    const course = await CourseModel.findOne({
        domain: new mongoose.Types.ObjectId(token.domainId),
        courseId: token.entityId,
    }).lean<any>();

    if (!course) return false;

    if (token.commentId) {
        const ProductDiscussionCommentModel =
            (mongoose.models.ProductDiscussionComment ||
                mongoose.model(
                    "ProductDiscussionComment",
                    ProductDiscussionCommentSchema,
                )) as mongoose.Model<any>;

        const comment = await ProductDiscussionCommentModel.findOne({
            domain: new mongoose.Types.ObjectId(token.domainId),
            commentId: token.commentId,
        }).lean<any>();

        if (!comment) return false;
    }

    return true;
}

/**
 * Creates a reply in a Community discussion.
 */
async function createCommunityReply(
    token: ParsedReply["token"],
    content: string,
    userId: string,
): Promise<void> {
    const CommunityCommentModel =
        (mongoose.models.CommunityComment ||
            mongoose.model("CommunityComment", CommunityCommentSchema)) as mongoose.Model<any>;

    if (token.commentId) {
        // Replying to an existing comment (as a reply within the comment)
        const replyObj = {
            userId,
            content,
            replyId: crypto.randomUUID(),
            parentReplyId: token.parentReplyId || null,
            media: [],
            likes: [],
            deleted: false,
        };

        await CommunityCommentModel.updateOne(
            {
                domain: new mongoose.Types.ObjectId(token.domainId),
                commentId: token.commentId,
            },
            {
                $push: { replies: replyObj },
            },
        );

        // Dispatch notification for the new reply
        await dispatchReplyNotification({
            domain: token.domainId,
            userId,
            activityType: "community_reply_created",
            entityId: replyObj.replyId,
            entityTargetId: token.commentId,
            metadata: {
                commentId: token.commentId,
                postId: token.entityId,
            },
        });
    } else {
        // Creating a top-level comment on the post
        const CommunityPostModel =
            (mongoose.models.CommunityPost ||
                mongoose.model(
                    "CommunityPost",
                    new mongoose.Schema({}, { strict: false }),
                )) as mongoose.Model<any>;
        const post = await CommunityPostModel.findOne({
            domain: new mongoose.Types.ObjectId(token.domainId),
            postId: token.entityId,
        }).lean<any>();

        const commentObj = {
            domain: new mongoose.Types.ObjectId(token.domainId),
            userId,
            communityId: post?.communityId || "",
            postId: token.entityId,
            commentId: crypto.randomUUID(),
            content,
            media: [],
            likes: [],
            replies: [],
            deleted: false,
        };

        await CommunityCommentModel.create(commentObj);

        await dispatchReplyNotification({
            domain: token.domainId,
            userId,
            activityType: "community_comment_created",
            entityId: commentObj.commentId,
            metadata: {
                postId: token.entityId,
            },
        });
    }
}

/**
 * Creates a reply in a Product (Course) discussion.
 */
async function createProductDiscussionReply(
    token: ParsedReply["token"],
    content: string,
    userId: string,
): Promise<void> {
    if (!token.commentId) {
        // No commentId means this is a top-level comment on a product lesson
        const ProductDiscussionCommentModel =
            (mongoose.models.ProductDiscussionComment ||
                mongoose.model(
                    "ProductDiscussionComment",
                    ProductDiscussionCommentSchema,
                )) as mongoose.Model<any>;

        const commentObj = {
            domain: new mongoose.Types.ObjectId(token.domainId),
            productId: token.entityId,
            entityType: "lesson",
            entityId: token.entityId,
            commentId: crypto.randomUUID(),
            userId,
            content: [{ type: "paragraph", children: [{ text: content }] }],
            likesCount: 0,
            deleted: false,
            isEdited: false,
        };

        await ProductDiscussionCommentModel.create(commentObj);

        await dispatchReplyNotification({
            domain: token.domainId,
            userId,
            activityType: "course_discussion_comment_created",
            entityId: commentObj.commentId,
            metadata: {
                courseId: token.entityId,
                entityType: "lesson",
                entityId: token.entityId,
                eventType: "comment_created",
                contentType: "comment",
            },
        });
        return;
    }

    // Replying to an existing comment
    const ProductDiscussionReplyModel =
        (mongoose.models.ProductDiscussionReply ||
            mongoose.model("ProductDiscussionReply", ProductDiscussionReplySchema)) as mongoose.Model<any>;

    const ProductDiscussionCommentModel =
        (mongoose.models.ProductDiscussionComment ||
            mongoose.model(
                "ProductDiscussionComment",
                ProductDiscussionCommentSchema,
            )) as mongoose.Model<any>;
    const parentComment = await ProductDiscussionCommentModel.findOne({
        domain: new mongoose.Types.ObjectId(token.domainId),
        commentId: token.commentId,
    }).lean<any>();

    const replyObj = {
        domain: new mongoose.Types.ObjectId(token.domainId),
        productId: token.entityId,
        entityType: "lesson",
        entityId: parentComment?.entityId || token.entityId,
        commentId: token.commentId,
        replyId: crypto.randomUUID(),
        parentReplyId: token.parentReplyId || undefined,
        userId,
        content: [{ type: "paragraph", children: [{ text: content }] }],
        likesCount: 0,
        deleted: false,
        isEdited: false,
    };

    await ProductDiscussionReplyModel.create(replyObj);

    await dispatchReplyNotification({
        domain: token.domainId,
        userId,
        activityType: "course_discussion_comment_created",
        entityId: replyObj.replyId,
        metadata: {
            courseId: token.entityId,
            entityType: "lesson",
            entityId: replyObj.entityId,
            commentId: token.commentId,
            replyId: replyObj.replyId,
            eventType: "reply_created",
            contentType: "reply",
            commentContent: content,
        },
    });
}

/**
 * Dispatch notification to subscribers when a reply comes in via email.
 */
async function dispatchReplyNotification(params: {
    domain: string;
    userId: string;
    activityType: string;
    entityId: string;
    entityTargetId?: string;
    metadata?: Record<string, unknown>;
}): Promise<void> {
    const { addDispatchNotificationJob } = await import(
        "../notifications/services/enqueue"
    );

    await addDispatchNotificationJob({
        domain: new mongoose.Types.ObjectId(params.domain),
        userId: params.userId,
        activityType: params.activityType as any,
        entityId: params.entityId,
        entityTargetId: params.entityTargetId,
        metadata: params.metadata || {},
    });
}
