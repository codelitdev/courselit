import mongoose, { type Model } from "mongoose";
import { BaseRepository } from "./base";
import {
    MembershipSchema,
    type InternalMembership,
} from "../models/membership";

export class MembershipRepository extends BaseRepository<InternalMembership> {
    constructor(model?: Model<InternalMembership>) {
        super(
            model ??
                ((mongoose.models.Membership ||
                    mongoose.model(
                        "Membership",
                        MembershipSchema,
                    )) as Model<InternalMembership>),
        );
    }

    async findByUserAndEntity(
        domain: mongoose.Types.ObjectId,
        userId: string,
        entityId: string,
    ): Promise<InternalMembership[]> {
        return this.find({ domain, userId, entityId });
    }

    async findByUser(
        domain: mongoose.Types.ObjectId,
        userId: string,
    ): Promise<InternalMembership[]> {
        return this.find({ domain, userId });
    }
}
