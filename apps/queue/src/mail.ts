import { createTransport } from "nodemailer";

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
}: {
    from: string;
    to: string;
    subject: string;
    html: string;
}) {
    if (process.env.NODE_ENV === "production") {
        await transporter.sendMail({ from, to, subject, html });
    } else {
        // eslint-disable-next-line no-console
        console.log("Mail sent", from, to, subject, html, new Date());
    }
}
