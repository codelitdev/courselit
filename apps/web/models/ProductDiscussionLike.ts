import mongoose, { Model } from "mongoose";
import {
    InternalProductDiscussionLike,
    ProductDiscussionLikeSchema,
} from "@courselit/orm-models";

const ProductDiscussionLikeModel =
    (mongoose.models.ProductDiscussionLike as
        | Model<InternalProductDiscussionLike>
        | undefined) ||
    mongoose.model<InternalProductDiscussionLike>(
        "ProductDiscussionLike",
        ProductDiscussionLikeSchema,
    );

export type { InternalProductDiscussionLike };
export default ProductDiscussionLikeModel;
