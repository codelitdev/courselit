import mongoose, { Model } from "mongoose";
import {
    InternalProductDiscussionSummary,
    ProductDiscussionSummarySchema,
} from "@courselit/orm-models";

const ProductDiscussionSummaryModel =
    (mongoose.models.ProductDiscussionSummary as
        | Model<InternalProductDiscussionSummary>
        | undefined) ||
    mongoose.model<InternalProductDiscussionSummary>(
        "ProductDiscussionSummary",
        ProductDiscussionSummarySchema,
    );

export type { InternalProductDiscussionSummary };
export default ProductDiscussionSummaryModel;
