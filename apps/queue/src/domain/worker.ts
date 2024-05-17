import { Worker } from "bullmq";
import nodemailer from "nodemailer";
import redis from "../redis";
import { logger } from "../logger";

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: +(process.env.EMAIL_PORT || 587),
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

const worker = new Worker(
    "mail",
    async (job) => {
        const { to, from, subject, body } = job.data;

        try {
            await transporter.sendMail({
                from,
                to,
                subject,
                html: body,
            });
        } catch (err: any) {
            logger.error(err);
        }
    },
    { connection: redis },
);

export default worker;
