import mongoose, { type Model } from "mongoose";
import { BaseRepository } from "./base";
import {
    CommunityCommentSchema,
    type InternalCommunityComment,
} from "../models/community-comment";

export class CommunityCommentRepository extends BaseRepository<InternalCommunityComment> {
    constructor(model?: Model<InternalCommunityComment>) {
        super(
            model ??
                ((mongoose.models.CommunityComment ||
                    mongoose.model(
                        "CommunityComment",
                        CommunityCommentSchema,
                    )) as Model<InternalCommunityComment>),
        );
    }

    async findByPost(
        domain: mongoose.Types.ObjectId,
        communityId: string,
        postId: string,
    ): Promise<InternalCommunityComment[]> {
        return this.find({ domain, communityId, postId, deleted: false });
    }
}
