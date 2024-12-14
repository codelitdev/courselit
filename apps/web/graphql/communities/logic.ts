import { checkPermission, generateUniqueId, slugify } from "@courselit/utils";
import CommunityModel, { InternalCommunity } from "@models/Community";
import constants from "../../config/constants";
import GQLContext from "../../models/GQLContext";
import { checkIfAuthenticated } from "@/lib/graphql";
import { responses } from "@/config/strings";
import {
    Community,
    Constants,
    CommunityMemberStatus,
    CommunityMember,
    CommunityPost,
    User,
    CommunityComment,
    CommunityMedia,
} from "@courselit/common-models";
import CommunityPostModel, {
    InternalCommunityPost,
} from "@models/CommunityPost";
import CommunityMemberModel from "@models/CommunityMember";
import { getNextStatusForCommunityMember } from "@ui-lib/utils";
import CommunityCommentModel, {
    InternalCommunityComment,
} from "@models/CommunityComment";
import UserModel from "@models/User";
import PageModel from "@models/Page";

const { permissions, communityPage } = constants;

export async function createCommunity({
    name,
    ctx,
}: {
    name: string;
    ctx: GQLContext;
}): Promise<Community> {
    checkIfAuthenticated(ctx);

    if (!checkPermission(ctx.user.permissions, [permissions.manageCommunity])) {
        throw new Error(responses.action_not_allowed);
    }

    const existingCommunity = await CommunityModel.findOne({
        domain: ctx.subdomain._id,
        name,
    });

    if (existingCommunity) {
        throw new Error(responses.community_exists);
    }

    const communityId = generateUniqueId();

    const pageId = `${slugify(name.toLowerCase())}-${communityId.substring(0, 5)}`;

    await PageModel.create({
        domain: ctx.subdomain._id,
        pageId,
        type: communityPage,
        creatorId: ctx.user.userId,
        name,
        entityId: communityId,
        layout: [
            {
                name: "header",
                deleteable: false,
                shared: true,
            },
            {
                name: "banner",
            },
            {
                name: "footer",
                deleteable: false,
                shared: true,
            },
        ],
        title: name,
    });

    const community = await CommunityModel.create<Community>({
        domain: ctx.subdomain._id,
        communityId,
        name,
        pageId,
    });

    return community;
}

export async function getCommunity({
    ctx,
    id,
}: {
    ctx: GQLContext;
    id?: string;
}): Promise<Pick<
    Community,
    "name" | "communityId" | "banner" | "enabled" | "default" | "categories"
> | null> {
    const query = {
        domain: ctx.subdomain._id,
        ...(id ? { communityId: id } : { default: true }),
    };

    const community = await CommunityModel.findOne<InternalCommunity>(query);

    if (
        !community ||
        (!community.enabled &&
            !checkPermission(ctx.user.permissions, [
                permissions.manageCommunity,
            ]))
    ) {
        return null;
    }

    return community;
}

export async function getCommunities({
    ctx,
    page = 1,
    limit = 10,
}: {
    ctx: GQLContext;
    page?: number;
    limit?: number;
}): Promise<
    Pick<InternalCommunity, "name" | "communityId" | "enabled" | "default">[]
> {
    checkIfAuthenticated(ctx);

    if (!checkPermission(ctx.user.permissions, [permissions.manageCommunity])) {
        throw new Error(responses.action_not_allowed);
    }

    const communities = await (CommunityModel as any).paginatedFind(
        {
            domain: ctx.subdomain._id,
        },
        { page, limit },
    );

    // const communities = await CommunityModel.find({
    //     domain: ctx.subdomain._id,
    // });

    return communities.map((community) => ({
        name: community.name,
        communityId: community.communityId,
        enabled: community.enabled,
        default: community.default,
    }));
}

export async function getCommunitiesCount({
    ctx,
}: {
    ctx: GQLContext;
}): Promise<number> {
    checkIfAuthenticated(ctx);

    if (!checkPermission(ctx.user.permissions, [permissions.manageCommunity])) {
        throw new Error(responses.action_not_allowed);
    }

    const count = await (CommunityModel as any).countDocuments({
        domain: ctx.subdomain._id,
    });

    return count;
}

