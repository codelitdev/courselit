import RuleModel, { RuleWithDomain as Rule } from "./model/rule";
import OngoingSequence from "./model/ongoing-sequence";
import SequenceModel, { AdminSequence } from "./model/sequence";
import User from "./model/user";
import convertFiltersToDBConditions from "./convert-filters-to-db-conditions";
import { logger } from "../../logger";

export async function processRules() {
    while (true) {
        const currentTime = new Date().getTime();
        console.log(`Starting process of rules at ${currentTime}`);

        const rules: Rule[] = await RuleModel.find({
            event: "date:occurred",
            "data.dateInMillis": { $lt: new Date().getTime() },
            active: true,
        }).lean();

        for (const rule of rules) {
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
    const {
        domain,
        action,
        data: { sequenceId },
    } = rule;
    if (action === "seq:start") {
        const sequence: AdminSequence | null = await SequenceModel.findOne({
            domain,
            sequenceId,
        });
        if (sequence) {
            await Promise.all([
                addBroadcastToOngoingSequence(sequence),
                (async () => {
                    sequence.report = {
                        broadcast: {
                            lockedAt: new Date(),
                            sentAt: null,
                        },
                        sequence: {
                            subscribers: [],
                            unsubscribers: [],
                            failed: [],
                        },
                    };
                    await (sequence as any).save();
                })(),
            ]);
            await RuleModel.updateOne(
                { ruleId: rule.ruleId },
                { active: false },
            );
        }
    }
}

async function addBroadcastToOngoingSequence(sequence: AdminSequence) {
    const query = {
        domain: sequence.domain,
        ...convertFiltersToDBConditions(sequence.broadcastSettings.filter),
    };
    const allUsers = await User.find(query);
    console.log(
        `Adding ${allUsers.length} users to ongoing sequence`,
        JSON.stringify(query),
    );
    const ongoingSequences = allUsers.map((user) => ({
        domain: sequence.domain,
        sequenceId: sequence.sequenceId,
        userId: user.userId,
        nextEmailId: sequence.emails[0].emailId,
        nextEmailScheduledTime: new Date().getTime(),
    }));
    await OngoingSequence.insertMany(ongoingSequences);
}
