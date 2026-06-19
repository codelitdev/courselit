import {
    InternalCommunityComment,
    InternalReply,
    CommunityCommentSchema,
} from "@courselit/orm-models";
import mongoose, { Model } from "mongoose";

const CommunityCommentModel =
    (mongoose.models.CommunityComment as
        | Model<InternalCommunityComment>
        | undefined) ||
    mongoose.model<InternalCommunityComment>(
        "CommunityComment",
        CommunityCommentSchema,
    );

export type { InternalCommunityComment, InternalReply };
export default CommunityCommentModel;
