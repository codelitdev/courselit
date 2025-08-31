import mongoose from "mongoose";
import { EmailDeliverySchema } from "@courselit/common-logic";

export default mongoose.models.EmailDelivery ||
    mongoose.model("EmailDelivery", EmailDeliverySchema);
