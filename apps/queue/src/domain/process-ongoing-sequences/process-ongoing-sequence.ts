import { repositories } from "@courselit/orm-models";
import { Email, OngoingSequence } from "@courselit/common-models";
import { sequenceBounceLimit } from "@/constants";
import {
    deleteOngoingSequence,
    getSequence,
    getUser,
    removeRuleForBroadcast,
    updateSequenceSentAt,
    getDomain,
} from "@/domain/queries";
import { sendMail } from "@/mail";
import mongoose from "mongoose";
import { AdminSequence, InternalUser } from "@courselit/common-logic";
import { Email as EmailType, renderEmailToHtml } from "@courselit/email-editor";
import { getUnsubLink } from "@/utils/get-unsub-link";
import { getSiteUrl } from "@/utils/get-site-url";
import { jwtUtils } from "@courselit/utils";
import { JSDOM } from "jsdom";
import { DomainDocument } from "@/domain/model/domain";
import { Liquid } from "liquidjs";
import { logger } from "@/logger";
const liquidEngine = new Liquid();

export async function processOngoingSequence(
    ongoingSequenceId: mongoose.Types.ObjectId,
) {
    const ongoingSequence = await repositories.ongoingSequence.findById(
        ongoingSequenceId.toString(),
    );
    if (!ongoingSequence) {
        return;
    }

    // @ts-ignore - Domain in repo is string, but getDomain expects ObjectId. We should update getDomain to take string too?
    // queries.ts expects ObjectId.
    const domain = await getDomain(
        new mongoose.Types.ObjectId(ongoingSequence.domain),
    );
    if (
        !domain ||
        !domain.quota ||
        !domain.quota.mail ||
        !domain.settings?.mailingAddress
    ) {
        console.log(
            `Invalid domain settings for "${domain?.name || "unknown"}"`,
            domain,
        ); // eslint-disable-line no-console
        return;
    }
    if (
        domain.quota.mail.dailyCount >= domain.quota.mail.daily ||
        domain.quota.mail.monthlyCount >= domain.quota.mail.monthly
    ) {
        console.log(`Domain quota exceeded for "${domain.name}"`); // eslint-disable-line no-console
        return;
    }

    const sequence = await getSequence(
        ongoingSequence.sequenceId,
        ongoingSequence.domain!,
    );

    const [user, creator] = await Promise.all([
        getUser(ongoingSequence.userId, ongoingSequence.domain!),
        sequence
            ? getUser(sequence.creatorId, sequence.domain.toString())
            : null,
    ]);

    if (!sequence || !user || !creator) {
        return await cleanUpResources(ongoingSequence);
    }

    // Convert repo object back to mutable "Document"-like object if subsequent code relies on .save()?
    // OR update logic to use repo.update().
    // The existing code does: ongoingSequence.nextEmailScheduledTime = ...; ongoingSequence.save();
    // Repositories return POJOs (Entities). They don't have .save().
    // So "ongoingSequence" here is a POJO.
    // I need to use repositories.ongoingSequence.update(id, { ... }) to save changes.

    const nextPublishedEmail = getNextPublishedEmail(
        sequence,
        ongoingSequence as unknown as OngoingSequence,
    );

    await attemptMailSending({
        domain,
        creator,
        user,
        sequence,
        ongoingSequence: ongoingSequence as unknown as OngoingSequence,
        email: nextPublishedEmail,
    });

    // Update sentEmailIds
    // We need to re-fetch or keep state? ongoingSequence POJO is in memory.
    const updatedSentEmailIds = [
        ...(ongoingSequence.sentEmailIds || []),
        nextPublishedEmail.emailId,
    ];

    await domain.incrementEmailCount();

    // Pass the updated object (in memory) to getNextPublishedEmail
    // Creating a mutated copy for logic calculation
    const ongoingSequenceForNextCalc = {
        ...ongoingSequence,
        sentEmailIds: updatedSentEmailIds,
    } as unknown as OngoingSequence;

    const nextEmail = getNextPublishedEmail(
        sequence,
        ongoingSequenceForNextCalc,
    );

    if (!nextEmail) {
        // We pass the ID to cleanup
        await cleanUpResources(ongoingSequence, true);
    } else {
        const nextTime = new Date(
            (ongoingSequence.nextEmailScheduledTime || Date.now()) +
                nextEmail.delayInMillis,
        ).getTime();

        await repositories.ongoingSequence.update(ongoingSequence.id!, {
            sentEmailIds: updatedSentEmailIds,
            nextEmailScheduledTime: nextTime,
        });
    }
}

export function getNextPublishedEmail(
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
    ongoingSequence: any, // Typed as POJO from repo
    completed?: boolean,
) {
    await deleteOngoingSequence(ongoingSequence.id); // deleteOngoingSequence now takes ID
    if (completed) {
        await updateSequenceReports(
            ongoingSequence.sequenceId,
            ongoingSequence.domain,
        );
    }
}

async function updateSequenceReports(sequenceId: string, domainId: string) {
    const remainingOngoingSequencesWithSameSequenceId =
        await repositories.ongoingSequence.findBySequenceId(sequenceId);

    if (remainingOngoingSequencesWithSameSequenceId.length === 0) {
        const sequence = await getSequence(sequenceId, domainId);
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
    domain: DomainDocument;
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

        await repositories.emailDelivery.create({
            domain: (domain as any).id, // domain here is DomainDocument? ID access?
            sequenceId: sequence.sequenceId,
            userId: user.userId,
            emailId: email.emailId,
        });
    } catch (err: any) {
        // ongoingSequence here is POJO.
        const newRetryCount = (ongoingSequence.retryCount || 0) + 1;

        if (newRetryCount >= sequenceBounceLimit) {
            await repositories.sequence.addFailedReport(
                sequence.sequenceId,
                ongoingSequence.userId,
            );
            await repositories.ongoingSequence.delete(ongoingSequence.id!);
        } else {
            await repositories.ongoingSequence.update(ongoingSequence.id!, {
                retryCount: newRetryCount,
            });
        }
        throw err;
    }
}

function transformLinksForClickTracking(
    htmlContent: string,
    userId: string,
    sequenceId: string,
    emailId: string,
    domain: DomainDocument,
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
