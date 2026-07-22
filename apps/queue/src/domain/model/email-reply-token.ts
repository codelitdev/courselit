import {
    EmailReplyTokenSchema,
    InternalEmailReplyToken,
} from "@courselit/orm-models";
import mongoose, { Model } from "mongoose";

const EmailReplyTokenModel =
    (mongoose.models.EmailReplyToken as Model<InternalEmailReplyToken>) ||
    mongoose.model<InternalEmailReplyToken>(
        "EmailReplyToken",
        EmailReplyTokenSchema,
    );

export default EmailReplyTokenModel;
