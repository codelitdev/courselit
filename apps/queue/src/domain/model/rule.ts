import mongoose, { Model } from "mongoose";
import { RuleSchema } from "@courselit/common-logic";

const RuleModel =
    (mongoose.models.Rule as Model<any>) || mongoose.model("Rule", RuleSchema);

export default RuleModel;
