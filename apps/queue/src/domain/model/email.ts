import mongoose from "mongoose";
import { EmailSchema } from "@courselit/common-logic";

export default mongoose.models.Email || mongoose.model("Email", EmailSchema);
