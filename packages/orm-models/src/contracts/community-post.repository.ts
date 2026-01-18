import { Repository } from "../core/repository";
import { CommunityPost } from "@courselit/common-models";

export interface CommunityPostRepository extends Repository<CommunityPost> {
    findByPostId(
        postId: string,
        domainId: string,
    ): Promise<CommunityPost | null>;
    findByCommunityId(
        communityId: string,
        domainId: string,
    ): Promise<CommunityPost[]>;
}
