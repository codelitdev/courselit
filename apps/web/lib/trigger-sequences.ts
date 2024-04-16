import { Rule, Constants, Sequence } from "@courselit/common-models";
import OngoingSequence from "@models/OngoingSequence";
import RuleModel from "@models/Rule";
import SequenceModel from "@models/Sequence";
import { User } from "@models/User";
import mongoose from "mongoose";
import { error } from "../services/logger";

export async function triggerSequences({
    user,
    event,
    data,
}: {
    user: User;
    event: (typeof Constants.eventTypes)[number];
    data: string;
}) {
    try {
        const rules: Rule[] = await RuleModel.find({
            domain: user.domain,
            event,
            eventData: data,
        }).lean();

        for (const rule of rules) {
            const sequence: Sequence & { _id: mongoose.Types.ObjectId } =
                await SequenceModel.findOne({
                    domain: user.domain,
                    sequenceId: rule.sequenceId,
                }).lean();

            if (!sequence) {
                continue;
            }

            await OngoingSequence.create({
                domain: user.domain,
                sequenceId: sequence.sequenceId,
                userId: user.userId,
                nextEmailScheduledTime:
                    new Date().getTime() + sequence.emails[0].delayInMillis,
            });

            await SequenceModel.updateOne(
                { _id: sequence._id },
                { $addToSet: { entrants: user.userId } },
            );
        }
    } catch (err: any) {
        error(err.message, {
            stack: err.stack,
        });
    }
}
