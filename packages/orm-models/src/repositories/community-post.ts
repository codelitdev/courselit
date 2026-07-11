import mongoose, { type Model } from "mongoose";
import { BaseRepository } from "./base";
import {
    CommunityPostSchema,
    type InternalCommunityPost,
} from "../models/community-post";

export class CommunityPostRepository extends BaseRepository<InternalCommunityPost> {
    constructor(model?: Model<InternalCommunityPost>) {
        super(
            model ??
                ((mongoose.models.CommunityPost ||
                    mongoose.model(
                        "CommunityPost",
                        CommunityPostSchema,
                    )) as Model<InternalCommunityPost>),
        );
    }

    async findByPost(
        domain: mongoose.Types.ObjectId,
        communityId: string,
        postId: string,
    ): Promise<InternalCommunityPost | null> {
        return this.findOne({ domain, communityId, postId });
    }

    async findByCommunity(
        domain: mongoose.Types.ObjectId,
        communityId: string,
    ): Promise<InternalCommunityPost[]> {
        return this.find({ domain, communityId, deleted: false });
    }
}
