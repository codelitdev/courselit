import { OngoingSequence as OS } from "@courselit/common-models";
import mongoose, { Schema, Document } from "mongoose";

export type OngoingSequence = OS &
    Document & {
        domain: mongoose.Schema.Types.ObjectId;
    };

const OngoingSequenceSchema: Schema = new Schema<OngoingSequence>(
    {
        domain: { type: mongoose.Schema.Types.ObjectId, required: true },
        sequenceId: { type: String, required: true, index: true },
        userId: { type: String, required: true },
        nextEmailScheduledTime: { type: Number, required: true },
        retryCount: { type: Number, required: true, default: 0 },
        sentEmailIds: { type: [String] },
    },
    {
        timestamps: true,
    },
);

OngoingSequenceSchema.index({ sequenceId: 1, userId: 1 }, { unique: true });

export default mongoose.models.OngoingSequence ||
    mongoose.model("OngoingSequence", OngoingSequenceSchema);