export async function updateCommunity({
    id,
    name,
    ctx,
    enabled,
    defaultCommunity,
    banner,
    autoAcceptMembers,
    joiningReasonText,
}: {
    id: string;
    name?: string;
    ctx: GQLContext;
    enabled?: boolean;
    defaultCommunity?: boolean;
    banner?: string;
    autoAcceptMembers?: boolean;
    joiningReasonText?: string;
}): Promise<Community> {
    checkIfAuthenticated(ctx);

    if (!checkPermission(ctx.user.permissions, [permissions.manageCommunity])) {
        throw new Error(responses.action_not_allowed);
    }

    const community = await CommunityModel.findOne<InternalCommunity>({
        communityId: id,
        domain: ctx.subdomain._id,
    });

    if (!community) {
        throw new Error(responses.item_not_found);
    }

    if (name) {
        community.name = name;
    }

    if (enabled !== undefined) {
        community.enabled = enabled;
    }

    if (defaultCommunity !== undefined) {
        community.default = defaultCommunity;
    }

    if (banner) {
        community.banner = JSON.parse(banner);
    }

    if (autoAcceptMembers !== undefined) {
        community.autoAcceptMembers = autoAcceptMembers;
    }

    if (joiningReasonText !== undefined) {
        community.joiningReasonText = joiningReasonText;
    }

    await community.save();

    return community;
}

export async function addCategory({
    id,
    category,
    ctx,
}: {
    id: string;
    category: string;
    ctx: GQLContext;
}): Promise<Community> {
    checkIfAuthenticated(ctx);

    if (!checkPermission(ctx.user.permissions, [permissions.manageCommunity])) {
        throw new Error(responses.action_not_allowed);
    }

    const community = await CommunityModel.findOne<InternalCommunity>({
        communityId: id,
        domain: ctx.subdomain._id,
    });

    if (!community) {
        throw new Error(responses.item_not_found);
    }

    if (!community.categories.includes(category)) {
        community.categories.push(category);
    }

    await (community as any).save();

    return community;
}

export async function deleteCategory({
    id,
    category,
    ctx,
    migrateToCategory,
}: {
    id: string;
    category: string;
    ctx: GQLContext;
    migrateToCategory?: string;
}): Promise<Community> {
    checkIfAuthenticated(ctx);

    if (!checkPermission(ctx.user.permissions, [permissions.manageCommunity])) {
        throw new Error(responses.action_not_allowed);
    }

    const community = await CommunityModel.findOne<InternalCommunity>({
        communityId: id,
        domain: ctx.subdomain._id,
    });

    if (!community) {
        throw new Error(responses.item_not_found);
    }

    if (migrateToCategory) {
        // Logic to migrate posts from the deleted category to the new category
        // This is a placeholder and should be replaced with actual migration logic
        console.log(`Migrating posts from ${category} to ${migrateToCategory}`); // eslint-disable-line no-console
    }

    community.categories = community.categories.filter((c) => c !== category);

    await community.save();

    return community;
}

export async function joinCommunity({
    id,
    joiningReason,
    ctx,
}: {
    id: string;
    joiningReason: string;
    ctx: GQLContext;
}): Promise<boolean> {
    checkIfAuthenticated(ctx);

    const community = await CommunityModel.findOne<InternalCommunity>({
        domain: ctx.subdomain._id,
        communityId: id,
        enabled: true,
    });

    if (!community) {
        throw new Error(responses.item_not_found);
    }

    let member = await CommunityMemberModel.findOne({
        domain: ctx.subdomain._id,
        communityId: community.communityId,
        userId: ctx.user.userId,
    });

    if (!member) {
        member = await CommunityMemberModel.create({
            domain: ctx.subdomain._id,
            communityId: community.communityId,
            userId: ctx.user.userId,
            status: community.autoAcceptMembers
                ? Constants.communityMemberStatus[1]
                : Constants.communityMemberStatus[0],
            joiningReason,
        });
    }

    return member.status;
}

