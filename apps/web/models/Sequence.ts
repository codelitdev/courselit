import mongoose from "mongoose";
import { SequenceSchema } from "@courselit/orm-models";

export default mongoose.models.Sequence ||
    mongoose.model("Sequence", SequenceSchema);
