import mongoose from "mongoose";

export const LogSchema = new mongoose.Schema(
    {
        severity: {
            type: String,
            required: true,
            enum: ["error", "info", "warn"],
        },
        message: { type: String, required: true },
        metadata: { type: mongoose.Schema.Types.Mixed },
    },
    {
        timestamps: true,
    },
);