async function isCommunityMember(
    ctx: GQLContext,
    communityId: string,
): Promise<boolean> {
    const member = await CommunityMemberModel.findOne({
        domain: ctx.subdomain._id,
        communityId,
        userId: ctx.user.userId,
        status: Constants.communityMemberStatus[1],
    });
    return !!member;
}

type PublicPost = Omit<CommunityPost, "createdAt" | "user"> & {
    userId: string;
};

export async function createCommunityPost({
    communityId,
    title,
    content,
    category,
    media,
    ctx,
}: {
    communityId: string;
    title: string;
    content: string;
    category: string;
    media?: CommunityMedia[];
    ctx: GQLContext;
}): Promise<PublicPost> {
    checkIfAuthenticated(ctx);

    if (!checkPermission(ctx.user.permissions, [permissions.postInCommunity])) {
        throw new Error(responses.action_not_allowed);
    }

    const community = await CommunityModel.findOne<InternalCommunity>({
        domain: ctx.subdomain._id,
        communityId,
        enabled: true,
    });

    if (!community) {
        throw new Error(responses.item_not_found);
    }

    const member = await isCommunityMember(ctx, communityId);

    if (!member) {
        throw new Error(responses.action_not_allowed);
    }

    if (!community.categories.includes(category)) {
        throw new Error(responses.invalid_category);
    }

    const post = await CommunityPostModel.create({
        domain: ctx.subdomain._id,
        userId: ctx.user.userId,
        communityId: community.communityId,
        title,
        content,
        category,
        media,
    });

    return formatPost(post, ctx.user);

    // return {
    //     communityId: post.communityId,
    //     postId: post.postId,
    //     title: post.title,
    //     content: post.content,
    //     category: post.category,
    //     pinned: post.pinned,
    //     media: post.media,
    //     likesCount: 0,
    //     commentsCount: 0,
    //     updatedAt: post.updatedAt,
    //     hasLiked: false,
    //     userId: post.userId,
    // };
}

export async function getPost({
    ctx,
    communityId,
    postId,
}: {
    ctx: GQLContext;
    communityId: string;
    postId: string;
}): Promise<PublicPost | null> {
    checkIfAuthenticated(ctx);

    const community = await CommunityModel.findOne<InternalCommunity>({
        domain: ctx.subdomain._id,
        communityId,
        enabled: true,
    });
    if (!community) {
        throw new Error(responses.item_not_found);
    }

    const post = await CommunityPostModel.findOne({
        domain: ctx.subdomain._id,
        communityId,
        postId,
    });
    if (!post) {
        throw new Error(responses.item_not_found);
    }

    const member = await isCommunityMember(ctx, communityId);
    if (!member) {
        return null;
    }

    return formatPost(post, ctx.user);
}

export async function getPosts({
    ctx,
    communityId,
    page = 1,
    limit = 10,
    category,
}: {
    ctx: GQLContext;
    communityId: string;
    page?: number;
    limit?: number;
    category?: string;
}): Promise<PublicPost[]> {
    checkIfAuthenticated(ctx);

    const community = await CommunityModel.findOne<InternalCommunity>({
        domain: ctx.subdomain._id,
        communityId,
        enabled: true,
    });

    if (!community) {
        throw new Error(responses.item_not_found);
    }

    const member = await isCommunityMember(ctx, communityId);

    if (!member) {
        return [];
    }

    const query: Record<string, unknown> = {
        domain: ctx.subdomain._id,
        communityId,
    };

    if (category) {
        query.category = category;
    }

    let posts = await (CommunityPostModel as any).paginatedFind(query, {
        page,
        limit,
    });

    if (!category) {
        const pinnedPosts = await CommunityPostModel.find({
            domain: ctx.subdomain._id,
            communityId,
            pinned: true,
        });
        posts = posts.filter((post) => !post.pinned);
        posts.unshift(...pinnedPosts);
    }

    return posts.map(async (post) => formatPost(post, ctx.user));
}

