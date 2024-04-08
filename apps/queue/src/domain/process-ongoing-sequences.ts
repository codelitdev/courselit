import { Sequence } from "@courselit/common-models";
import { AdminSequence } from "./model/sequence";
import OngoingSequenceModel, {
    OngoingSequence,
} from "./model/ongoing-sequence";
import { UserWithDomain } from "./model/user";
import { logger } from "../logger";
import { sequenceBounceLimit } from "../constants";
import {
    deleteOngoingSequence,
    getDueOngoingSequences,
    getSequence,
    getUser,
    removeRuleForBroadcast,
    updateSequenceSentAt,
} from "./queries";
import { sendMail } from "../mail";

export async function processOngoingSequences(): Promise<void> {
    // eslint-disable-next-line no-constant-condition
    while (true) {
        // eslint-disable-next-line no-console
        console.log(
            `Starting process of ongoing sequence at ${new Date().toDateString()}`,
        );

        const dueOngoingSequences = await getDueOngoingSequences();
        for (const ongoingSequence of dueOngoingSequences) {
            try {
                await processOngoingSequence(ongoingSequence);
            } catch (err: any) {
                logger.error(err);
            }
        }

        await new Promise((resolve) => setTimeout(resolve, 60 * 1000));
    }
}

async function processOngoingSequence(ongoingSequence: OngoingSequence) {
    const [sequence, user, creator] = await Promise.all([
        getSequence(ongoingSequence.sequenceId),
        getUser(ongoingSequence.userId),
        getSequence(ongoingSequence.sequenceId).then((sequence) =>
            sequence ? getUser(sequence.creatorId) : null,
        ),
    ]);

    if (!sequence || !user || !creator) {
        return await cleanUpResources(ongoingSequence);
    }

    await attemptMailSending({
        creator,
        user,
        sequence,
        ongoingSequence,
    });
    await updateOngoingSequence({ ongoingSequence, sequence });
}

async function cleanUpResources(
    ongoingSequence: OngoingSequence,
    completed?: boolean,
) {
    await deleteOngoingSequence(ongoingSequence.sequenceId);
    if (completed) {
        await updateSequenceReports(ongoingSequence.sequenceId);
    }
}

async function updateSequenceReports(sequenceId: string) {
    const remainingOngoingSequencesWithSameSequenceId: OngoingSequence[] =
        await OngoingSequenceModel.find({
            sequenceId,
        });
    if (remainingOngoingSequencesWithSameSequenceId.length === 0) {
        const sequence = await getSequence(sequenceId);
        if (!sequence) {
            return;
        }
        if (sequence.type === "broadcast") {
            await removeRuleForBroadcast(sequence.sequenceId);
            await updateSequenceSentAt(sequence.sequenceId);
        }
    }
}

async function attemptMailSending({
    creator,
    user,
    sequence,
    ongoingSequence,
}: {
    creator: UserWithDomain;
    user: UserWithDomain;
    sequence: AdminSequence;
    ongoingSequence: OngoingSequence;
}) {
    try {
        await sendMail({
            from: creator!.email,
            to: user.email,
            subject: sequence.emails[0].subject,
            html: sequence.emails[0].content,
        });
    } catch (err: any) {
        ongoingSequence.retryCount++;
        if (ongoingSequence.retryCount >= sequenceBounceLimit) {
            sequence.report.sequence.failed = [
                ...sequence.report.sequence.failed,
                ongoingSequence.userId,
            ];
            await (sequence as any).save();
            await deleteOngoingSequence(ongoingSequence.sequenceId);
        } else {
            await ongoingSequence.save();
        }
        throw err;
    }
}

async function updateOngoingSequence({
    ongoingSequence,
    sequence,
}: {
    ongoingSequence: OngoingSequence;
    sequence: AdminSequence;
}) {
    const { nextEmailId, nextEmailScheduledTime } = getNextEmailWithTime(
        sequence,
        ongoingSequence,
    );
    if (!nextEmailId) {
        return await cleanUpResources(ongoingSequence, true);
    }
    ongoingSequence.nextEmailId = nextEmailId;
    ongoingSequence.nextEmailScheduledTime = nextEmailScheduledTime;
    await ongoingSequence.save();
}

function getNextEmailWithTime(
    sequence: Sequence,
    ongoingSequence: OngoingSequence,
) {
    const { emails } = sequence;
    const currentIndex = emails.findIndex(
        (email) => email.emailId === ongoingSequence.nextEmailId,
    );
    if (currentIndex === -1) {
        throw new Error(
            `Email with id ${ongoingSequence.nextEmailId} not found in sequence ${sequence.sequenceId}`,
        );
    }
    const nextIndex = currentIndex + 1;
    if (nextIndex >= emails.length) {
        return { nextEmailId: undefined, nextEmailScheduledTime: undefined };
    }
    const nextEmail = emails[nextIndex];
    const nextEmailScheduledTime = new Date(
        ongoingSequence.nextEmailScheduledTime + nextEmail.delayInMillis,
    ).getTime();
    return { nextEmailId: nextEmail.emailId, nextEmailScheduledTime };
}
