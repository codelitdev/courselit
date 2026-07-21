import { timingSafeEqual } from "node:crypto";
import { InboundEmailError } from "./errors";

const SIMPLE_EMAIL_ADDRESS = /^[^\s<>@,]+@[^\s<>@,]+$/;
const textEncoder = new TextEncoder();

export function timingSafeEqualStrings(left: string, right: string): boolean {
    const leftBytes = textEncoder.encode(left);
    const rightBytes = textEncoder.encode(right);

    return (
        leftBytes.length === rightBytes.length &&
        timingSafeEqual(leftBytes, rightBytes)
    );
}

export function parseEmailAddress(value: unknown): string | undefined {
    if (typeof value !== "string") {
        return undefined;
    }

    const candidate = value.match(/<([^<>]+)>/)?.[1]?.trim() || value.trim();
    const separator = candidate.lastIndexOf("@");
    if (separator <= 0 || separator === candidate.length - 1) {
        return undefined;
    }

    // The domain is case-insensitive, while the Reply-To local-part embeds a
    // base64url token whose uppercase characters are significant.
    const email = `${candidate.slice(0, separator)}@${candidate
        .slice(separator + 1)
        .toLowerCase()}`;

    return SIMPLE_EMAIL_ADDRESS.test(email) ? email : undefined;
}

export function parseEmailAddresses(values: unknown[]): string[] {
    return values
        .map(parseEmailAddress)
        .filter((value): value is string => Boolean(value));
}

export function parseJsonBody(rawBody: string): Record<string, unknown> {
    try {
        const value = JSON.parse(rawBody);
        if (!value || typeof value !== "object" || Array.isArray(value)) {
            throw new Error("Expected a JSON object");
        }

        return value as Record<string, unknown>;
    } catch {
        throw new InboundEmailError("invalid", "Invalid JSON webhook body");
    }
}

export async function parseFormBody({
    rawBody,
    contentType,
}: {
    rawBody: string;
    contentType: string;
}): Promise<Record<string, string>> {
    if (contentType.startsWith("application/x-www-form-urlencoded")) {
        return Object.fromEntries(new URLSearchParams(rawBody).entries());
    }

    if (!contentType.startsWith("multipart/form-data")) {
        throw new InboundEmailError(
            "invalid",
            "Expected a form-encoded webhook body",
        );
    }

    try {
        const formData = await new Response(rawBody, {
            headers: { "content-type": contentType },
        }).formData();
        const fields: Record<string, string> = {};

        formData.forEach((value, key) => {
            if (typeof value === "string" && fields[key] === undefined) {
                fields[key] = value;
            }
        });

        return fields;
    } catch {
        throw new InboundEmailError(
            "invalid",
            "Invalid multipart webhook body",
        );
    }
}

export function getString(
    object: Record<string, unknown>,
    key: string,
): string | undefined {
    const value = object[key];
    return typeof value === "string" ? value : undefined;
}

export function parseMessageId(value: unknown): string | undefined {
    if (typeof value !== "string") {
        return undefined;
    }

    const messageId = value.trim().replace(/^<|>$/g, "");
    return messageId || undefined;
}