const formatPost = (post: InternalCommunityPost, user: User): PublicPost => ({
    communityId: post.communityId,
    postId: post.postId,
    title: post.title,
    content: post.content,
    category: post.category,
    media: post.media,
    pinned: post.pinned,
    commentsCount: post.commentsCount,
    likesCount: post.likes.length,
    updatedAt: post.updatedAt,
    hasLiked: post.likes.includes(user.userId),
    userId: post.userId,
});

export async function getPostsCount({
    ctx,
    communityId,
    category,
}: {
    ctx: GQLContext;
    communityId: string;
    category?: string;
}): Promise<number> {
    checkIfAuthenticated(ctx);

    const community = await CommunityModel.findOne<InternalCommunity>({
        domain: ctx.subdomain._id,
        communityId,
        enabled: true,
    });

    if (!community) {
        throw new Error(responses.item_not_found);
    }

    const member = await isCommunityMember(ctx, communityId);

    if (!member) {
        return 0;
    }

    const query: Record<string, unknown> = {
        domain: ctx.subdomain._id,
        communityId,
    };

    if (category) {
        query.category = category;
    }

    const count = await CommunityPostModel.countDocuments(query);

    return count;
}

export async function getMemberStatus({
    ctx,
    communityId,
}: {
    ctx: GQLContext;
    communityId: string;
}): Promise<string> {
    checkIfAuthenticated(ctx);

    const community = await CommunityModel.findOne<InternalCommunity>({
        domain: ctx.subdomain._id,
        communityId,
        enabled: true,
    });

    if (!community) {
        throw new Error(responses.item_not_found);
    }

    const member = await CommunityMemberModel.findOne({
        domain: ctx.subdomain._id,
        communityId,
        userId: ctx.user.userId,
    });

    return member;
}

export async function getMembers({
    ctx,
    communityId,
    page = 1,
    limit = 10,
    status,
}: {
    ctx: GQLContext;
    communityId: string;
    page?: number;
    limit?: number;
    status?: CommunityMemberStatus;
}): Promise<CommunityMember[]> {
    checkIfAuthenticated(ctx);

    if (!checkPermission(ctx.user.permissions, [permissions.manageCommunity])) {
        throw new Error(responses.action_not_allowed);
    }

    const community = await CommunityModel.findOne<InternalCommunity>({
        domain: ctx.subdomain._id,
        communityId,
        enabled: true,
    });

    if (!community) {
        throw new Error(responses.item_not_found);
    }

    const query: Record<string, unknown> = {
        domain: ctx.subdomain._id,
        communityId,
    };

    if (status) {
        query.status = status;
    }

    const members = await (CommunityMemberModel as any).paginatedFind(query, {
        page,
        limit,
    });

    return members.map((member) => ({
        userId: member.userId,
        status: member.status,
        joiningReason: member.joiningReason,
        rejectionReason: member.rejectionReason,
    }));
}

export async function getMembersCount({
    ctx,
    communityId,
    status,
}: {
    ctx: GQLContext;
    communityId: string;
    status?: CommunityMemberStatus;
}): Promise<number> {
    checkIfAuthenticated(ctx);

    if (!checkPermission(ctx.user.permissions, [permissions.manageCommunity])) {
        throw new Error(responses.action_not_allowed);
    }

    const query: Record<string, unknown> = {
        domain: ctx.subdomain._id,
        communityId,
    };

    if (status) {
        query.status = status;
    }

    const count = await (CommunityMemberModel as any).countDocuments(query);

    return count;
}

