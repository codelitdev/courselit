import mongoose, { Document } from "mongoose";
import { Constants, Sequence } from "@courselit/common-models";
import EmailSchema from "./email";
import { UserFilterWithAggregatorSchema } from "./user-filter";
import SequenceReportSchema from "./sequence-report";

export interface AdminSequence extends Sequence {
    domain: mongoose.Schema.Types.ObjectId;
    creatorId: string;
}

const SequenceSchema = new mongoose.Schema<AdminSequence>({
    domain: { type: mongoose.Schema.Types.ObjectId, required: true },
    sequenceId: { type: String, required: true, unique: true },
    type: { type: String, required: true, enum: Constants.mailTypes },
    title: { type: String, required: true },
    emails: [EmailSchema],
    creatorId: { type: String, required: true },
    report: SequenceReportSchema,
    broadcastSettings: {
        filter: UserFilterWithAggregatorSchema,
    },
    sequenceSettings: {
        excludeFilter: UserFilterWithAggregatorSchema,
    },
});

export default mongoose.models.Sequence ||
    mongoose.model("Sequence", SequenceSchema);
