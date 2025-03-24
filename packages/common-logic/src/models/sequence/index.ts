import mongoose from "mongoose";
import { Email, Sequence } from "@courselit/common-models";
import { generateUniqueId } from "@courselit/utils";
import { EmailSchema } from "../email";
import { UserFilterWithAggregatorSchema } from "../user-filter";
import { SequenceReportSchema } from "./sequence-report";
import { Constants } from "@courselit/common-models";

export interface AdminSequence
    extends Pick<
        Sequence,
        | "sequenceId"
        | "report"
        | "title"
        | "type"
        | "from"
        | "trigger"
        | "filter"
        | "excludeFilter"
        | "status"
        | "emailsOrder"
    > {
    domain: mongoose.Types.ObjectId;
    creatorId: string;
    emails: Partial<Email>[];
    entrants: string[];
}

const EmailFromSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String },
});

const TriggerSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: Object.values(Constants.EventType),
    },
    data: { type: String },
});

export const SequenceSchema = new mongoose.Schema<AdminSequence>(
    {
        domain: { type: mongoose.Schema.Types.ObjectId, required: true },
        sequenceId: {
            type: String,
            required: true,
            default: generateUniqueId,
            unique: true,
        },
        type: { type: String, required: true, enum: Constants.mailTypes },
        title: { type: String, default: "" },
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
    },
    {
        timestamps: true,
    },
);
