import { InboundEmailError } from "@/lib/inbound-email/errors";
import { getInboundEmailAdapter } from "@/lib/inbound-email/providers";
import { confirmSnsSubscription } from "@/lib/inbound-email/providers/ses";
import { processInboundEmail } from "@/lib/inbound-email/process-inbound-email";
import { error, info } from "@/services/logger";

export const runtime = "nodejs";

const MAX_INBOUND_WEBHOOK_BYTES = 2 * 1024 * 1024;

function getInboundErrorKind(error: unknown) {
    if (
        error instanceof InboundEmailError ||
        (typeof error === "object" &&
            error !== null &&
            "kind" in error &&
            typeof error.kind === "string")
    ) {
        return error.kind;
    }

    return undefined;
}

function errorStatus(error: unknown, isAuthenticated: boolean) {
    const kind = getInboundErrorKind(error);
    if (!kind) {
        return 500;
    }

    if (kind === "authentication") {
        return 401;
    }
    if (kind === "configuration" || kind === "transient") {
        return 503;
    }

    return isAuthenticated ? 200 : 400;
}

function getProviderFromParams(params: { provider: string }) {
    return params.provider.toLowerCase();
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ provider: string }> },
) {
    const { provider: providerParam } = await params;
    const provider = getProviderFromParams({ provider: providerParam });
    const adapter = getInboundEmailAdapter(provider);
    if (!adapter) {
        return Response.json({ ok: false }, { status: 404 });
    }

    const advertisedSize = Number(request.headers.get("content-length"));
    if (
        Number.isFinite(advertisedSize) &&
        advertisedSize > MAX_INBOUND_WEBHOOK_BYTES
    ) {
        return Response.json({ ok: false }, { status: 413 });
    }

    let isAuthenticated = false;
    try {
        // Provider verification must receive the original body, before JSON or
        // form parsing changes any bytes used by its authentication scheme.
        const rawBody = await request.text();
        if (Buffer.byteLength(rawBody) > MAX_INBOUND_WEBHOOK_BYTES) {
            return Response.json({ ok: false }, { status: 413 });
        }

        const input = {
            rawBody,
            headers: request.headers,
            searchParams: new URL(request.url).searchParams,
            contentType: request.headers.get("content-type") || "",
        };
        await adapter.verify(input);
        isAuthenticated = true;

        const parsed = await adapter.parse(input);
        if (parsed.kind === "subscription_confirmation") {
            if (adapter.provider !== "ses") {
                return Response.json({ ok: false }, { status: 400 });
            }

            await confirmSnsSubscription(parsed.subscribeUrl);
            await info("Inbound SES SNS subscription confirmed", { provider });
            return Response.json({ ok: true });
        }
        if (parsed.kind === "unsubscribe_confirmation") {
            await info("Inbound SES SNS subscription removed", { provider });
            return Response.json({ ok: true });
        }

        const result = await processInboundEmail({
            provider: adapter.provider,
            email: parsed.email,
        });
        if (!result.ok) {
            await info("Inbound email rejected", {
                provider,
                reason: result.reason,
            });
            if (result.retryable) {
                return Response.json({ ok: false }, { status: 503 });
            }
        }

        // A rejection after authentication is terminal (for example, an
        // expired token or a sender mismatch), so providers must not retry it.
        return Response.json({ ok: result.ok });
    } catch (caught) {
        const status = errorStatus(caught, isAuthenticated);
        await error("Inbound email processing failed", {
            provider,
            errorKind: getInboundErrorKind(caught) || "unknown",
        });
        return Response.json({ ok: false }, { status });
    }
}
