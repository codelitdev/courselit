import mongoose from "mongoose";
import { Email, Sequence } from "@courselit/common-models";
import { generateUniqueId } from "@courselit/utils";
import EmailSchema from "./Email";
import constants from "@config/constants";
import { UserFilterWithAggregatorSchema } from "./UserFilter";
import SequenceReportSchema from "./SequenceReport";

export interface AdminSequence
    extends Pick<
        Sequence,
        | "sequenceId"
        | "broadcastSettings"
        | "sequenceSettings"
        | "report"
        | "title"
        | "type"
    > {
    domain: mongoose.Types.ObjectId;
    creatorId: string;
    emails: Partial<Email>[];
}

const SequenceSchema = new mongoose.Schema<AdminSequence>({
    domain: { type: mongoose.Schema.Types.ObjectId, required: true },
    sequenceId: {
        type: String,
        required: true,
        default: generateUniqueId,
        unique: true,
    },
    type: { type: String, required: true, enum: constants.mailTypes },
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
