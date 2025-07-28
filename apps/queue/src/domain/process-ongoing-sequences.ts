import { Domain, Email } from "@courselit/common-models";
import OngoingSequenceModel, {
    OngoingSequence,
} from "./model/ongoing-sequence";
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
} from "./queries";
import { sendMail } from "../mail";
import { Liquid } from "liquidjs";
import { Worker } from "bullmq";
import redis from "../redis";
import mongoose from "mongoose";
import sequenceQueue from "./sequence-queue";
import EmailDelivery from "./model/email-delivery";
import { AdminSequence, InternalUser } from "@courselit/common-logic";
import { Email as EmailType, renderEmailToHtml } from "@courselit/email-editor";
import { getUnsubLink } from "../utils/get-unsub-link";
import { getSiteUrl } from "../utils/get-site-url";
import { jwtUtils } from "@courselit/utils";
import { JSDOM } from "jsdom";
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
    if (!process.env.PIXEL_SIGNING_SECRET) {
        throw new Error(
            "PIXEL_SIGNING_SECRET environment variable is not defined",
        );
    }
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
    sequence: AdminSequence,
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
    creator: InternalUser;
    user: InternalUser;
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
    const unsubscribeLink = getUnsubLink(domain, user.unsubscribeToken);
    const templatePayload = {
        subscriber: {
            email: user.email,
            name: user.name,
            tags: user.tags,
        },
        address: domain.settings.mailingAddress,
        unsubscribe_link: unsubscribeLink,
    };
    if (!email.content) {
        return;
    }
    // const content = email.content;
    const pixelPayload = {
        userId: user.userId,
        sequenceId: ongoingSequence.sequenceId,
        emailId: email.emailId,
    };
    const pixelToken = jwtUtils.generateToken(
        pixelPayload,
        process.env.PIXEL_SIGNING_SECRET,
        "365d",
    );
    const pixelUrl = `${getSiteUrl(domain)}/api/track/open?d=${pixelToken}`;
    const emailContentWithPixel: EmailType = {
        content: [
            ...email.content.content,
            {
                blockType: "image",
                settings: {
                    src: pixelUrl,
                    width: "1px",
                    height: "1px",
                    alt: "CourseLit Pixel",
                },
            },
        ],
        style: email.content.style,
        meta: email.content.meta,
    };

    const content = await liquidEngine.parseAndRender(
        await renderEmailToHtml({
            email: emailContentWithPixel,
        }),
        templatePayload,
    );

    const contentWithTrackedLinks = transformLinksForClickTracking(
        content,
        user.userId,
        ongoingSequence.sequenceId,
        email.emailId,
        domain,
    );

    try {
        await sendMail({
            from,
            to,
            subject,
            html: contentWithTrackedLinks,
        });
        // @ts-ignore - Mongoose type compatibility issue
        await EmailDelivery.create({
            domain: (domain as any).id,
            sequenceId: sequence.sequenceId,
            userId: user.userId,
            emailId: email.emailId,
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

function transformLinksForClickTracking(
    htmlContent: string,
    userId: string,
    sequenceId: string,
    emailId: string,
    domain: Domain,
): string {
    try {
        const dom = new JSDOM(htmlContent);
        const document = dom.window.document;

        const links = document.querySelectorAll("a");

        links.forEach((link, index) => {
            const originalUrl = link.getAttribute("href");

            if (!originalUrl) return;

            if (
                originalUrl.includes("/api/track") ||
                originalUrl.includes("/api/unsubscribe") ||
                originalUrl.startsWith("mailto:") ||
                originalUrl.startsWith("tel:") ||
                originalUrl.startsWith("#")
            ) {
                return;
            }

            const linkPayload = {
                userId,
                sequenceId,
                emailId,
                index,
                link: encodeURIComponent(originalUrl),
            };

            const linkToken = jwtUtils.generateToken(
                linkPayload,
                process.env.PIXEL_SIGNING_SECRET,
                "365d",
            );
            const trackingUrl = `${getSiteUrl(domain)}/api/track/click?d=${linkToken}`;

            link.setAttribute("href", trackingUrl);
        });

        return dom.serialize();
    } catch (error) {
        logger.error("Error transforming links with jsdom:", error);
        return htmlContent;
    }
}
