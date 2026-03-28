import mongoose from "mongoose";
import { EmailEventSchema } from "@courselit/orm-models";

export default mongoose.models.EmailEvent ||
    mongoose.model("EmailEvent", EmailEventSchema);
