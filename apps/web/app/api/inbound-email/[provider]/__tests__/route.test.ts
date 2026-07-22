/**
 * @jest-environment node
 */

import { InboundEmailError } from "@/lib/inbound-email/errors";
import { getInboundEmailAdapter } from "@/lib/inbound-email/providers";
import { confirmSnsSubscription } from "@/lib/inbound-email/providers/ses";
import { processInboundEmail } from "@/lib/inbound-email/process-inbound-email";
import type { InboundEmailProvider } from "@/lib/inbound-email/types";

jest.mock("@/lib/inbound-email/providers", () => ({
    getInboundEmailAdapter: jest.fn(),
}));
jest.mock("@/lib/inbound-email/providers/ses", () => ({
    confirmSnsSubscription: jest.fn(),
}));
jest.mock("@/lib/inbound-email/process-inbound-email", () => ({
    processInboundEmail: jest.fn(),
}));
jest.mock("@/services/logger", () => ({
    error: jest.fn(),
    info: jest.fn(),
}));

const adapter = {
    provider: "postmark" as InboundEmailProvider,
    verify: jest.fn(),
    parse: jest.fn(),
};

function request(body = "{}") {
    return new Request("https://courselit.example/api/inbound-email/postmark", {
        method: "POST",
        headers: {
            "content-type": "application/json",
            authorization: "Basic dGVzdDp0ZXN0",
        },
        body,
    });
}

function context(provider = "postmark") {
    return { params: Promise.resolve({ provider }) };
}

describe("POST /api/inbound-email/[provider]", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (getInboundEmailAdapter as jest.Mock).mockReturnValue(adapter);
        adapter.verify.mockResolvedValue(undefined);
        adapter.parse.mockResolvedValue({
            kind: "email",
            email: {
                from: "member@example.com",
                to: ["reply+token@replies.example.com"],
                textBody: "Reply",
                messageId: "provider-message-id",
            },
        });
        (processInboundEmail as jest.Mock).mockResolvedValue({ ok: true });
    });

    it("returns 404 for an unsupported provider", async () => {
        (getInboundEmailAdapter as jest.Mock).mockReturnValue(undefined);
        const { POST } = await import("../route");

        const response = await POST(request(), context("unsupported"));

        expect(response.status).toBe(404);
        expect(adapter.verify).not.toHaveBeenCalled();
    });

    it("returns 401 before processing an unauthenticated provider webhook", async () => {
        adapter.verify.mockRejectedValue(
            new InboundEmailError("authentication", "Invalid signature"),
        );
        const { POST } = await import("../route");

        const response = await POST(request(), context());

        expect(response.status).toBe(401);
        expect(processInboundEmail).not.toHaveBeenCalled();
    });

    it("processes an authenticated normalized email and acknowledges it", async () => {
        const { POST } = await import("../route");

        const response = await POST(request('{"event":"inbound"}'), context());

        expect(response.status).toBe(200);
        expect(adapter.verify).toHaveBeenCalledWith(
            expect.objectContaining({ rawBody: '{"event":"inbound"}' }),
        );
        expect(processInboundEmail).toHaveBeenCalledWith({
            provider: "postmark",
            email: {
                from: "member@example.com",
                to: ["reply+token@replies.example.com"],
                textBody: "Reply",
                messageId: "provider-message-id",
            },
        });
    });

    it("acknowledges terminal application rejections without retrying providers", async () => {
        (processInboundEmail as jest.Mock).mockResolvedValue({
            ok: false,
            reason: "sender_mismatch",
        });
        const { POST } = await import("../route");

        const response = await POST(request(), context());

        expect(response.status).toBe(200);
    });

    it("returns a retryable failure for transient provider infrastructure errors", async () => {
        adapter.parse.mockRejectedValue(
            new InboundEmailError("transient", "S3 object unavailable"),
        );
        const { POST } = await import("../route");

        const response = await POST(request(), context());

        expect(response.status).toBe(503);
    });

    it("requests a retry while the same provider message is still processing", async () => {
        (processInboundEmail as jest.Mock).mockResolvedValue({
            ok: false,
            reason: "processing_in_progress",
            retryable: true,
        });
        const { POST } = await import("../route");

        const response = await POST(request(), context());

        expect(response.status).toBe(503);
    });

    it("confirms an authenticated SES subscription before acknowledging it", async () => {
        adapter.provider = "ses";
        adapter.parse.mockResolvedValue({
            kind: "subscription_confirmation",
            subscribeUrl:
                "https://sns.us-east-1.amazonaws.com/?Action=ConfirmSubscription",
        });
        const { POST } = await import("../route");

        const response = await POST(request(), context("ses"));

        expect(response.status).toBe(200);
        expect(confirmSnsSubscription).toHaveBeenCalledWith(
            "https://sns.us-east-1.amazonaws.com/?Action=ConfirmSubscription",
        );
        expect(processInboundEmail).not.toHaveBeenCalled();
    });
});
