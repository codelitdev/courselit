import mongoose from "mongoose";

export interface VerificationToken {
    _id: mongoose.Types.ObjectId;
    email: string;
    domain: string;
    code: string;
    timestamp: Date;
}

const VerificationTokenSchema = new mongoose.Schema<VerificationToken>({
    email: { type: String, required: true },
    domain: { type: String, required: true },
    code: { type: String, required: true },
    timestamp: { type: Date, required: true },
});

VerificationTokenSchema.index(
    {
        email: 1,
        domain: 1,
        code: 1,
    },
    { unique: true },
);

export default mongoose.models.VerificationToken ||
    mongoose.model("VerificationToken", VerificationTokenSchema);
