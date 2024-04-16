import mongoose from "mongoose";
import { Constants, Sequence } from "@courselit/common-models";
import EmailSchema from "./email";
import { UserFilterWithAggregatorSchema } from "./user-filter";
import SequenceReportSchema from "./sequence-report";

export interface AdminSequence extends Sequence {
    domain: mongoose.Schema.Types.ObjectId;
    creatorId: string;
}

const EmailFromSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String },
});

const TriggerSchema = new mongoose.Schema({
    type: { type: String, required: true, enum: Constants.eventTypes },
    data: { type: String },
});

const SequenceSchema = new mongoose.Schema<AdminSequence>({
    domain: { type: mongoose.Schema.Types.ObjectId, required: true },
    sequenceId: { type: String, required: true, unique: true },
    type: { type: String, required: true, enum: Constants.mailTypes },
    title: { type: String, required: true },
    emails: [EmailSchema],
    creatorId: { type: String, required: true },
    report: SequenceReportSchema,
    from: EmailFromSchema,
    filter: UserFilterWithAggregatorSchema,
    excludeFilter: UserFilterWithAggregatorSchema,
    trigger: TriggerSchema,
    status: {
        type: String,
        required: true,
        default: Constants.sequenceStatus[0],
        enum: Constants.sequenceStatus,
    },
    emailsOrder: [String],
    entrants: [String],
});

export default mongoose.models.Sequence ||
    mongoose.model("Sequence", SequenceSchema);