export async function updateMemberStatus({
    ctx,
    communityId,
    userId,
    rejectionReason,
}: {
    ctx: GQLContext;
    communityId: string;
    userId: string;
    rejectionReason?: string;
}): Promise<CommunityMember> {
    checkIfAuthenticated(ctx);

    if (!checkPermission(ctx.user.permissions, [permissions.manageCommunity])) {
        throw new Error(responses.action_not_allowed);
    }

    const community = await CommunityModel.findOne<InternalCommunity>({
        domain: ctx.subdomain._id,
        communityId,
        enabled: true,
    });

    if (!community) {
        throw new Error(responses.item_not_found);
    }

    const member = await CommunityMemberModel.findOne({
        domain: ctx.subdomain._id,
        communityId,
        userId,
    });

    if (!member) {
        throw new Error(responses.item_not_found);
    }

    const nextStatus = getNextStatusForCommunityMember(member.status);
    if (nextStatus === Constants.communityMemberStatus[2]) {
        if (!rejectionReason) {
            throw new Error(responses.rejection_reason_missing);
        }
        member.rejectionReason = rejectionReason;
    }

    member.status = nextStatus;

    await (member as any).save();

    if (member.status === Constants.communityMemberStatus[1]) {
        await UserModel.updateOne(
            { userId: userId },
            {
                $addToSet: {
                    permissions: {
                        $each: [
                            permissions.postInCommunity,
                            permissions.commentInCommunity,
                        ],
                    },
                },
            },
        );
    }

    return member;
}

export async function togglePostLike({
    ctx,
    communityId,
    postId,
}: {
    ctx: GQLContext;
    communityId: string;
    postId: string;
}): Promise<PublicPost> {
    checkIfAuthenticated(ctx);

    const community = await CommunityModel.findOne<InternalCommunity>({
        domain: ctx.subdomain._id,
        communityId,
        enabled: true,
    });

    if (!community) {
        throw new Error(responses.item_not_found);
    }

    const post = await CommunityPostModel.findOne({
        domain: ctx.subdomain._id,
        communityId,
        postId,
    });

    if (!post) {
        throw new Error(responses.item_not_found);
    }

    const member = await isCommunityMember(ctx, communityId);

    if (!member) {
        throw new Error(responses.action_not_allowed);
    }

    if (post.likes.includes(ctx.user.userId)) {
        post.likes = post.likes.filter((id) => id !== ctx.user.userId);
    } else {
        post.likes.push(ctx.user.userId);
    }

    await post.save();

    return formatPost(post, ctx.user);
}

export async function togglePinned({
    ctx,
    communityId,
    postId,
}: {
    ctx: GQLContext;
    communityId: string;
    postId: string;
}): Promise<PublicPost> {
    checkIfAuthenticated(ctx);

    if (!checkPermission(ctx.user.permissions, [permissions.manageCommunity])) {
        throw new Error(responses.action_not_allowed);
    }

    const community = await CommunityModel.findOne<InternalCommunity>({
        domain: ctx.subdomain._id,
        communityId,
        enabled: true,
    });

    if (!community) {
        throw new Error(responses.item_not_found);
    }

    const post = await CommunityPostModel.findOne({
        domain: ctx.subdomain._id,
        communityId,
        postId,
    });

    if (!post) {
        throw new Error(responses.item_not_found);
    }

    const member = await isCommunityMember(ctx, communityId);

    if (!member) {
        throw new Error(responses.action_not_allowed);
    }

    post.pinned = !post.pinned;

    await post.save();

    return formatPost(post, ctx.user);
}

type PublicComment = Omit<CommunityComment, "user" | "likes"> & {
    userId: string;
};

