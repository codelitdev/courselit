import {
    InboundEmailReceiptSchema,
    InternalInboundEmailReceipt,
} from "@courselit/orm-models";
import mongoose, { Model } from "mongoose";

const InboundEmailReceiptModel =
    (mongoose.models.InboundEmailReceipt as
        | Model<InternalInboundEmailReceipt>
        | undefined) ||
    mongoose.model<InternalInboundEmailReceipt>(
        "InboundEmailReceipt",
        InboundEmailReceiptSchema,
    );

export default InboundEmailReceiptModel;
