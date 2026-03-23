import mongoose from "mongoose";
import { UserSchema } from "@courselit/orm-models";

export default mongoose.models.User || mongoose.model("User", UserSchema);
