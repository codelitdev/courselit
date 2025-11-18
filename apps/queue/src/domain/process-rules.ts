import RuleModel from "./model/rule";
import OngoingSequence from "./model/ongoing-sequence";
import SequenceModel from "./model/sequence";
import UserModel from "./model/user";
import MembershipModel from "./model/membership";
import { logger } from "../logger";
import { Constants, Rule, User } from "@courselit/common-models";
import mongoose from "mongoose";
import {
    AdminSequence,
    convertFiltersToDBConditions,
} from "@courselit/common-logic";

type RuleWithDomain = Omit<Rule, "domain"> & {
    domain: mongoose.Types.ObjectId;
};

export async function processRules() {
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const currentTime = new Date();
        // eslint-disable-next-line no-console
        console.log(
            `Starting process of rules at ${currentTime.toDateString()}`,
        );

        // @ts-ignore - Mongoose type compatibility issue
        const dueRules: RuleWithDomain[] = (await RuleModel.find({
            event: Constants.EventType.DATE_OCCURRED,
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

async function processRule(rule: RuleWithDomain) {
    const { domain, sequenceId } = rule;
    // @ts-ignore - Mongoose type compatibility issue
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
    const query: Partial<Omit<User, "domain">> & {
        domain: mongoose.Types.ObjectId;
    } = {
        domain: sequence.domain,
        ...(await convertFiltersToDBConditions({
            domain: sequence.domain,
            filter: sequence.filter,
            membershipModel: MembershipModel,
        })),
        subscribedToUpdates: true,
    };
    // @ts-ignore - Mongoose type compatibility issue
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
