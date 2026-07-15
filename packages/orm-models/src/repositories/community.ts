import mongoose, { type Model } from "mongoose";
import { BaseRepository } from "./base";
import { CommunitySchema, type InternalCommunity } from "../models/community";

export class CommunityRepository extends BaseRepository<InternalCommunity> {
    constructor(model?: Model<InternalCommunity>) {
        super(
            model ??
                ((mongoose.models.Community ||
                    mongoose.model(
                        "Community",
                        CommunitySchema,
                    )) as Model<InternalCommunity>),
        );
    }

    async findBySlug(
        domain: mongoose.Types.ObjectId,
        slug: string,
    ): Promise<InternalCommunity | null> {
        return this.findOne({ domain, slug });
    }

    async findByCommunityId(
        domain: mongoose.Types.ObjectId,
        communityId: string,
    ): Promise<InternalCommunity | null> {
        return this.findOne({ domain, communityId });
    }
}
