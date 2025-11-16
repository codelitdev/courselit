import type { MailJob } from "./model/mail-job";
import type { ZapierJob } from "./model/zapier-job";
import notificationQueue from "./notification-queue";
import mailQueue from "./queue";
import zapierQueue from "./zapier-queue";

export async function addMailJob({ to, subject, body, from }: MailJob) {
    for (const recipient of to) {
        await mailQueue.add("mail", {
            to: recipient,
            subject,
            body,
            from,
        });
    }
}

export async function addNotificationJob(notification) {
    await notificationQueue.add("notification", notification);
}

export async function addZapierJob(job: ZapierJob) {
    await zapierQueue.add("zapier", job);
}
