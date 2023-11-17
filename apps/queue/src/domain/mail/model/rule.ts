import mongoose, { Document } from "mongoose";
import { Constants, Rule } from "@courselit/common-models";

export type RuleWithDomain = Rule & { domain: mongoose.Schema.Types.ObjectId };

const RuleSchema = new mongoose.Schema<RuleWithDomain>({
    domain: { type: mongoose.Schema.Types.ObjectId, required: true },
    ruleId: { type: String, required: true, unique: true },
    event: {
        type: String,
        required: true,
        enum: Constants.eventTypes,
        index: true,
    },
    action: { type: String, required: true, enum: Constants.actionTypes },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    active: { type: Boolean, default: true, index: true },
});

export default mongoose.models.Rule || mongoose.model("Rule", RuleSchema);
