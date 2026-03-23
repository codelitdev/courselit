import { MembershipSchema } from "@courselit/orm-models";
import mongoose from "mongoose";

export default mongoose.models.Membership ||
    mongoose.model("Membership", MembershipSchema);
