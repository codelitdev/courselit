import nodemailer from "nodemailer";
import constants from "../config/constants";
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
    try {
        if (process.env.QUEUE_SERVER) {
            await addMailJob({
                from,
                to,
                subject,
                body,
            });
        } else {
            await transporter.sendMail({
                from,
                to,
                subject,
                html: body,
            });
        }
    } catch (err: any) {
        error(err.message, {
            fileName: "services/mail.ts",
            stack: err.stack,
        });
        throw err;
    }
};
