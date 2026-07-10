import mongoose from "mongoose";
import RateLimitEventModel from "@/models/RateLimitEvent";
import { responses } from "@/config/strings";

export async function assertRateLimit({
    domain,
    userId,
    scope,
    action,
    subjectId,
    window,
    limit,
    fingerprint,
    record = true,
}: {
    domain: mongoose.Types.ObjectId;
    userId: string;
    scope: string;
    action: string;
    subjectId: string;
    window: number;
    limit: number;
    fingerprint?: string;
    record?: boolean;
}) {
    const since = new Date(Date.now() - window);
    const existingEvents = await RateLimitEventModel.countDocuments({
        domain,
        userId,
        scope,
        action,
        subjectId,
        createdAt: { $gte: since },
    });

    if (existingEvents >= limit) {
        throw new Error(responses.action_not_allowed);
    }

    if (fingerprint) {
        const duplicate = await RateLimitEventModel.findOne({
            domain,
            userId,
            scope,
            subjectId,
            fingerprint,
            createdAt: { $gte: since },
        }).select("_id");

        if (duplicate) {
            throw new Error(responses.action_not_allowed);
        }
    }

    if (record) {
        await RateLimitEventModel.create({
            domain,
            userId,
            scope,
            action,
            subjectId,
            fingerprint,
        });
    }
}
