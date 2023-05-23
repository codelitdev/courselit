const queueServer = process.env.QUEUE_SERVER || "http://localhost:4000";

export async function addMailJob({
    to,
    from,
    subject,
    body,
}: {
    to: string[];
    from: string;
    subject: string;
    body: string;
}) {
    const response = await fetch(`${queueServer}/job/mail`, {
        method: "POST",
        headers: {
            "content-type": "application/json",
        },
        body: JSON.stringify({
            to,
            from,
            subject,
            body,
        }),
    });
    const jsonResponse = await response.json();

    if (response.status !== 200) {
        throw new Error(jsonResponse.error);
    }
}
