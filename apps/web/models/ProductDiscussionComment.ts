import mongoose, { Model } from "mongoose";
import {
    InternalProductDiscussionComment,
    ProductDiscussionCommentSchema,
} from "@courselit/orm-models";

const ProductDiscussionCommentModel =
    (mongoose.models.ProductDiscussionComment as
        | Model<InternalProductDiscussionComment>
        | undefined) ||
    mongoose.model<InternalProductDiscussionComment>(
        "ProductDiscussionComment",
        ProductDiscussionCommentSchema,
    );

export type { InternalProductDiscussionComment };
export default ProductDiscussionCommentModel;
