import mongoose from "mongoose";
import { Constants, Rule } from "@courselit/common-models";
import { generateUniqueId } from "@courselit/utils";

const RuleSchema = new mongoose.Schema<
    Rule & { domain: mongoose.Schema.Types.ObjectId }
>({
    domain: { type: mongoose.Schema.Types.ObjectId, required: true },
    ruleId: {
        type: String,
        required: true,
        default: generateUniqueId,
        unique: true,
    },
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
