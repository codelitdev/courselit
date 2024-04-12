import { OngoingSequence as OS } from "@courselit/common-models";
import mongoose, { Schema, Document } from "mongoose";

export type OngoingSequence = OS & Document;

const OngoingSequenceSchema: Schema = new Schema<OngoingSequence>({
    sequenceId: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    // nextEmailId: { type: String },
    nextEmailScheduledTime: { type: Number, required: true },
    retryCount: { type: Number, required: true, default: 0 },
    sentEmailIds: { type: [String] },
});

OngoingSequenceSchema.index({ sequenceId: 1, userId: 1 }, { unique: true });

export default mongoose.models.OngoingSequence ||
    mongoose.model("OngoingSequence", OngoingSequenceSchema);
