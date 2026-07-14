import {
    GraphQLBoolean,
    GraphQLEnumType,
    GraphQLInputObjectType,
    GraphQLInt,
    GraphQLList,
    GraphQLNonNull,
    GraphQLObjectType,
    GraphQLString,
} from "graphql";
import { GraphQLJSONObject } from "graphql-type-json";
import mediaTypes from "../media/types";
import { Constants, CommunityPost } from "@courselit/common-models";
import userTypes from "../users/types";
import { getUser } from "../users/logic";
import GQLContext from "@models/GQLContext";
import paymentPlansTypes from "../paymentplans/types";
import { getPlans } from "../paymentplans/logic";
import { getCommentsCount, getReactionsForEntity } from "./logic";

const communityReportContentType = new GraphQLEnumType({
    name: "CommunityReportContentType",
    values: Object.fromEntries(
        Object.entries(Constants.CommunityReportType).map(([key, value]) => [
            key.toUpperCase(),
            { value },
        ]),
    ),
});

const communityReportStatusType = new GraphQLEnumType({
    name: "CommunityReportStatusType",
    values: Object.fromEntries(
        Object.entries(Constants.CommunityReportStatus).map(([key, value]) => [
            key.toUpperCase(),
            { value },
        ]),
    ),
});

const community = new GraphQLObjectType({
    name: "Community",
    fields: {
        communityId: { type: new GraphQLNonNull(GraphQLString) },
        name: { type: new GraphQLNonNull(GraphQLString) },
        slug: { type: GraphQLString },
        description: { type: GraphQLJSONObject },
        banner: { type: GraphQLJSONObject },
        enabled: { type: GraphQLBoolean },
        categories: { type: new GraphQLList(GraphQLString) },
        autoAcceptMembers: { type: GraphQLBoolean },
        joiningReasonText: { type: GraphQLString },
        pageId: { type: new GraphQLNonNull(GraphQLString) },
        paymentPlans: {
            type: new GraphQLList(paymentPlansTypes.paymentPlan),
            resolve: (community, _, ctx: GQLContext, __) =>
                getPlans({
                    entityId: community.communityId,
                    entityType: Constants.MembershipEntityType.COMMUNITY,
                    ctx,
                }),
        },
        defaultPaymentPlan: { type: GraphQLString },
        featuredImage: { type: mediaTypes.mediaType },
        membersCount: { type: new GraphQLNonNull(GraphQLInt) },
    },
});

const communityPostMedia = new GraphQLObjectType({
    name: "CommunityPostMedia",
    fields: {
        type: { type: new GraphQLNonNull(GraphQLString) },
        title: { type: new GraphQLNonNull(GraphQLString) },
        url: { type: GraphQLString },
        media: { type: mediaTypes.mediaType },
    },
});

const communityPostInputMedia = new GraphQLInputObjectType({
    name: "CommunityPostInputMedia",
    fields: {
        type: { type: new GraphQLNonNull(GraphQLString) },
        title: { type: new GraphQLNonNull(GraphQLString) },
        url: { type: GraphQLString },
        media: { type: mediaTypes.mediaInputType },
    },
});

const feedCommunity = new GraphQLObjectType({
    name: "FeedCommunity",
    fields: {
        id: { type: new GraphQLNonNull(GraphQLString) },
        title: { type: new GraphQLNonNull(GraphQLString) },
    },
});

const communityReaction = new GraphQLObjectType({
    name: "CommunityReaction",
    fields: {
        emoji: { type: new GraphQLNonNull(GraphQLString) },
        count: { type: new GraphQLNonNull(GraphQLInt) },
        hasReacted: { type: new GraphQLNonNull(GraphQLBoolean) },
        // Populated by formatReactions (batched user lookup)
        reactors: { type: new GraphQLList(userTypes.userType) },
    },
});

const communityPost = new GraphQLObjectType({
    name: "CommunityPost",
    fields: {
        communityId: { type: new GraphQLNonNull(GraphQLString) },
        postId: { type: new GraphQLNonNull(GraphQLString) },
        title: { type: new GraphQLNonNull(GraphQLString) },
        content: { type: new GraphQLNonNull(GraphQLJSONObject) },
        category: { type: new GraphQLNonNull(GraphQLString) },
        pinned: { type: new GraphQLNonNull(GraphQLBoolean) },
        media: { type: new GraphQLList(communityPostMedia) },
        likesCount: { type: new GraphQLNonNull(GraphQLInt) },
        commentsCount: {
            type: new GraphQLNonNull(GraphQLInt),
            resolve: (post, _, ctx: GQLContext, __) =>
                getCommentsCount(post, ctx),
        },
        user: {
            type: userTypes.userType,
            resolve: (post, _, ctx: GQLContext, __) =>
                getUser(post.userId, ctx),
        },
        updatedAt: { type: new GraphQLNonNull(GraphQLString) },
        hasLiked: { type: new GraphQLNonNull(GraphQLBoolean) },
        reactions: {
            type: new GraphQLList(communityReaction),
            resolve: async (post: CommunityPost, _, ctx: GQLContext, __) =>
                getReactionsForEntity({
                    entityType: Constants.CommunityReactionEntityType.POST,
                    entity: post,
                    ctx,
                }),
        },
        community: { type: feedCommunity },
    },
});

