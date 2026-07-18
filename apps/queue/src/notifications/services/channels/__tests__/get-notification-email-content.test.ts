/**
 * @jest-environment node
 */

import {
    getNotificationEmailContent,
    type NotificationEntityResolver,
} from "@courselit/common-logic";
import { Constants } from "@courselit/common-models";
import {
    CommunityPostSchema,
    CommunitySchema,
    CourseSchema,
    ProductDiscussionCommentSchema,
    ProductDiscussionReplySchema,
} from "@courselit/orm-models";
import mongoose from "mongoose";

const CommunityModel: mongoose.Model<any> =
    (mongoose.models.Community as mongoose.Model<any>) ||
    mongoose.model("Community", CommunitySchema);
const CommunityPostModel: mongoose.Model<any> =
    (mongoose.models.CommunityPost as mongoose.Model<any>) ||
    mongoose.model("CommunityPost", CommunityPostSchema);
const CourseModel: mongoose.Model<any> =
    (mongoose.models.Course as mongoose.Model<any>) ||
    mongoose.model("Course", CourseSchema);
const ProductDiscussionCommentModel: mongoose.Model<any> =
    (mongoose.models.ProductDiscussionComment as mongoose.Model<any>) ||
    mongoose.model("ProductDiscussionComment", ProductDiscussionCommentSchema);
const ProductDiscussionReplyModel: mongoose.Model<any> =
    (mongoose.models.ProductDiscussionReply as mongoose.Model<any>) ||
    mongoose.model("ProductDiscussionReply", ProductDiscussionReplySchema);

function createResolver(): NotificationEntityResolver {
    return {
        getCommunity: jest
            .fn()
            .mockResolvedValue({ communityId: "community-1", name: "General" }),
        getPost: jest.fn().mockResolvedValue({
            postId: "post-1",
            title: "Welcome to the community",
            userId: "author-1",
            communityId: "community-1",
            content: "The full post body",
        }),
        getComment: jest.fn().mockResolvedValue({
            commentId: "comment-1",
            userId: "parent-author",
            content: "A parent comment",
            postId: "post-1",
            communityId: "community-1",
            replies: [
                {
                    replyId: "reply-1",
                    userId: "reply-author",
                    content: "A reply body",
                    parentReplyId: "reply-0",
                },
                {
                    replyId: "reply-0",
                    userId: "grandparent-author",
                    content: "An earlier reply",
                },
            ],
        }),
        getCourse: jest.fn().mockResolvedValue({
            courseId: "course-1",
            title: "Course discussion",
            slug: "course-discussion",
        }),
        getDiscussionComment: jest.fn().mockResolvedValue({
            commentId: "discussion-comment-1",
            userId: "discussion-author",
            productId: "course-1",
            entityType: Constants.ProductDiscussionEntityType.LESSON,
            entityId: "lesson-1",
            content: {
                type: "doc",
                content: [{ type: "paragraph", text: "A course comment" }],
            },
        }),
        getDiscussionReply: jest.fn().mockResolvedValue({
            replyId: "discussion-reply-1",
            commentId: "discussion-comment-1",
            userId: "discussion-reply-author",
            productId: "course-1",
            entityType: Constants.ProductDiscussionEntityType.LESSON,
            entityId: "lesson-1",
            content: {
                type: "doc",
                content: [{ type: "paragraph", text: "A course reply" }],
            },
        }),
    };
}

