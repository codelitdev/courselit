import type { InternalCommunity } from "@courselit/orm-models";
import { CommunitySchema } from "@courselit/orm-models";
import mongoose, { Model } from "mongoose";

const CommunityModel =
    (mongoose.models.Community as Model<InternalCommunity> | undefined) ||
    mongoose.model<InternalCommunity>("Community", CommunitySchema);

export { InternalCommunity };
export default CommunityModel;
