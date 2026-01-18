import { Repository } from "../core/repository";
import { CommunityComment } from "@courselit/common-models";

export interface CommunityCommentRepository
    extends Repository<CommunityComment> {
    findByCommentId(
        commentId: string,
        domainId: string,
    ): Promise<CommunityComment | null>;
    findByPostId(postId: string, domainId: string): Promise<CommunityComment[]>;
}
