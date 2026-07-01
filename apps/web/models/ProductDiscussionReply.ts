import mongoose, { Model } from "mongoose";
import {
    InternalProductDiscussionReply,
    ProductDiscussionReplySchema,
} from "@courselit/orm-models";

const ProductDiscussionReplyModel =
    (mongoose.models.ProductDiscussionReply as
        | Model<InternalProductDiscussionReply>
        | undefined) ||
    mongoose.model<InternalProductDiscussionReply>(
        "ProductDiscussionReply",
        ProductDiscussionReplySchema,
    );

export type { InternalProductDiscussionReply };
export default ProductDiscussionReplyModel;