const communityMemberStatus = new GraphQLObjectType({
    name: "CommunityMemberStatus",
    fields: {
        user: {
            type: userTypes.userType,
            resolve: (member, _, ctx: GQLContext, __) =>
                getUser(member.userId, ctx),
        },
        status: { type: userTypes.membershipStatusType },
        role: { type: userTypes.membershipRoleType },
        joiningReason: { type: GraphQLString },
        rejectionReason: { type: GraphQLString },
        subscriptionMethod: { type: GraphQLString },
        subscriptionId: { type: GraphQLString },
    },
});

const communityCommentReply = new GraphQLObjectType({
    name: "CommunityCommentReply",
    fields: {
        replyId: { type: new GraphQLNonNull(GraphQLString) },
        content: { type: new GraphQLNonNull(GraphQLString) },
        user: {
            type: userTypes.userType,
            resolve: (reply, _, ctx: GQLContext, __) =>
                getUser(reply.userId, ctx),
        },
        media: { type: new GraphQLList(communityPostMedia) },
        parentReplyId: { type: GraphQLString },
        likesCount: { type: new GraphQLNonNull(GraphQLInt) },
        updatedAt: { type: new GraphQLNonNull(GraphQLString) },
        hasLiked: { type: new GraphQLNonNull(GraphQLBoolean) },
        reactions: {
            type: new GraphQLList(communityReaction),
            resolve: async (reply, _, ctx: GQLContext, __) =>
                getReactionsForEntity({
                    entityType: Constants.CommunityReactionEntityType.REPLY,
                    entity: reply,
                    ctx,
                }),
        },
        deleted: { type: new GraphQLNonNull(GraphQLBoolean) },
    },
});

const communityComment = new GraphQLObjectType({
    name: "CommunityComment",
    fields: {
        communityId: { type: new GraphQLNonNull(GraphQLString) },
        postId: { type: new GraphQLNonNull(GraphQLString) },
        commentId: { type: new GraphQLNonNull(GraphQLString) },
        content: { type: new GraphQLNonNull(GraphQLString) },
        user: {
            type: userTypes.userType,
            resolve: (comment, _, ctx: GQLContext, __) =>
                getUser(comment.userId, ctx),
        },
        media: { type: new GraphQLList(communityPostMedia) },
        likesCount: { type: new GraphQLNonNull(GraphQLInt) },
        updatedAt: { type: new GraphQLNonNull(GraphQLString) },
        hasLiked: { type: new GraphQLNonNull(GraphQLBoolean) },
        reactions: {
            type: new GraphQLList(communityReaction),
            resolve: async (comment, _, ctx: GQLContext, __) =>
                getReactionsForEntity({
                    entityType: Constants.CommunityReactionEntityType.COMMENT,
                    entity: comment,
                    ctx,
                }),
        },
        replies: { type: new GraphQLList(communityCommentReply) },
        deleted: { type: new GraphQLNonNull(GraphQLBoolean) },
    },
});

const communityReportContent = new GraphQLObjectType({
    name: "CommunityReportContent",
    fields: {
        id: { type: new GraphQLNonNull(GraphQLString) },
        content: { type: new GraphQLNonNull(GraphQLString) },
        media: { type: new GraphQLList(communityPostMedia) },
    },
});

const communityReport = new GraphQLObjectType({
    name: "CommunityReport",
    fields: {
        communityId: { type: new GraphQLNonNull(GraphQLString) },
        reportId: { type: new GraphQLNonNull(GraphQLString) },
        content: { type: new GraphQLNonNull(communityReportContent) },
        type: { type: new GraphQLNonNull(communityReportContentType) },
        reason: { type: new GraphQLNonNull(GraphQLString) },
        status: { type: new GraphQLNonNull(communityReportStatusType) },
        user: {
            type: userTypes.userType,
            resolve: (report, _, ctx: GQLContext, __) =>
                getUser(report.userId, ctx),
        },
        contentParentId: { type: GraphQLString },
        rejectionReason: { type: GraphQLString },
        createdAt: { type: GraphQLString },
        updatedAt: { type: GraphQLString },
    },
});

const types = {
    community,
    communityPost,
    feedCommunity,
    communityMemberStatus,
    communityPostInputMedia,
    communityComment,
    communityReaction,
    communityReportContentType,
    communityReport,
    communityReportStatusType,
};
export default types;
