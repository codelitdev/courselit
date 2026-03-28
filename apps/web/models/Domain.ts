import { Domain as InternalDomain, DomainSchema } from "@courselit/orm-models";
import mongoose, { Model } from "mongoose";

const DomainModel =
    (mongoose.models.Domain as Model<InternalDomain> | undefined) ||
    mongoose.model<InternalDomain>("Domain", DomainSchema);

export type { InternalDomain as Domain };
export default DomainModel;
