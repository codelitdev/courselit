import mongoose from "mongoose";
import { EmailSchema } from "@courselit/orm-models";

export default mongoose.models.Email || mongoose.model("Email", EmailSchema);
