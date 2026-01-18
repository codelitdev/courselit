import { MongooseRepository } from "./base.repository";
import { CommunityPostRepository } from "../../contracts/community-post.repository";
import { CommunityPost } from "@courselit/common-models";
import { InternalCommunityPost } from "../../models/community-post";
import mongoose, { Model } from "mongoose";

export class MongooseCommunityPostRepository
    extends MongooseRepository<CommunityPost, InternalCommunityPost>
    implements CommunityPostRepository
{
    constructor(model: Model<InternalCommunityPost>) {
        super(model);
    }

    protected toEntity(doc: InternalCommunityPost): CommunityPost {
        return {
            ...doc,
            id: doc._id.toString(),
            domain: doc.domain.toString(),
        } as unknown as CommunityPost;
    }

    async findByPostId(
        postId: string,
        domainId: string,
    ): Promise<CommunityPost | null> {
        const doc = await this.model
            .findOne({ postId, domain: domainId })
            .lean();
        return doc ? this.toEntity(doc as InternalCommunityPost) : null;
    }

    async findByCommunityId(
        communityId: string,
        domainId: string,
    ): Promise<CommunityPost[]> {
        const docs = await this.model
            .find({ communityId, domain: domainId })
            .sort({ createdAt: -1 })
            .lean();
        return docs.map((doc) => this.toEntity(doc as InternalCommunityPost));
    }
}
