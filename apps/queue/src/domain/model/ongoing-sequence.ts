import { OngoingSequence as OS } from "@courselit/common-models";
import mongoose, { Schema, Document } from "mongoose";

export type OngoingSequence = Omit<OS, "domain" | "id"> &
    Document & {
        domain: mongoose.Types.ObjectId;
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

const OngoingSequenceModel =
    (mongoose.models.OngoingSequence as mongoose.Model<OngoingSequence>) ||
    mongoose.model<OngoingSequence>("OngoingSequence", OngoingSequenceSchema);

export default OngoingSequenceModel;
