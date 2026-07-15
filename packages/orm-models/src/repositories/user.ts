import mongoose, { type Model } from "mongoose";
import { BaseRepository } from "./base";
import { UserSchema, type InternalUser } from "../models/user";

export class UserRepository extends BaseRepository<InternalUser> {
    constructor(model?: Model<InternalUser>) {
        super(
            model ??
                ((mongoose.models.User ||
                    mongoose.model("User", UserSchema)) as Model<InternalUser>),
        );
    }

    async findByEmail(
        domain: mongoose.Types.ObjectId,
        email: string,
    ): Promise<InternalUser | null> {
        return this.findOne({ domain, email });
    }

    async findByUserIdAndDomain(
        domain: mongoose.Types.ObjectId,
        userId: string,
    ): Promise<InternalUser | null> {
        return this.findOne({ domain, userId });
    }
}
