import mongoose from "mongoose";

export const AccountSchema = new mongoose.Schema(
    {
        domain: { type: mongoose.Schema.Types.ObjectId, required: true },
        userId: { type: mongoose.Schema.Types.ObjectId, required: true },
        accountId: { type: String, required: true },
        providerId: { type: String, required: true },
        accessToken: String,
        refreshToken: String,
        accessTokenExpiresAt: Date,
        refreshTokenExpiresAt: Date,
        scope: String,
        idToken: String,
        password: String,
    },
    {
        timestamps: true,
    },
);