export async function postComment({
    ctx,
    communityId,
    postId,
    content,
    media,
    parentCommentId,
    parentReplyId,
}: {
    ctx: GQLContext;
    communityId: string;
    postId: string;
    content: string;
    media?: CommunityMedia[];
    parentCommentId?: string;
    parentReplyId?: string;
}): Promise<PublicComment> {
    checkIfAuthenticated(ctx);

    if (
        !checkPermission(ctx.user.permissions, [
            permissions.postInCommunity,
            permissions.commentInCommunity,
        ])
    ) {
        throw new Error(responses.action_not_allowed);
    }

    const community = await CommunityModel.findOne<InternalCommunity>({
        domain: ctx.subdomain._id,
        communityId,
        enabled: true,
    });

    if (!community) {
        throw new Error(responses.item_not_found);
    }

    const post = await CommunityPostModel.findOne({
        domain: ctx.subdomain._id,
        communityId,
        postId,
    });

    if (!post) {
        throw new Error(responses.item_not_found);
    }

    const member = await isCommunityMember(ctx, communityId);

    if (!member) {
        throw new Error(responses.action_not_allowed);
    }

    let comment;
    if (parentCommentId) {
        comment = await CommunityCommentModel.findOne({
            domain: ctx.subdomain._id,
            communityId,
            postId,
            commentId: parentCommentId,
        });

        if (!comment) {
            throw new Error(responses.item_not_found);
        }

        comment.replies.push({
            userId: ctx.user.userId,
            content,
            media,
            parentReplyId,
        });

        await comment.save();
    } else {
        comment = await CommunityCommentModel.create({
            domain: ctx.subdomain._id,
            userId: ctx.user.userId,
            communityId,
            postId,
            content,
            media,
        });
    }

    post.commentsCount = post.commentsCount + 1;
    await post.save();

    return formatComment(comment, ctx.user);
}

const formatComment = (comment: any, user: User) => ({
    communityId: comment.communityId,
    postId: comment.postId,
    userId: comment.userId,
    commentId: comment.commentId,
    content: comment.content,
    hasLiked: comment.likes.includes(user.userId),
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    media: comment.media,
    likesCount: comment.likes.length,
    replies: comment.replies.map((reply) => ({
        replyId: reply.replyId,
        userId: reply.userId,
        content: reply.content,
        media: reply.media,
        parentReplyId: reply.parentReplyId,
        createdAt: reply.createdAt,
        updatedAt: reply.updatedAt,
        likesCount: reply.likes.length,
        hasLiked: reply.likes.includes(user.userId),
        deleted: reply.deleted,
    })),
    deleted: comment.deleted,
});

export async function getComments({
    ctx,
    communityId,
    postId,
    page = 1,
    limit = 10,
}: {
    ctx: GQLContext;
    communityId: string;
    postId: string;
    page?: number;
    limit?: number;
}): Promise<PublicComment[]> {
    checkIfAuthenticated(ctx);

    const community = await CommunityModel.findOne<InternalCommunity>({
        domain: ctx.subdomain._id,
        communityId,
        enabled: true,
    });

    if (!community) {
        throw new Error(responses.item_not_found);
    }

    const member = await isCommunityMember(ctx, communityId);

    if (!member) {
        return [];
    }

    const comments = await (CommunityCommentModel as any).paginatedFind(
        {
            domain: ctx.subdomain._id,
            communityId,
            postId,
        },
        {
            page,
            limit,
        },
    );

    return comments.map((comment) => formatComment(comment, ctx.user));
}

export async function toggleCommentLike({
    ctx,
    communityId,
    postId,
    commentId,
}: {
    ctx: GQLContext;
    communityId: string;
    postId: string;
    commentId: string;
}): Promise<PublicComment> {
    checkIfAuthenticated(ctx);

    const community = await CommunityModel.findOne<InternalCommunity>({
        domain: ctx.subdomain._id,
        communityId,
        enabled: true,
    });

    if (!community) {
        throw new Error(responses.item_not_found);
    }

    const comment = await CommunityCommentModel.findOne({
        domain: ctx.subdomain._id,
        communityId,
        postId,
        commentId,
    });

    if (!comment) {
        throw new Error(responses.item_not_found);
    }

    const member = await isCommunityMember(ctx, communityId);

    if (!member) {
        throw new Error(responses.action_not_allowed);
    }

    if (comment.likes.includes(ctx.user.userId)) {
        comment.likes = comment.likes.filter((id) => id !== ctx.user.userId);
    } else {
        comment.likes.push(ctx.user.userId);
    }

    await comment.save();

    return formatComment(comment, ctx.user);
}

