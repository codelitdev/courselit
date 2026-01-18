import { OngoingSequence } from "@courselit/common-models";
import mongoose, { Schema } from "mongoose";

export const OngoingSequenceSchema: Schema = new Schema<
    Omit<OngoingSequence, "domain"> & { domain: mongoose.Types.ObjectId }
>(
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

const OngoingSequenceModel =
    mongoose.models.OngoingSequence ||
    mongoose.model("OngoingSequence", OngoingSequenceSchema);
export default OngoingSequenceModel;
