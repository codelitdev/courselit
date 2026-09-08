/** Request-time PostHog config. Do not use `NEXT_PUBLIC_*` — those freeze at
 * `next build`. Missing `POSTHOG_API_KEY` disables browser telemetry. */
export function getBrowserObservabilityConfig() {
  const apiKey = process.env.POSTHOG_API_KEY?.trim() || null;
  if (!apiKey) {
    return null;
  }

  return {
    apiKey,
    host: process.env.POSTHOG_HOST?.trim() || undefined,
    environment: process.env.DEPLOY_ENV || process.env.NODE_ENV || "unknown",
    serviceName: "courselit-admin",
  };
}
