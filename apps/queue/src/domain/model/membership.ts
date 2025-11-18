import { MembershipSchema } from "@courselit/common-logic";
import mongoose, { Model } from "mongoose";

const MembershipModel =
    (mongoose.models.Membership as Model<any>) ||
    mongoose.model("Membership", MembershipSchema);

export default MembershipModel;
