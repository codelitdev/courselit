import {
    Rule,
    Constants,
    Sequence,
    User,
    type Event,
    Email,
} from "@courselit/common-models";
import OngoingSequence from "@models/OngoingSequence";
import RuleModel from "@models/Rule";
import SequenceModel from "@models/Sequence";
import mongoose from "mongoose";
import { error } from "../services/logger";

export async function triggerSequences({
    user,
    event,
    data,
}: {
    user: User;
    event: Event;
    data?: string;
}) {
    if (!user.subscribedToUpdates) {
        return;
    }

    try {
        const filter: Partial<Rule & { domain: string }> = {
            domain: user.domain!,
            event,
        };
        if (data) {
            filter.eventData = data;
        }
        const rules = (await RuleModel.find(
            filter,
        ).lean()) as unknown as Rule[];

        for (const rule of rules) {
            const sequence = (await SequenceModel.findOne({
                domain: user.domain,
                sequenceId: rule.sequenceId,
                status: Constants.sequenceStatus[1],
            }).lean()) as unknown as Sequence & {
                _id: mongoose.Types.ObjectId;
            };

            if (!sequence) {
                continue;
            }

            let firstPublishedEmail: Email | null = null;
            for (let mailId of sequence.emailsOrder) {
                const email = sequence.emails.find(
                    (email) => email.emailId === mailId,
                );
                if (!email) {
                    continue;
                }
                if (email.published) {
                    firstPublishedEmail = email;
                    break;
                }
            }

            if (!firstPublishedEmail) {
                continue;
            }

            await OngoingSequence.create({
                domain: user.domain,
                sequenceId: sequence.sequenceId,
                userId: user.userId,
                nextEmailScheduledTime:
                    new Date().getTime() + firstPublishedEmail.delayInMillis,
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
