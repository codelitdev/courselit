import nodemailer from "nodemailer";
import constants from "../config/constants";
const { mailHost, mailUser, mailPass, mailFrom, mailPort } = constants;

interface MailProps {
    to: string;
    subject: string;
    body: string;
}

export const send = async ({ to, subject, body }: MailProps) => {
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
            from: mailFrom,
            to,
            subject,
            html: body,
        });
    } catch (err) {
        console.error(err); // eslint-disable-line no-console
    }
};
