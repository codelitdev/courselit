import mongoose, { Model } from "mongoose";
import { UserSchema } from "@courselit/common-logic";

const UserModel =
    (mongoose.models.User as Model<any>) || mongoose.model("User", UserSchema);

export default UserModel;
