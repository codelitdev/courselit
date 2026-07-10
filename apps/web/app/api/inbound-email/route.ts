import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/inbound-email
 *
 * Receives inbound email webhooks from email providers (SES, Postmark, Mailgun, SendGrid).
 * Proxies the request to the queue service for processing.
 *
 * The queue service (apps/queue) handles all the business logic:
 * - Parsing the provider-specific payload
 * - Verifying reply tokens
 * - Stripping quoted content
 * - Creating replies in the database
 * - Dispatching notifications
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const provider = req.nextUrl.searchParams.get("provider") || undefined;

        const queueUrl = process.env.QUEUE_SERVICE_URL;
        if (!queueUrl) {
            console.warn(
                "QUEUE_SERVICE_URL not set, cannot process inbound email. Set the environment variable to enable reply-by-email.",
            );
            return NextResponse.json(
                {
                    success: false,
                    error: "Inbound email processing not configured",
                },
                { status: 200 },
            );
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(
            `${queueUrl}/inbound-email${provider ? `?provider=${provider}` : ""}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
                signal: controller.signal,
            },
        );

        clearTimeout(timeout);

        const result = await response.json();
        return NextResponse.json(result, { status: 200 });
    } catch (err: any) {
        console.error("Inbound email proxy error:", err);
        return NextResponse.json(
            { success: false, error: "Internal error" },
            { status: 200 },
        );
    }
}
