import type { Express } from "express";
import { PostHog, setupExpressErrorHandler } from "posthog-node";

type Severity = "error" | "warning" | "critical";

interface CaptureErrorInput {
    error: unknown;
    source: string;
    domainId?: unknown;
    severity?: Severity;
    context?: Record<string, unknown>;
}

interface CaptureEventInput {
    event: string;
    source: string;
    domainId?: unknown;
    properties?: Record<string, unknown>;
}

const SYSTEM_DOMAIN_ID = "system";
const SERVICE = "courselit:queue";
const DEDUPE_TTL_MS = 60_000;
const DEDUPE_MAX_KEYS = 10_000;
const DEFAULT_PER_SOURCE_CAP = 100;
const MAX_MESSAGE_LENGTH = 500;
const MAX_STACK_TOP_LENGTH = 300;
const MAX_CONTEXT_STRING_LENGTH = 500;
const CONTEXT_ALLOWLIST = new Set([
    "sequence_id",
    "course_id",
    "user_id",
    "job_id",
    "queue_name",
    "activity_type",
    "path",
    "method",
    "error_code",
    "response_code",
    "command",
    "ongoing_sequence_id",
    "route",
    "worker_name",
]);

const perSourceCap = getPerSourceCap();
const environment = process.env.DEPLOY_ENV || "unknown";
const dedupeFingerprintExpiry = new Map<string, number>();
const sourceRateWindow = new Map<string, { minute: number; count: number }>();

const client = process.env.POSTHOG_API_KEY
    ? new PostHog(process.env.POSTHOG_API_KEY, {
          host: process.env.POSTHOG_HOST || "https://us.i.posthog.com",
          enableExceptionAutocapture: true,
      })
    : null;

export function isPosthogEnabled() {
    return Boolean(client);
}

export function setupPosthogExpressErrorHandler(app: Express) {
    if (!client) {
        return;
    }

    setupExpressErrorHandler(client, app);
}

export function getDomainId(domainId?: unknown) {
    if (domainId === null || domainId === undefined) {
        return SYSTEM_DOMAIN_ID;
    }

    const normalized = String(domainId).trim();
    return normalized || SYSTEM_DOMAIN_ID;
}

export function captureError({
    error,
    source,
    domainId,
    severity = "error",
    context = {},
}: CaptureErrorInput) {
    if (!client) {
        return;
    }

    try {
        const { name, message, stackTop, normalizedError } =
            getErrorParts(error);
        const safeDomainId = getDomainId(domainId);
        const fingerprint = `${source}|${name}|${stackTop}`;
        if (shouldDedupe(fingerprint)) {
            return;
        }

        if (isSourceRateLimited(source)) {
            return;
        }

        client.captureException(normalizedError, safeDomainId, {
            service: SERVICE,
            environment,
            source,
            domain_id: safeDomainId,
            severity,
            error_name: name,
            error_message: message,
            error_stack_top: stackTop,
            ...sanitizeContext(context),
        });
    } catch {
        // swallow capture pipeline errors; queue processing must not fail because of telemetry
    }
}

export function captureEvent({
    event,
    source,
    domainId,
    properties = {},
}: CaptureEventInput) {
    if (!client) {
        return;
    }

    try {
        const safeDomainId = getDomainId(domainId);
        client.capture({
            event,
            distinctId: safeDomainId,
            properties: {
                service: SERVICE,
                environment,
                source,
                domain_id: safeDomainId,
                ...sanitizeContext(properties),
            },
        });
    } catch {
        // swallow capture pipeline errors; queue processing must not fail because of telemetry
    }
}

function shouldDedupe(fingerprint: string) {
    const now = Date.now();
    const expiry = dedupeFingerprintExpiry.get(fingerprint);
    if (expiry && expiry > now) {
        return true;
    }

    if (dedupeFingerprintExpiry.size >= DEDUPE_MAX_KEYS) {
        dedupeFingerprintExpiry.clear();
    }

    dedupeFingerprintExpiry.set(fingerprint, now + DEDUPE_TTL_MS);
    return false;
}

function isSourceRateLimited(source: string) {
    const minute = Math.floor(Date.now() / 60_000);
    const current = sourceRateWindow.get(source);

    if (!current || current.minute !== minute) {
        sourceRateWindow.set(source, { minute, count: 1 });
        return false;
    }

    if (current.count >= perSourceCap) {
        return true;
    }

    current.count += 1;
    return false;
}

function getPerSourceCap() {
    const configured = Number.parseInt(
        process.env.POSTHOG_ERROR_CAP_PER_SOURCE_PER_MINUTE || "",
        10,
    );

    if (!Number.isFinite(configured) || configured <= 0) {
        return DEFAULT_PER_SOURCE_CAP;
    }

    return configured;
}

function getErrorParts(error: unknown) {
    if (error instanceof Error) {
        const stackTop = sanitizeErrorText(extractStackTop(error.stack || ""));
        return {
            name: error.name || "Error",
            message: sanitizeErrorText(error.message, MAX_MESSAGE_LENGTH),
            stackTop,
            normalizedError: error,
        };
    }

    const fallbackMessage =
        typeof error === "string" ? error : "Unknown error thrown";
    const normalizedError = new Error(fallbackMessage);

    return {
        name: "Error",
        message: sanitizeErrorText(fallbackMessage, MAX_MESSAGE_LENGTH),
        stackTop: "",
        normalizedError,
    };
}

function extractStackTop(stack: string) {
    const [, firstFrame = ""] = stack.split("\n");
    return firstFrame.trim();
}

function sanitizeContext(context: Record<string, unknown>) {
    const sanitized: Record<string, string | number | boolean> = {};

    for (const [key, value] of Object.entries(context)) {
        if (!CONTEXT_ALLOWLIST.has(key)) {
            continue;
        }

        if (
            typeof value === "number" ||
            typeof value === "boolean" ||
            typeof value === "string"
        ) {
            sanitized[key] =
                typeof value === "string"
                    ? sanitizeErrorText(value, MAX_CONTEXT_STRING_LENGTH)
                    : value;
            continue;
        }

        if (value === null || value === undefined) {
            continue;
        }

        sanitized[key] = sanitizeErrorText(
            String(value),
            MAX_CONTEXT_STRING_LENGTH,
        );
    }

    return sanitized;
}

function sanitizeErrorText(input: string, limit = MAX_STACK_TOP_LENGTH) {
    const maskedTokens = input
        .replace(
            /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
            "[redacted-email]",
        )
        .replace(/\b[A-Za-z0-9_-]{24,}\b/g, "[redacted-token]");

    if (maskedTokens.length <= limit) {
        return maskedTokens;
    }

    return `${maskedTokens.slice(0, limit)}...`;
}
