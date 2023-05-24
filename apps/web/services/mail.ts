import nodemailer from "nodemailer";
import constants from "../config/constants";
import { responses } from "../config/strings";
import { error } from "./logger";
import { addMailJob } from "./queue";

const { mailHost, mailUser, mailPass, mailFrom, mailPort } = constants;
const transporter = nodemailer.createTransport({
    host: mailHost,
    port: mailPort,
    auth: {
        user: mailUser,
        pass: mailPass,
    },
});

interface MailProps {
    to: string[];
    subject: string;
    body: string;
    from?: string;
}

export const send = async ({
    to,
    subject,
    body,
    from = mailFrom,
}: MailProps) => {
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
