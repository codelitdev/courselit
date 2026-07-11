import mongoose from "mongoose";

import {
    ProductDiscussionCommentSchema,
    ProductDiscussionLikeSchema,
    ProductDiscussionReplySchema,
    ProductDiscussionReportSchema,
    ProductDiscussionSubscriberSchema,
    ProductDiscussionSummarySchema,
} from "./models/product-discussion";

function getModel(name: string, schema: mongoose.Schema) {
    return mongoose.models[name] || mongoose.model(name, schema);
}

export async function deleteProductDiscussionData({
    domain,
    productId,
}: {
    domain: mongoose.Types.ObjectId;
    productId: string;
}) {
    const target = { domain, productId };

    await Promise.all([
        getModel(
            "ProductDiscussionComment",
            ProductDiscussionCommentSchema,
        ).deleteMany(target),
        getModel(
            "ProductDiscussionReply",
            ProductDiscussionReplySchema,
        ).deleteMany(target),
        getModel(
            "ProductDiscussionLike",
            ProductDiscussionLikeSchema,
        ).deleteMany(target),
        getModel(
            "ProductDiscussionReport",
            ProductDiscussionReportSchema,
        ).deleteMany(target),
        getModel(
            "ProductDiscussionSummary",
            ProductDiscussionSummarySchema,
        ).deleteMany(target),
        getModel(
            "ProductDiscussionSubscriber",
            ProductDiscussionSubscriberSchema,
        ).deleteMany(target),
    ]);
}
