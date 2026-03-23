import { logs } from "@opentelemetry/api-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { NodeSDK } from "@opentelemetry/sdk-node";

const SERVICE_NAME = "courselit:queue";
const LOGS_PATH = "/i/v1/logs";

let sdk: NodeSDK | null = null;
let initialized = false;
const logger = logs.getLogger(SERVICE_NAME);

export async function initPosthogLogs() {
    if (initialized) {
        return;
    }

    const token = process.env.POSTHOG_API_KEY;
    if (!token) {
        initialized = true;
        return;
    }

    const baseHost = (process.env.POSTHOG_HOST || "https://us.i.posthog.com")
        .replace(/\/+$/, "")
        .trim();
    const url = `${baseHost}${LOGS_PATH}`;

    sdk = new NodeSDK({
        resource: resourceFromAttributes({
            "service.name": SERVICE_NAME,
            "deployment.environment": process.env.DEPLOY_ENV || "unknown",
        }),
        logRecordProcessor: new BatchLogRecordProcessor(
            new OTLPLogExporter({
                url,
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }),
        ),
    });

    await Promise.resolve(sdk.start());
    initialized = true;
}

export function logInfo(
    body: string,
    attributes: Record<string, unknown> = {},
) {
    if (!sdk) {
        return;
    }

    try {
        logger.emit({
            severityText: "info",
            body,
            attributes: sanitizeAttributes(attributes),
        });
    } catch {
        // swallow logging failures; queue processing must continue
    }
}

function sanitizeAttributes(attributes: Record<string, unknown>) {
    const sanitized: Record<string, string | number | boolean> = {};

    for (const [key, value] of Object.entries(attributes)) {
        if (
            typeof value === "string" ||
            typeof value === "number" ||
            typeof value === "boolean"
        ) {
            sanitized[key] = value;
        }
    }

    return sanitized;
}
