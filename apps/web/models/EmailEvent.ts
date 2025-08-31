import mongoose from "mongoose";
import { EmailEventSchema } from "@courselit/common-logic";

export default mongoose.models.EmailEvent ||
    mongoose.model("EmailEvent", EmailEventSchema);
