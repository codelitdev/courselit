import mongoose from "mongoose";

const SSOProviderSchema = new mongoose.Schema(
    {
        domain: { type: mongoose.Schema.Types.ObjectId, required: true },
        id: { type: String, unique: true, required: true },
        issuer: { type: String },
        domain_string: { type: String },
        oidcConfig: { type: String },
        samlConfig: { type: String },
        userId: { type: String },
        providerId: { type: String, required: true, unique: true },
        organizationId: { type: String },
    },
    {
        collection: "ssoProviders",
    },
);

export default mongoose.models.SSOProvider ||
    mongoose.model("SSOProvider", SSOProviderSchema);