describe("getNotificationEmailContent", () => {
    afterEach(async () => {
        await Promise.all([
            CommunityModel.deleteMany({}),
            CommunityPostModel.deleteMany({}),
            CourseModel.deleteMany({}),
            ProductDiscussionCommentModel.deleteMany({}),
            ProductDiscussionReplyModel.deleteMany({}),
        ]);
    });

    it("uses the queue-side default resolver when no resolver is supplied", async () => {
        const domainId = new mongoose.Types.ObjectId();
        await CommunityModel.create({
            domain: domainId,
            communityId: "community-default",
            name: "General",
            slug: "general",
            pageId: "page-default",
        });
        await CommunityPostModel.create({
            domain: domainId,
            postId: "post-default",
            title: "Default resolver post",
            userId: "author-1",
            communityId: "community-default",
            content: "This is the full post body.",
        });

        const content = await getNotificationEmailContent({
            activityType: Constants.ActivityType.COMMUNITY_POST_CREATED,
            entityId: "post-default",
            actorName: "Alex",
            recipientUserId: "recipient-1",
            domainId,
        });

        expect(content).toMatchObject({
            commentText: "This is the full post body.",
            threadTitle: "Default resolver post",
            replyContext: {
                community: {
                    communityId: "community-default",
                    postId: "post-default",
                },
            },
        });
    });

    it("does not create an email for a deleted community post", async () => {
        const domainId = new mongoose.Types.ObjectId();
        await CommunityModel.create({
            domain: domainId,
            communityId: "community-deleted-post",
            name: "General",
            slug: "general",
            pageId: "page-deleted-post",
        });
        await CommunityPostModel.create({
            domain: domainId,
            postId: "post-deleted",
            title: "Deleted post",
            userId: "author-1",
            communityId: "community-deleted-post",
            content: "This text must not be emailed.",
            deleted: true,
        });

        const content = await getNotificationEmailContent({
            activityType: Constants.ActivityType.COMMUNITY_POST_CREATED,
            entityId: "post-deleted",
            actorName: "Alex",
            recipientUserId: "recipient-1",
            domainId,
        });

        expect(content).toEqual({ subject: "", message: "", href: "" });
    });

    it("uses the queue-side default resolver for a product-discussion reply", async () => {
        const domainId = new mongoose.Types.ObjectId();
        await CourseModel.create({
            domain: domainId,
            courseId: "course-default",
            title: "Default resolver course",
            slug: "default-resolver-course",
            cost: 0,
            costType: "free",
            privacy: Constants.ProductAccessType.PUBLIC,
            type: Constants.CourseType.COURSE,
            creatorId: "creator-1",
        });
        await ProductDiscussionCommentModel.create({
            domain: domainId,
            commentId: "discussion-comment-default",
            userId: "parent-author",
            productId: "course-default",
            entityType: Constants.ProductDiscussionEntityType.LESSON,
            entityId: "lesson-default",
            content: "The parent discussion comment.",
        });
        await ProductDiscussionReplyModel.create({
            domain: domainId,
            replyId: "discussion-reply-default",
            commentId: "discussion-comment-default",
            userId: "reply-author",
            productId: "course-default",
            entityType: Constants.ProductDiscussionEntityType.LESSON,
            entityId: "lesson-default",
            content: "The product-discussion reply.",
        });

        const content = await getNotificationEmailContent({
            activityType:
                Constants.ActivityType.COURSE_DISCUSSION_COMMENT_CREATED,
            entityId: "discussion-reply-default",
            actorName: "Alex",
            recipientUserId: "recipient-1",
            domainId,
            metadata: {
                eventType: "reply_created",
                courseId: "course-default",
                entityType: Constants.ProductDiscussionEntityType.LESSON,
                entityId: "lesson-default",
                commentId: "discussion-comment-default",
                replyId: "discussion-reply-default",
            },
        });

        expect(content).toMatchObject({
            commentText: "The product-discussion reply.",
            parentText: "The parent discussion comment.",
            threadTitle: "Default resolver course",
            conversationLabel: "New reply",
            replyContext: {
                product: {
                    productId: "course-default",
                    entityType: Constants.ProductDiscussionEntityType.LESSON,
                    entityId: "lesson-default",
                    commentId: "discussion-comment-default",
                    parentReplyId: "discussion-reply-default",
                },
            },
        });
    });

    it("does not create an email for a deleted product-discussion reply", async () => {
        const domainId = new mongoose.Types.ObjectId();
        await CourseModel.create({
            domain: domainId,
            courseId: "course-deleted-reply",
            title: "Deleted reply course",
            slug: "deleted-reply-course",
            cost: 0,
            costType: "free",
            privacy: Constants.ProductAccessType.PUBLIC,
            type: Constants.CourseType.COURSE,
            creatorId: "creator-1",
        });
        await ProductDiscussionCommentModel.create({
            domain: domainId,
            commentId: "discussion-comment-deleted-reply",
            userId: "parent-author",
            productId: "course-deleted-reply",
            entityType: Constants.ProductDiscussionEntityType.LESSON,
            entityId: "lesson-deleted-reply",
            content: "A parent comment.",
        });
        await ProductDiscussionReplyModel.create({
            domain: domainId,
            replyId: "discussion-reply-deleted",
            commentId: "discussion-comment-deleted-reply",
            userId: "reply-author",
            productId: "course-deleted-reply",
            entityType: Constants.ProductDiscussionEntityType.LESSON,
            entityId: "lesson-deleted-reply",
            content: "This text must not be emailed.",
            deleted: true,
        });

        const content = await getNotificationEmailContent({
            activityType:
                Constants.ActivityType.COURSE_DISCUSSION_COMMENT_CREATED,
            entityId: "discussion-reply-deleted",
            actorName: "Alex",
            recipientUserId: "recipient-1",
            domainId,
            metadata: {
                eventType: "reply_created",
                courseId: "course-deleted-reply",
                entityType: Constants.ProductDiscussionEntityType.LESSON,
                entityId: "lesson-deleted-reply",
                commentId: "discussion-comment-deleted-reply",
                replyId: "discussion-reply-deleted",
            },
        });

        expect(content).toEqual({ subject: "", message: "", href: "" });
    });

    it("adds the post body and a top-level community reply context", async () => {
        const resolver = createResolver();
        (resolver.getPost as jest.Mock).mockResolvedValue({
            postId: "post-1",
            title: "Welcome to the community",
            userId: "author-1",
            communityId: "community-1",
            content: {
                type: "doc",
                content: [
                    {
                        type: "paragraph",
                        content: [
                            { type: "text", text: "First line" },
                            { type: "hardBreak" },
                            { type: "text", text: "Second line" },
                        ],
                    },
                    {
                        type: "paragraph",
                        content: [{ type: "text", text: "Third paragraph" }],
                    },
                ],
            },
        });

        const content = await getNotificationEmailContent({
            activityType: Constants.ActivityType.COMMUNITY_POST_CREATED,
            entityId: "post-1",
            actorName: "Alex",
            recipientUserId: "recipient-1",
            resolver,
        });

        expect(content).toMatchObject({
            subject: "Alex created a post 'Welcome to the commu...' in General",
            commentText: "First line\nSecond line\n\nThird paragraph",
            threadTitle: "Welcome to the community",
            conversationLabel: "New post",
            replyContext: {
                community: { communityId: "community-1", postId: "post-1" },
            },
        });
    });

    it("adds the reply body, parent context, and reply coordinates", async () => {
        const content = await getNotificationEmailContent({
            activityType: Constants.ActivityType.COMMUNITY_REPLY_CREATED,
            entityId: "reply-1",
            entityTargetId: "comment-1",
            actorName: "Alex",
            recipientUserId: "recipient-1",
            resolver: createResolver(),
            resolveUserName: jest.fn().mockResolvedValue("Jamie"),
        });

        expect(content).toMatchObject({
            commentText: "A reply body",
            parentText: "An earlier reply",
            parentAuthorName: "Jamie",
            threadTitle: "Welcome to the community",
            conversationLabel: "New reply",
            replyContext: {
                community: {
                    communityId: "community-1",
                    postId: "post-1",
                    parentCommentId: "comment-1",
                    parentReplyId: "reply-1",
                },
            },
        });
    });

    it("does not include a deleted parent reply in the email context", async () => {
        const resolver = createResolver();
        (resolver.getComment as jest.Mock).mockResolvedValue({
            commentId: "comment-1",
            userId: "parent-author",
            content: "A parent comment",
            postId: "post-1",
            communityId: "community-1",
            replies: [
                {
                    replyId: "reply-1",
                    userId: "reply-author",
                    content: "An active reply body",
                    parentReplyId: "reply-deleted",
                },
                {
                    replyId: "reply-deleted",
                    userId: "deleted-parent-author",
                    content: "This text must not be emailed.",
                    deleted: true,
                },
            ],
        });

        const content = await getNotificationEmailContent({
            activityType: Constants.ActivityType.COMMUNITY_REPLY_CREATED,
            entityId: "reply-1",
            entityTargetId: "comment-1",
            actorName: "Alex",
            recipientUserId: "recipient-1",
            resolver,
            resolveUserName: jest.fn(),
        });

        expect(content).toMatchObject({
            commentText: "An active reply body",
            parentText: undefined,
            parentAuthorName: undefined,
        });
    });

    it("adds the comment body and comment reply coordinates", async () => {
        const content = await getNotificationEmailContent({
            activityType: Constants.ActivityType.COMMUNITY_COMMENT_CREATED,
            entityId: "comment-1",
            actorName: "Alex",
            recipientUserId: "recipient-1",
            resolver: createResolver(),
        });

        expect(content).toMatchObject({
            commentText: "A parent comment",
            threadTitle: "Welcome to the community",
            conversationLabel: "New comment",
            replyContext: {
                community: {
                    communityId: "community-1",
                    postId: "post-1",
                    parentCommentId: "comment-1",
                },
            },
        });
    });

    it("extracts course-discussion reply text and its reply context", async () => {
        const content = await getNotificationEmailContent({
            activityType:
                Constants.ActivityType.COURSE_DISCUSSION_COMMENT_CREATED,
            entityId: "discussion-reply-1",
            actorName: "Alex",
            recipientUserId: "recipient-1",
            resolver: createResolver(),
            metadata: {
                eventType: "reply_created",
                courseId: "course-1",
                entityType: Constants.ProductDiscussionEntityType.LESSON,
                entityId: "lesson-1",
                commentId: "discussion-comment-1",
                replyId: "discussion-reply-1",
            },
        });

        expect(content).toMatchObject({
            commentText: "A course reply",
            threadTitle: "Course discussion",
            conversationLabel: "New reply",
            replyContext: {
                product: {
                    productId: "course-1",
                    entityType: Constants.ProductDiscussionEntityType.LESSON,
                    entityId: "lesson-1",
                    commentId: "discussion-comment-1",
                    parentReplyId: "discussion-reply-1",
                },
            },
        });
    });

    it("extracts course-discussion comment text and its reply context", async () => {
        const content = await getNotificationEmailContent({
            activityType:
                Constants.ActivityType.COURSE_DISCUSSION_COMMENT_CREATED,
            entityId: "discussion-comment-1",
            actorName: "Alex",
            recipientUserId: "recipient-1",
            resolver: createResolver(),
            metadata: {
                eventType: "comment_created",
                courseId: "course-1",
                entityType: Constants.ProductDiscussionEntityType.LESSON,
                entityId: "lesson-1",
                commentId: "discussion-comment-1",
            },
        });

        expect(content).toMatchObject({
            commentText: "A course comment",
            threadTitle: "Course discussion",
            conversationLabel: "New comment",
            replyContext: {
                product: {
                    productId: "course-1",
                    entityType: Constants.ProductDiscussionEntityType.LESSON,
                    entityId: "lesson-1",
                    commentId: "discussion-comment-1",
                },
            },
        });
    });

    it("preserves paragraph and hard-break boundaries in rich discussion content", async () => {
        const resolver = createResolver();
        (resolver.getDiscussionComment as jest.Mock).mockResolvedValue({
            commentId: "discussion-comment-1",
            userId: "discussion-author",
            productId: "course-1",
            entityType: Constants.ProductDiscussionEntityType.LESSON,
            entityId: "lesson-1",
            content: {
                type: "doc",
                content: [
                    {
                        type: "paragraph",
                        content: [
                            { type: "text", text: "First line" },
                            { type: "hardBreak" },
                            { type: "text", text: "Second line" },
                        ],
                    },
                    {
                        type: "paragraph",
                        content: [{ type: "text", text: "Third paragraph" }],
                    },
                ],
            },
        });

        const content = await getNotificationEmailContent({
            activityType:
                Constants.ActivityType.COURSE_DISCUSSION_COMMENT_CREATED,
            entityId: "discussion-comment-1",
            actorName: "Alex",
            recipientUserId: "recipient-1",
            resolver,
            metadata: {
                eventType: "comment_created",
                courseId: "course-1",
                entityType: Constants.ProductDiscussionEntityType.LESSON,
                entityId: "lesson-1",
                commentId: "discussion-comment-1",
            },
        });

        expect(content.commentText).toBe(
            "First line\nSecond line\n\nThird paragraph",
        );
    });

    it("reuses resolved entities while deriving the subject and rich content", async () => {
        const resolver = createResolver();

        await getNotificationEmailContent({
            activityType: Constants.ActivityType.COMMUNITY_REPLY_CREATED,
            entityId: "reply-1",
            entityTargetId: "comment-1",
            actorName: "Alex",
            recipientUserId: "recipient-1",
            resolver,
        });

        expect(resolver.getComment).toHaveBeenCalledTimes(1);
        expect(resolver.getPost).toHaveBeenCalledTimes(1);
        expect(resolver.getCommunity).toHaveBeenCalledTimes(1);
    });

    it("keeps non-conversation notification content unchanged", async () => {
        const content = await getNotificationEmailContent({
            activityType: Constants.ActivityType.ENROLLED,
            entityId: "course-1",
            actorName: "Alex",
            recipientUserId: "recipient-1",
            resolver: createResolver(),
        });

        expect(content).toEqual({
            subject: "Alex enrolled in Course discussion",
            message: "Alex enrolled in Course discussion",
            href: "/dashboard/product/course-1/customers",
        });
    });
});
