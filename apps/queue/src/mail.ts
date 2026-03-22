import { createTransport } from "nodemailer";
import { logInfo } from "./observability/logs";

const transporter = createTransport({
    host: process.env.EMAIL_HOST,
    port: +(process.env.EMAIL_PORT || 587),
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

export async function sendMail({
    from,
    to,
    subject,
    html,
    headers,
}: {
    from: string;
    to: string;
    subject: string;
    html: string;
    headers?: Record<string, string>;
}) {
    const transportMode =
        process.env.NODE_ENV === "production" ? "smtp" : "console";

    if (process.env.NODE_ENV === "production") {
        await transporter.sendMail({ from, to, subject, html, headers });
    } else {
        // eslint-disable-next-line no-console
        console.log("Mail sent", from, to, subject, html, headers, new Date());
    }

    logInfo("Mail sent", {
        source: "mail.send",
        queue_name: "mail",
        transport_mode: transportMode,
        to,
        subject,
    });
}
