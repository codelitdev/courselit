import {
    getRicherNotificationContent,
    getNotificationMessageAndHref,
    createReplyToken,
    buildReplyToAddress,
} from "@courselit/common-logic";
import { renderEmailToHtml } from "@courselit/email-editor";
import { getEmailFrom } from "@courselit/utils";
import { addMailJob } from "../../../domain/handler";
import { getSiteUrl } from "../../../utils/get-site-url";
import { getUnsubLink } from "../../../utils/get-unsub-link";
import { ChannelPayload, NotificationChannel } from "./types";
import { getDomainId } from "../../../observability/posthog";
import { buildRicherNotificationEmailTemplate } from "./richer-notification-email-template";
import { buildNotificationEmailTemplate } from "./notification-email-template";
import type { ReplyTokenPayload } from "@courselit/common-models";

function getActorAvatarUrl(actor: ChannelPayload["actor"]) {
    return actor?.avatar?.file || actor?.avatar?.thumbnail || undefined;
}

/**
 * Determines if a given activity type is a "discussion" type that should get
 * richer email content and reply-by-email support.
 */
function isDiscussionActivityType(activityType: string): boolean {
    const discussionTypes = [
        "community_post_created",
        "community_comment_created",
        "community_comment_replied",
        "community_reply_created",
        "course_discussion_comment_created",
        "course_discussion_reacted",
    ];
    return discussionTypes.includes(activityType);
}

/**
 * Builds a ReplyTokenPayload for discussion activity types so that
 * the recipient can reply directly from their email client.
 */
function buildReplyTokenPayload(
    payload: ChannelPayload,
): ReplyTokenPayload | null {
    const { activityType, entityId, entityTargetId, metadata, domain, actorUserId } = payload;

    switch (activityType) {
        case "community_comment_created": {
            const postId = metadata?.postId as string;
            return {
                userId: actorUserId,
                domainId: String(domain?._id),
                entityId: postId || entityId,
                entityType: "community",
                commentId: entityId,
            };
        }
        case "community_reply_created":
        case "community_comment_replied": {
            const commentId = entityTargetId || (metadata?.commentId as string);
            return {
                userId: actorUserId,
                domainId: String(domain?._id),
                entityId: entityId,
                entityType: "community",
                commentId,
                parentReplyId: entityId,
            };
        }
        case "community_post_created": {
            return {
                userId: actorUserId,
                domainId: String(domain?._id),
                entityId: entityId,
                entityType: "community",
            };
        }
        case "course_discussion_comment_created":
        case "course_discussion_reacted": {
            const commentId = metadata?.commentId as string;
            const replyId = metadata?.replyId as string;
            return {
                userId: actorUserId,
                domainId: String(domain?._id),
                entityId: (metadata?.courseId as string) || entityId,
                entityType: "product",
                commentId: commentId || entityId,
                parentReplyId: replyId || undefined,
            };
        }
        default:
            return null;
    }
}

export class EmailChannel implements NotificationChannel {
    async send(payload: ChannelPayload): Promise<void> {
        if (!payload.recipient.email || !payload.recipient.unsubscribeToken) {
            return;
        }

        if (!payload.recipient.subscribedToUpdates) {
            return;
        }

        const actorName =
            payload.actor?.name ||
            payload.actor?.email ||
            payload.actor?.userId ||
            "Someone";

        const isDiscussion = isDiscussionActivityType(payload.activityType);

        if (isDiscussion) {
            await this.sendRicherNotification(payload, actorName);
        } else {
            await this.sendLegacyNotification(payload, actorName);
        }
    }

    private async sendRicherNotification(
        payload: ChannelPayload,
        actorName: string,
    ): Promise<void> {
        const notificationContent = await getRicherNotificationContent({
            activityType: payload.activityType,
            entityId: payload.entityId,
            actorName,
            recipientUserId: payload.recipient.userId,
            recipientPermissions: payload.recipient.permissions || [],
            entityTargetId: payload.entityTargetId,
            metadata: payload.metadata,
            hrefPrefix: getSiteUrl(payload.domain),
            domainId: payload.domain?._id,
        });

        if (!notificationContent.message || !notificationContent.href) {
            return;
        }

        const unsubscribeUrl = getUnsubLink(
            payload.domain,
            payload.recipient.unsubscribeToken,
        );

        // Build reply-to address for discussion-type notifications
        let replyToAddress: string | undefined;
        try {
            const replyTokenPayload = buildReplyTokenPayload(payload);
            if (replyTokenPayload) {
                const token = createReplyToken(replyTokenPayload);
                replyToAddress = buildReplyToAddress(token);
            }
        } catch {
            // If reply token creation fails, still send the notification without reply-to
        }

        const body = await renderEmailToHtml({
            email: buildRicherNotificationEmailTemplate({
                content: notificationContent,
                actorName,
                actorAvatarUrl: getActorAvatarUrl(payload.actor),
                unsubscribeUrl,
                hideCourseLitBranding:
                    payload.domain.settings?.hideCourseLitBranding,
                replyToAddress,
            }),
        });

        const headers: Record<string, string> = {
            "List-Unsubscribe": `<${unsubscribeUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        };

        if (replyToAddress) {
            headers["Reply-To"] = replyToAddress;
        }

        await addMailJob({
            to: [payload.recipient.email],
            from: getEmailFrom({
                name: payload.domain.settings?.title || payload.domain.name,
                email: process.env.EMAIL_FROM || "",
            }),
            domainId: getDomainId(payload.domain?._id),
            subject: notificationContent.subject || notificationContent.message,
            body,
            headers,
        });
    }

    private async sendLegacyNotification(
        payload: ChannelPayload,
        actorName: string,
    ): Promise<void> {
        const notificationDetails = await getNotificationMessageAndHref({
            activityType: payload.activityType,
            entityId: payload.entityId,
            actorName,
            recipientUserId: payload.recipient.userId,
            recipientPermissions: payload.recipient.permissions || [],
            entityTargetId: payload.entityTargetId,
            metadata: payload.metadata,
            hrefPrefix: getSiteUrl(payload.domain),
            domainId: payload.domain?._id,
        });

        if (!notificationDetails.message || !notificationDetails.href) {
            return;
        }

        const unsubscribeUrl = getUnsubLink(
            payload.domain,
            payload.recipient.unsubscribeToken,
        );

        const body = await renderEmailToHtml({
            email: buildNotificationEmailTemplate({
                actorName,
                actorAvatarUrl: getActorAvatarUrl(payload.actor),
                message: notificationDetails.message,
                notificationUrl: notificationDetails.href,
                unsubscribeUrl,
                hideCourseLitBranding:
                    payload.domain.settings?.hideCourseLitBranding,
            }),
        });

        await addMailJob({
            to: [payload.recipient.email],
            from: getEmailFrom({
                name: payload.domain.settings?.title || payload.domain.name,
                email: process.env.EMAIL_FROM || "",
            }),
            domainId: getDomainId(payload.domain?._id),
            subject: notificationDetails.message,
            body,
            headers: {
                "List-Unsubscribe": `<${unsubscribeUrl}>`,
                "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            },
        });
    }
}
