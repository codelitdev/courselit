import { SequenceReport } from "@courselit/common-models";
import mongoose from "mongoose";

const SequenceReportSchema = new mongoose.Schema<SequenceReport>({
    broadcast: {
        lockedAt: Date,
        sentAt: Date,
    },
    sequence: {
        subscribers: [String],
        unsubscribers: [String],
        failed: [String],
    },
});

export default SequenceReportSchema;
