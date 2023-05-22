import nodemailer from "nodemailer";
import constants from "../config/constants";
import { error } from "./logger";
const { mailHost, mailUser, mailPass, mailFrom, mailPort } = constants;

interface MailProps {
    to: string;
    subject: string;
    body: string;
    from?: string;
    bcc?: string;
}

export const send = async ({
    to,
    subject,
    body,
    from = mailFrom,
    bcc,
}: MailProps) => {
    const transporter = nodemailer.createTransport({
        host: mailHost,
        port: mailPort,
        auth: {
            user: mailUser,
            pass: mailPass,
        },
    });

    try {
        await transporter.sendMail({
            from,
            to,
            subject,
            html: body,
            bcc,
        });
    } catch (err: any) {
        error(err.message, {
            fileName: "services/mail.ts",
            stack: err.stack,
        });
        throw err;
    }
};
