import mongoose from "mongoose";
import { UserSchema } from "@courselit/common-logic";

export default mongoose.models.User || mongoose.model("User", UserSchema);
