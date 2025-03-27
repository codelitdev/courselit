import mongoose from "mongoose";
import { SequenceSchema } from "@courselit/common-logic";

export default mongoose.models.Sequence ||
    mongoose.model("Sequence", SequenceSchema);
