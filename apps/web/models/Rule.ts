import mongoose from "mongoose";
import { RuleSchema } from "@courselit/common-logic";

export default mongoose.models.Rule || mongoose.model("Rule", RuleSchema);
