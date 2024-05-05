import type { MailJob } from "./model/mail-job";
import mailQueue from "./queue";

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
