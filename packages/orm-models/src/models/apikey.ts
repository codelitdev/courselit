import { generateUniqueId } from "@courselit/utils";
import mongoose from "mongoose";

export interface InternalApiKey {
    _id: mongoose.Types.ObjectId;
    domain: mongoose.Types.ObjectId;
    keyId: string;
    name: string;
    key: string;
}

export const ApiKeySchema = new mongoose.Schema<InternalApiKey>(
    {
        domain: { type: mongoose.Schema.Types.ObjectId, required: true },
        keyId: { type: String, required: true, default: generateUniqueId },
        name: { type: String, required: true },
        key: { type: String, required: true, default: generateUniqueId },
    },
    {
        timestamps: true,
    },
);

ApiKeySchema.index(
    {
        domain: 1,
        name: 1,
    },
    { unique: true },
);

const ApiKeyModel =
    mongoose.models.ApiKey ||
    mongoose.model<InternalApiKey>("ApiKey", ApiKeySchema);

export default ApiKeyModel;
