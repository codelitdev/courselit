import mongoose, { Model } from "mongoose";
import {
    InternalCommunityReaction,
    CommunityReactionSchema,
} from "@courselit/orm-models";

const CommunityReactionModel =
    (mongoose.models.CommunityReaction as
        | Model<InternalCommunityReaction>
        | undefined) ||
    mongoose.model<InternalCommunityReaction>(
        "CommunityReaction",
        CommunityReactionSchema,
    );

export type { InternalCommunityReaction };
export default CommunityReactionModel;
