import type { ProductDiscussionEntityType } from "./product-discussion";

export interface ReplyByEmailContext {
    community?: {
        communityId: string;
        postId: string;
        parentCommentId?: string;
        parentReplyId?: string;
    };
    product?: {
        productId: string;
        entityType: ProductDiscussionEntityType;
        entityId: string;
        commentId: string;
        parentReplyId?: string;
    };
}
