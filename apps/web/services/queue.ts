import { NotificationEntityAction } from "@courselit/common-models";
import { jwtUtils } from "@courselit/utils";
import { error } from "./logger";

const queueServer = process.env.QUEUE_SERVER || "http://localhost:4000";

function getJwtSecret(): string {
    const jwtSecret = process.env.COURSELIT_JWT_SECRET;
    if (!jwtSecret) {
        throw new Error("COURSELIT_JWT_SECRET is not defined");
    }
    return jwtSecret;
}

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
    try {
        const jwtSecret = getJwtSecret();
        const token = jwtUtils.generateToken({ service: "app" }, jwtSecret);
        const response = await fetch(`${queueServer}/job/mail`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                Authorization: `Bearer ${token}`,
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
    } catch (err) {
        error(`Error adding mail job: ${err.message}`, {
            to,
            from,
            subject,
            body,
        });
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
    try {
        const jwtSecret = getJwtSecret();
        const token = jwtUtils.generateToken(
            {
                service: "app",
                user: {
                    domain,
                    userId,
                },
            },
            jwtSecret,
        );
        const response = await fetch(`${queueServer}/job/notification`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
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
    } catch (err) {
        error(`Error adding notification job: ${err.message}`, {
            domain,
            entityId,
            entityAction,
            forUserIds,
            userId,
            entityTargetId,
        });
    }
}
