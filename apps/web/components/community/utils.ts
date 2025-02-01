import {
    CommunityComment,
    CommunityCommentReply,
} from "@courselit/common-models";

export function isCommunityComment(
    comment: CommunityComment | CommunityCommentReply,
): comment is CommunityComment {
    return (comment as CommunityComment).postId !== undefined;
}
