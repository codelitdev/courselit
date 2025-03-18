import { MembershipSchema } from "@courselit/common-logic";
import mongoose from "mongoose";

export default mongoose.models.Membership ||
    mongoose.model("Membership", MembershipSchema);
