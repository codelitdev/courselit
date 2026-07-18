import {
    CommunityComment,
    CommunityCommentReply,
} from "@courselit/common-models";

export function isCommunityComment(
    comment:
        | CommunityComment
        | (CommunityCommentReply & { commentId?: string }),
): comment is CommunityComment {
    // Replies are rendered as Comment with an injected commentId; identify them
    // by replyId so reaction handlers hit toggleCommentReplyReaction.
    if ("replyId" in comment && Boolean(comment.replyId)) {
        return false;
    }
    return (comment as CommunityComment).postId !== undefined;
}
