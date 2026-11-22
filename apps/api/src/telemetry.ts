import {
  type CaptureClient,
  createObservability,
  type Observability,
} from "@codelitdev/observability";
import {
  TELEMETRY_IDENTIFIER_KEYS,
  TELEMETRY_PROPERTY_ALLOWLIST,
} from "./permissions.js";

const DEFAULT_POSTHOG_HOST = "https://us.i.posthog.com";
const POSTHOG_LOGS_PATH = "/i/v1/logs";

/**
 * Builds the process's observability from settings (as SendLit does).
 * Structured logs always go to stdout. With `POSTHOG_API_KEY` set, errors are
 * captured to PostHog and every log line is also shipped to PostHog's OTLP
 * logs endpoint, unless `OTLP_LOGS_ENDPOINT` names another one. Without it,
 * capture calls are no-ops.
 *
 * `purpose: "events"` builds the product analytics instance. The package
 * dedupes and rate-caps captures per source, which suits errors but would
 * drop events in a burst (a launch day of purchases), so the events instance
 * turns both off and ships no logs.
 */
export function createCourseLitObservability(
  serviceName: string,
  env: NodeJS.ProcessEnv = process.env,
  options: { client?: CaptureClient; purpose?: "errors" | "events" } = {},
): Observability {
  const forEvents = options.purpose === "events";
  const apiKey = env.POSTHOG_API_KEY?.trim();
  const host = (env.POSTHOG_HOST?.trim() || DEFAULT_POSTHOG_HOST).replace(/\/+$/, "");
  const otlpEndpoint = env.OTLP_LOGS_ENDPOINT?.trim();
  const otlp = forEvents
    ? null
    : otlpEndpoint
      ? {
          endpoint: otlpEndpoint,
          ...(env.OTLP_LOGS_AUTHORIZATION
            ? { headers: { authorization: env.OTLP_LOGS_AUTHORIZATION } }
            : {}),
        }
      : apiKey
        ? {
            endpoint: `${host}${POSTHOG_LOGS_PATH}`,
            headers: { authorization: `Bearer ${apiKey}` },
          }
        : null;
  return createObservability({
    serviceName,
    environment: env.DEPLOY_ENV || env.NODE_ENV || "development",
    ...(apiKey ? { posthog: { apiKey, host, client: options.client } } : {}),
    logs: {
      level: env.LOG_LEVEL || "info",
      ...(otlp ? { otlp } : {}),
    },
    contextPolicy: {
      propertyAllowlist: TELEMETRY_PROPERTY_ALLOWLIST,
      identifierKeys: TELEMETRY_IDENTIFIER_KEYS,
    },
    ...(forEvents
      ? { dedupeTtlMs: 0, dedupeMaxKeys: 1, perSourceCap: Number.POSITIVE_INFINITY }
      : {}),
  });
}

export type TelemetrySink = Pick<
  Observability,
  "captureEvent" | "identifyGroup" | "captureException"
>;

let sink: TelemetrySink | null = null;

/**
 * The process registers its observability once at start (the API and the
 * worker), so code deep in a call chain can report errors and product events
 * without passing it through every function. Tests set a fake or leave it
 * unset, which sends nothing.
 */
export function setTelemetrySink(next: TelemetrySink | null) {
  sink = next;
}

/** Errors from the errors instance; product events and groups from the events one. */
export function telemetrySinkFrom(
  errors: Pick<Observability, "captureException">,
  events: Pick<Observability, "captureEvent" | "identifyGroup">,
): TelemetrySink {
  return {
    captureException: (input) => errors.captureException(input),
    captureEvent: (input) => events.captureEvent(input),
    identifyGroup: (input) => events.identifyGroup(input),
  };
}

export function telemetrySink(): TelemetrySink | null {
  return sink;
}

/**
 * Reports an error that is handled (logged and swallowed) rather than thrown
 * to a request, so it still reaches error tracking. Never throws.
 */
export function reportError(
  error: unknown,
  source: string,
  context?: Record<string, unknown>,
) {
  try {
    sink?.captureException({ error, source, ...(context ? { context } : {}) });
  } catch {
    // Telemetry must never fail the caller.
  }
}
