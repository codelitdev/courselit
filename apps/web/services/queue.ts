import { NotificationEntityAction } from "@courselit/common-models";

const queueServer = process.env.QUEUE_SERVER || "http://localhost:4000";

export async function addMailJob({
    to,
    from,
    subject,
    body,
}: {
    to: string[];
    from: string;
    subject: string;
    body: string;
}) {
    const response = await fetch(`${queueServer}/job/mail`, {
        method: "POST",
        headers: {
            "content-type": "application/json",
        },
        body: JSON.stringify({
            to,
            from,
            subject,
            body,
        }),
    });
    const jsonResponse = await response.json();

    if (response.status !== 200) {
        throw new Error(jsonResponse.error);
    }
}

export async function addNotification({
    domain,
    entityId,
    entityAction,
    forUserIds,
    userId,
    entityTargetId,
}: {
    domain: string;
    entityId: string;
    entityAction: NotificationEntityAction;
    forUserIds: string[];
    userId: string;
    entityTargetId?: string;
}) {
    const response = await fetch(`${queueServer}/job/notification`, {
        method: "POST",
        headers: {
            "content-type": "application/json",
        },
        body: JSON.stringify({
            domain,
            userId,
            forUserIds,
            entityAction,
            entityId,
            entityTargetId,
        }),
    });
    const jsonResponse = await response.json();

    if (response.status !== 200) {
        throw new Error(jsonResponse.error);
    }
}
