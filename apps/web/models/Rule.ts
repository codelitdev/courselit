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
    sequenceId: { type: String, required: true },
    eventDateInMillis: { type: Number },
    eventData: { type: String },
});

export default mongoose.models.Rule || mongoose.model("Rule", RuleSchema);
