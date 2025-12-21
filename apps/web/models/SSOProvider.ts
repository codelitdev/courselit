import mongoose from "mongoose";

const SSOProviderSchema = new mongoose.Schema(
    {
        domain: { type: mongoose.Schema.Types.ObjectId, required: true },
        providerId: { type: String, required: true },
        issuer: { type: String },
        domain_string: { type: String },
        oidcConfig: { type: String },
        samlConfig: { type: String },
        userId: { type: String },
        organizationId: { type: String },
    },
    {
        collection: "ssoProviders",
    },
);

SSOProviderSchema.index({ domain: 1, providerId: 1 }, { unique: true });

export default mongoose.models.SSOProvider ||
    mongoose.model("SSOProvider", SSOProviderSchema);
