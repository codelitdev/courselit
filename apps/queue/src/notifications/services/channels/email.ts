import { getNotificationEmailContent } from "@courselit/common-logic";
import { renderEmailToHtml } from "@courselit/email-editor";
import { getEmailFrom } from "@courselit/utils";
import { addMailJob } from "../../../domain/handler";
import { getSiteUrl } from "../../../utils/get-site-url";
import { getUnsubLink } from "../../../utils/get-unsub-link";
import { ChannelPayload, NotificationChannel } from "./types";
import { getDomainId } from "../../../observability/posthog";
import { buildNotificationEmailTemplate } from "./notification-email-template";
import UserModel from "../../../domain/model/user";

function getActorAvatarUrl(actor: ChannelPayload["actor"]) {
    return actor?.avatar?.file || actor?.avatar?.thumbnail || undefined;
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
        const notificationDetails = await getNotificationEmailContent({
            activityType: payload.activityType,
            entityId: payload.entityId,
            actorName,
            recipientUserId: payload.recipient.userId,
            recipientPermissions: payload.recipient.permissions || [],
            entityTargetId: payload.entityTargetId,
            metadata: payload.metadata,
            hrefPrefix: getSiteUrl(payload.domain),
            domainId: payload.domain?._id,
            resolveUserName: async (userId) => {
                const user = await (UserModel as any)
                    .findOne(
                        { domain: payload.domain?._id, userId },
                        { _id: 0, name: 1 },
                    )
                    .lean();

                return user?.name as string | undefined;
            },
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
                commentText: notificationDetails.commentText,
                parentText: notificationDetails.parentText,
                parentAuthorName: notificationDetails.parentAuthorName,
                parentLabel: notificationDetails.parentLabel,
                threadTitle: notificationDetails.threadTitle,
                conversationLabel: notificationDetails.conversationLabel,
                isConversation: Boolean(notificationDetails.replyContext),
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
            subject: notificationDetails.subject,
            body,
            headers: {
                "List-Unsubscribe": `<${unsubscribeUrl}>`,
                "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            },
        });
    }
}
