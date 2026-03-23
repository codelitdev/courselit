import mongoose from "mongoose";
import { RuleSchema } from "@courselit/orm-models";

export default mongoose.models.Rule || mongoose.model("Rule", RuleSchema);
