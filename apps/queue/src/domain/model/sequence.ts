import mongoose, { Model } from "mongoose";
import { SequenceSchema } from "@courselit/orm-models";

const SequenceModel =
    (mongoose.models.Sequence as Model<any>) ||
    mongoose.model("Sequence", SequenceSchema);

export default SequenceModel;
