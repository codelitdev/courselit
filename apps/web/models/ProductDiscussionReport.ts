import mongoose, { Model } from "mongoose";
import {
    InternalProductDiscussionReport,
    ProductDiscussionReportSchema,
} from "@courselit/orm-models";

const ProductDiscussionReportModel =
    (mongoose.models.ProductDiscussionReport as
        | Model<InternalProductDiscussionReport>
        | undefined) ||
    mongoose.model<InternalProductDiscussionReport>(
        "ProductDiscussionReport",
        ProductDiscussionReportSchema,
    );

export type { InternalProductDiscussionReport };
export default ProductDiscussionReportModel;
