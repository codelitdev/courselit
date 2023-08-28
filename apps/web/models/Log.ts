import mongoose from "mongoose";
import constants from "../config/constants";

const { severityError, severityInfo, severityWarn } = constants;

const LogSchema = new mongoose.Schema(
    {
        severity: {
            type: String,
            required: true,
            enum: [severityError, severityInfo, severityWarn],
        },
        message: { type: String, required: true },
        metadata: { type: mongoose.Schema.Types.Mixed },
    },
    {
        timestamps: true,
    },
);

export default mongoose.models.Log || mongoose.model("Log", LogSchema);
