import mongoose from "mongoose";

export const RATE_LIMIT_EVENT_TTL_SECONDS = 25 * 60 * 60; // 25 hours

export interface InternalRateLimitEvent extends mongoose.Document {
    domain: mongoose.Types.ObjectId;
    userId: string;
    scope: string;
    action: string;
    subjectId: string;
    fingerprint?: string;
    createdAt: Date;
}

export const RateLimitEventSchema = new mongoose.Schema<InternalRateLimitEvent>(
    {
        domain: { type: mongoose.Schema.Types.ObjectId, required: true },
        userId: { type: String, required: true },
        scope: { type: String, required: true },
        action: { type: String, required: true },
        subjectId: { type: String, required: true },
        fingerprint: String,
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
    },
);

RateLimitEventSchema.index({
    domain: 1,
    userId: 1,
    scope: 1,
    action: 1,
    subjectId: 1,
    createdAt: -1,
});
RateLimitEventSchema.index({
    domain: 1,
    userId: 1,
    scope: 1,
    subjectId: 1,
    fingerprint: 1,
    createdAt: -1,
});
RateLimitEventSchema.index(
    { createdAt: 1 },
    { expireAfterSeconds: RATE_LIMIT_EVENT_TTL_SECONDS },
);
