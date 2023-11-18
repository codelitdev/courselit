import { Sequence } from "@courselit/common-models";
import SequenceModel, { AdminSequence } from "./model/sequence";
import OngoingSequenceModel, {
    OngoingSequence,
} from "./model/ongoing-sequence";
import nodemailer from "nodemailer";
import UserModel, { UserWithDomain } from "./model/user";
import { logger } from "../../logger";
import rule from "./model/rule";

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: +(process.env.EMAIL_PORT || 587),
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

export async function processOngoingSequences(): Promise<void> {
    while (true) {
        const currentTime = new Date().getTime();
        console.log(`Starting process of ongoing sequence at ${currentTime}`);

        const dueOngoingSequences: OngoingSequence[] =
            await OngoingSequenceModel.find({
                nextEmailScheduledTime: { $lt: currentTime },
                retryCount: { $lt: +process.env.SEQUENCE_BOUNCE_LIMIT },
            });

        for (const ongoingSequence of dueOngoingSequences) {
            await processOngoingSequence(ongoingSequence);
        }

        await new Promise((resolve) => setTimeout(resolve, 60 * 1000));
    }
}

async function processOngoingSequence(ongoingSequence: OngoingSequence) {
    const [sequence, user, creator] = await Promise.all([
        SequenceModel.findOne({
            sequenceId: ongoingSequence.sequenceId,
        }).lean<AdminSequence | null>(),
        UserModel.findOne({
            userId: ongoingSequence.userId,
            active: true,
        }).lean<UserWithDomain | null>(),
        SequenceModel.findOne({ sequenceId: ongoingSequence.sequenceId })
            .lean<AdminSequence | null>()
            .then((sequence) =>
                sequence
                    ? UserModel.findOne({
                          userId: sequence.creatorId,
                          active: true,
                      }).lean<UserWithDomain | null>()
                    : null,
            ),
    ]);

    if (!sequence || !user || !creator) {
        return await cleanUpResources(ongoingSequence);
    }

    try {
        await attemptMailSending({
            creator,
            user,
            sequence,
            ongoingSequence,
        });
        await updateOngoingSequence({ ongoingSequence, sequence });
    } catch (err: any) {
        logger.error(err);
    }
}

async function cleanUpResources(
    ongoingSequence: OngoingSequence,
    completed?: boolean,
) {
    // update sequence sentAt if no records are found in ongoing sequences for this sequence
    await OngoingSequenceModel.deleteOne({
        sequenceId: ongoingSequence.sequenceId,
    });
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
        const sequence: AdminSequence | null = await SequenceModel.findOne({
            sequenceId,
        });
        if (!sequence) {
            return;
        }
        if (sequence.type === "broadcast") {
            await removeRuleForBroadcast(sequence);
            sequence.report.broadcast.sentAt = new Date();
            await (sequence as any).save();
        }
    }
}

async function removeRuleForBroadcast(sequence: AdminSequence) {
    await rule.deleteOne({
        event: "date:occurred",
        "data.sequenceId": sequence.sequenceId,
    });
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
        await transporter.sendMail({
            from: creator!.email,
            to: user.email,
            subject: sequence.emails[0].subject,
            html: sequence.emails[0].content,
        });
    } catch (err: any) {
        ongoingSequence.retryCount++;
        if (ongoingSequence.retryCount >= +process.env.SEQUENCE_BOUNCE_LIMIT) {
            sequence.report.sequence.failed = [
                ...sequence.report.sequence.failed,
                ongoingSequence.userId,
            ];
            await (sequence as any).save();
            await OngoingSequenceModel.deleteOne({
                sequenceId: ongoingSequence.sequenceId,
            });
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
