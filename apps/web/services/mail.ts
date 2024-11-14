import nodemailer from "nodemailer";
import { responses } from "../config/strings";
import { error } from "./logger";
import { addMailJob } from "./queue";

const mailHost = process.env.EMAIL_HOST;
const mailUser = process.env.EMAIL_USER;
const mailPass = process.env.EMAIL_PASS;
const mailPort = process.env.EMAIL_PORT ? +process.env.EMAIL_PORT : 587;

let transporter: any;
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

interface MailProps {
    to: string[];
    subject: string;
    body: string;
    from: string;
}

export const send = async ({ to, subject, body, from }: MailProps) => {
    if (process.env.QUEUE_SERVER) {
        try {
            await addMailJob({
                from,
                to,
                subject,
                body,
            });
        } catch (err: any) {
            error(err.message, {
                fileName: "services/mail.ts",
                stack: err.stack,
            });

            throw new Error(responses.internal_error);
        }
    } else {
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
                error(err.message, {
                    fileName: "services/mail.ts",
                    stack: err.stack,
                });
            }
        }

        if (!atLeastOneSuccessfulSend) {
            throw new Error(responses.email_delivery_failed_for_all_recipients);
        }
    }
};
