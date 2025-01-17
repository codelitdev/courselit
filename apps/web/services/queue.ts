import { NotificationEntityAction } from "@courselit/common-models";
import { jwtUtils } from "@courselit/utils";
import { error } from "./logger";
import nodemailer from "nodemailer";
import { responses } from "@/config/strings";
import NotificationModel from "@models/Notification";
import { ObjectId } from "mongodb";

const queueServer = process.env.QUEUE_SERVER || "http://localhost:4000";

function getJwtSecret(): string {
    const jwtSecret = process.env.COURSELIT_JWT_SECRET;
    if (!jwtSecret) {
        throw new Error("COURSELIT_JWT_SECRET is not defined");
    }
    return jwtSecret;
}

const mailHost = process.env.EMAIL_HOST;
const mailUser = process.env.EMAIL_USER;
const mailPass = process.env.EMAIL_PASS;
const mailPort = process.env.EMAIL_PORT ? +process.env.EMAIL_PORT : 587;

let transporter: any;
interface MailProps {
    to: string[];
    subject: string;
    body: string;
    from: string;
}
if (mailHost && mailUser && mailPass && mailPort) {
    transporter = nodemailer.createTransport({
        host: mailHost,
        port: mailPort,
        auth: {
            user: mailUser,
            pass: mailPass,
        },
    });
} else {
    transporter = {
        sendMail: async function ({
            to,
            from,
            subject,
            html,
        }: Pick<MailProps, "to" | "subject" | "from"> & { html?: string }) {
            console.log("Mail:", to, from, subject, html); // eslint-disable-line no-console
        },
    };
}

export async function addMailJob({ to, from, subject, body }: MailProps) {
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

        let atLeastOneSuccessfulSend = false;
        for (const recipient of to) {
            try {
                await transporter.sendMail({
                    from,
                    to: recipient,
                    subject,
                    html: body,
                });
                atLeastOneSuccessfulSend = true;
            } catch (err: any) {
                error(`Error sending mail locally: ${err.message}`, {
                    stack: err.stack,
                });
            }
        }

        if (!atLeastOneSuccessfulSend) {
            throw new Error(responses.email_delivery_failed_for_all_recipients);
        }
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

        try {
            for (const forUserId of forUserIds) {
                await NotificationModel.create({
                    domain: new ObjectId(domain),
                    userId,
                    forUserId,
                    entityAction,
                    entityId,
                    entityTargetId,
                });
            }
        } catch (err) {
            error(`Error adding notification locally: ${err.message}`, {
                stack: err.stack,
            });
        }
    }
}
