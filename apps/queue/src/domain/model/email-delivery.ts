import mongoose from "mongoose";
import { EmailDeliverySchema } from "@courselit/orm-models";

export default mongoose.models.EmailDelivery ||
    mongoose.model("EmailDelivery", EmailDeliverySchema);
