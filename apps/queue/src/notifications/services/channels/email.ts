import { getNotificationMessageAndHref } from "@courselit/common-logic";
import { getEmailFrom } from "@courselit/utils";
import { addMailJob } from "../../../domain/handler";
import { getSiteUrl } from "../../../utils/get-site-url";
import { getUnsubLink } from "../../../utils/get-unsub-link";
import { ChannelPayload, NotificationChannel } from "./types";

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
        const notificationDetails = await getNotificationMessageAndHref({
            activityType: payload.activityType,
            entityId: payload.entityId,
            actorName,
            recipientUserId: payload.recipient.userId,
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

        await addMailJob({
            to: [payload.recipient.email],
            from: getEmailFrom({
                name: payload.domain.settings?.title || payload.domain.name,
                email: process.env.EMAIL_FROM || "",
            }),
            subject: notificationDetails.message,
            body: `
                <p>${notificationDetails.message}</p>
                <p><a href="${notificationDetails.href}">View notification</a></p>
                <hr />
                <p>
                    <a href="${unsubscribeUrl}">Unsubscribe from email notifications</a>
                </p>
            `,
            headers: {
                "List-Unsubscribe": `<${unsubscribeUrl}>`,
                "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            },
        });
    }
}
