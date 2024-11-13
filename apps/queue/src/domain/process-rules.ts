import RuleModel, { RuleWithDomain as Rule } from "./model/rule";
import OngoingSequence from "./model/ongoing-sequence";
import SequenceModel, { AdminSequence } from "./model/sequence";
import UserModel from "./model/user";
import convertFiltersToDBConditions from "./convert-filters-to-db-conditions";
import { logger } from "../logger";
import { Constants, User } from "@courselit/common-models";
import mongoose from "mongoose";

export async function processRules() {
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const currentTime = new Date();
        // eslint-disable-next-line no-console
        console.log(
            `Starting process of rules at ${currentTime.toDateString()}`,
        );

        const dueRules: Rule[] = (await RuleModel.find({
            event: Constants.eventTypes[4],
            eventDateInMillis: { $lt: currentTime.getTime() },
        }).lean()) as any;

        for (const rule of dueRules) {
            try {
                await processRule(rule);
            } catch (err: any) {
                logger.error(err);
            }
        }

        await new Promise((resolve) => setTimeout(resolve, 60 * 1000));
    }
}

async function processRule(rule: Rule) {
    const { domain, sequenceId } = rule;
    const sequence: AdminSequence | null = await SequenceModel.findOne({
        domain,
        sequenceId,
    });

    if (!sequence) {
        return;
    }

    await addBroadcastToOngoingSequence(sequence),
        (sequence.report = {
            broadcast: {
                lockedAt: new Date(),
                sentAt: null,
            },
            sequence: {
                subscribers: [],
                unsubscribers: [],
                failed: [],
            },
        });
    await (sequence as any).save();

    await RuleModel.deleteOne({ ruleId: rule.ruleId });
}

async function addBroadcastToOngoingSequence(sequence: AdminSequence) {
    const query: Partial<User & { domain: mongoose.Schema.Types.ObjectId }> = {
        domain: sequence.domain,
        ...convertFiltersToDBConditions(sequence.filter),
        subscribedToUpdates: true,
    };
    const allUsers = await UserModel.find(query);
    // eslint-disable-next-line no-console
    console.log(
        `Adding ${allUsers.length} users to ongoing sequence`,
        JSON.stringify(query),
    );
    const ongoingSequences = allUsers.map((user) => ({
        domain: sequence.domain,
        sequenceId: sequence.sequenceId,
        userId: user.userId,
        // nextEmailId: sequence.emails[0].emailId,
        nextEmailScheduledTime: new Date().getTime(),
    }));
    await OngoingSequence.insertMany(ongoingSequences);
    sequence.entrants = allUsers.map((user) => user.userId);
}
