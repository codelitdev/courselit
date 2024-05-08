import { Domain, Email, Sequence } from "@courselit/common-models";
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
    getDomain,
    getTemplate,
} from "./queries";
import { sendMail } from "../mail";
import { Liquid } from "liquidjs";
import { Worker } from "bullmq";
import redis from "../redis";
import mongoose from "mongoose";
import sequenceQueue from "./sequence-queue";
const liquidEngine = new Liquid();

new Worker(
    "sequence",
    async (job) => {
        const ongoingSequenceId = job.data;
        try {
            await processOngoingSequence(ongoingSequenceId);
        } catch (err: any) {
            logger.error(err);
        }
    },
    { connection: redis },
);

export async function processOngoingSequences(): Promise<void> {
    // eslint-disable-next-line no-constant-condition
    while (true) {
        // eslint-disable-next-line no-console
        console.log(
            `Starting process of ongoing sequence at ${new Date().toDateString()}`,
        );

        const dueOngoingSequences = await getDueOngoingSequences();
        for (const ongoingSequence of dueOngoingSequences) {
            sequenceQueue.add("sequence", ongoingSequence.id);
        }

        await new Promise((resolve) => setTimeout(resolve, 60 * 1000));
    }
}

async function processOngoingSequence(
    ongoingSequenceId: mongoose.Types.ObjectId,
) {
    const ongoingSequence =
        await OngoingSequenceModel.findById(ongoingSequenceId);
    if (!ongoingSequence) {
        return;
    }

    const domain = await getDomain(ongoingSequence.domain);
    if (
        !domain ||
        !domain.quota ||
        !domain.quota.mail ||
        !domain.settings?.mailingAddress
    ) {
        console.log(`Invalid domain settings for "${domain.name}"`, domain); // eslint-disable-line no-console
        return;
    }
    if (
        domain.quota.mail.dailyCount >= domain.quota.mail.daily ||
        domain.quota.mail.monthlyCount >= domain.quota.mail.monthly
    ) {
        console.log(`Domain quota exceeded for "${domain.name}"`); // eslint-disable-line no-console
        return;
    }

    const sequence = await getSequence(ongoingSequence.sequenceId);
    const [user, creator] = await Promise.all([
        getUser(ongoingSequence.userId),
        sequence ? getUser(sequence.creatorId) : null,
    ]);

    if (!sequence || !user || !creator) {
        return await cleanUpResources(ongoingSequence);
    }

    const nextPublishedEmail = getNextPublishedEmail(sequence, ongoingSequence);

    await attemptMailSending({
        domain,
        creator,
        user,
        sequence,
        ongoingSequence,
        email: nextPublishedEmail,
    });

    ongoingSequence.sentEmailIds.push(nextPublishedEmail.emailId);
    await domain.incrementEmailCount();
    const nextEmail = getNextPublishedEmail(sequence, ongoingSequence);
    if (!nextEmail) {
        return await cleanUpResources(ongoingSequence, true);
    } else {
        ongoingSequence.nextEmailScheduledTime = new Date(
            ongoingSequence.nextEmailScheduledTime + nextEmail.delayInMillis,
        ).getTime();
        await ongoingSequence.save();
    }
}

function getNextPublishedEmail(
    sequence: Sequence,
    ongoingSequence: OngoingSequence,
) {
    let nextPublishedEmail = null;
    const sentEmailIdsSet = new Set(ongoingSequence.sentEmailIds);
    for (const mailId of sequence.emailsOrder) {
        const email = sequence.emails.find(
            (email) => email.emailId === mailId && email.published,
        );
        if (email && !sentEmailIdsSet.has(email.emailId)) {
            nextPublishedEmail = email;
            break;
        }
    }
    return nextPublishedEmail;
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
    email,
    domain,
}: {
    creator: UserWithDomain;
    user: UserWithDomain;
    sequence: AdminSequence;
    ongoingSequence: OngoingSequence;
    email: Email;
    domain: Domain;
}) {
    const from = sequence.from
        ? `${sequence.from.name} <${creator.email}>`
        : `${creator.email} <${creator.email}>`;
    const to = user.email;
    const subject = email.subject;
    const unsubscribeLink = `https://${
        domain.customDomain
            ? `${domain.customDomain}`
            : `${domain.name}.${process.env.DOMAIN}`
    }/api/unsubscribe/${user.unsubscribeToken}`;
    const templatePayload = {
        subscriber: {
            email: user.email,
            name: user.name,
            tags: user.tags,
        },
        address: domain.settings.mailingAddress,
        unsubscribe_link: unsubscribeLink,
    };
    // const content = email.content;
    let content = await liquidEngine.parseAndRender(
        email.content,
        templatePayload,
    );
    if (email.templateId) {
        const template = await getTemplate(email.templateId);
        if (template) {
            content = await liquidEngine.parseAndRender(
                template.content,
                Object.assign({}, templatePayload, {
                    content: content,
                }),
            );
        }
    }
    try {
        await sendMail({
            from,
            to,
            subject,
            html: content,
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
