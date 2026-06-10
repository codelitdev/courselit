import mongoose, { Model } from "mongoose";
import {
    InternalProductDiscussionSubscriber,
    ProductDiscussionSubscriberSchema,
} from "@courselit/orm-models";

const ProductDiscussionSubscriberModel =
    (mongoose.models.ProductDiscussionSubscriber as
        | Model<InternalProductDiscussionSubscriber>
        | undefined) ||
    mongoose.model<InternalProductDiscussionSubscriber>(
        "ProductDiscussionSubscriber",
        ProductDiscussionSubscriberSchema,
    );

export type { InternalProductDiscussionSubscriber };
export default ProductDiscussionSubscriberModel;