export async function toggleCommentReplyLike({
    ctx,
    communityId,
    postId,
    commentId,
    replyId,
}: {
    ctx: GQLContext;
    communityId: string;
    postId: string;
    commentId: string;
    replyId: string;
}): Promise<PublicComment> {
    checkIfAuthenticated(ctx);

    const community = await CommunityModel.findOne<InternalCommunity>({
        domain: ctx.subdomain._id,
        communityId,
        enabled: true,
    });

    if (!community) {
        throw new Error(responses.item_not_found);
    }

    const comment = await CommunityCommentModel.findOne({
        domain: ctx.subdomain._id,
        communityId,
        postId,
        commentId,
    });

    if (!comment) {
        throw new Error(responses.item_not_found);
    }

    const member = await isCommunityMember(ctx, communityId);

    if (!member) {
        throw new Error(responses.action_not_allowed);
    }

    const reply = comment.replies.find((r) => r.replyId === replyId);

    if (!reply) {
        throw new Error(responses.item_not_found);
    }

    if (reply.likes.includes(ctx.user.userId)) {
        reply.likes = reply.likes.filter((id) => id !== ctx.user.userId);
    } else {
        reply.likes.push(ctx.user.userId);
    }

    await comment.save();

    return formatComment(comment, ctx.user);
}

export async function deleteComment({
    ctx,
    communityId,
    postId,
    commentId,
    replyId,
}: {
    ctx: GQLContext;
    communityId: string;
    postId: string;
    commentId: string;
    replyId?: string;
}): Promise<PublicComment | null> {
    checkIfAuthenticated(ctx);

    const community = await CommunityModel.findOne<InternalCommunity>({
        domain: ctx.subdomain._id,
        communityId,
        enabled: true,
    });

    if (!community) {
        throw new Error(responses.item_not_found);
    }

    const post = await CommunityPostModel.findOne({
        domain: ctx.subdomain._id,
        communityId,
        postId,
    });

    if (!post) {
        throw new Error(responses.item_not_found);
    }

    let comment = await CommunityCommentModel.findOne({
        domain: ctx.subdomain._id,
        communityId,
        postId,
        commentId,
    });

    if (!comment) {
        throw new Error(responses.item_not_found);
    }

    if (!hasPermissionToDelete(ctx.user, comment, replyId)) {
        throw new Error(responses.action_not_allowed);
    }

    if (replyId) {
        if (comment.replies.some((r) => r.parentReplyId === replyId)) {
            const replyIndex = comment.replies.findIndex(
                (r) => r.replyId === replyId,
            );
            if (!comment.replies[replyIndex].deleted) {
                comment.replies[replyIndex].deleted = true;
                if (post.commentsCount > 0) {
                    post.commentsCount = post.commentsCount - 1;
                }
            }
        } else {
            comment.replies = comment.replies.filter(
                (r) => r.replyId !== replyId,
            );
            if (post.commentsCount > 0) {
                post.commentsCount = post.commentsCount - 1;
            }
        }
        await comment.save();
    } else {
        if (comment.replies.length) {
            if (!comment.deleted) {
                comment.deleted = true;
                await comment.save();
                if (post.commentsCount > 0) {
                    post.commentsCount = post.commentsCount - 1;
                }
            }
        } else {
            await comment.deleteOne({
                domain: ctx.subdomain._id,
                communityId,
                postId,
                commentId,
            });
            if (post.commentsCount > 0) {
                post.commentsCount = post.commentsCount - 1;
            }
            comment = null;
        }
    }

    await post.save();

    return comment ? formatComment(comment, ctx.user) : null;
}

function hasPermissionToDelete(
    user: User,
    comment: InternalCommunityComment,
    replyId,
) {
    const ownerUserId = replyId
        ? comment.replies.find((r) => r.replyId === replyId)?.userId
        : comment.userId;
    return (
        user.userId === ownerUserId ||
        checkPermission(user.permissions, [permissions.manageCommunity])
    );
}
