import type { Instrumentation } from "next";
import type { Observability } from "@codelitdev/observability";

let observability: Promise<Observability | null> | null = null;

/** Server-side capture, created on first error. Off without `POSTHOG_API_KEY`. */
function serverObservability() {
  observability ??= (async () => {
    const apiKey = process.env.POSTHOG_API_KEY?.trim();
    if (!apiKey || process.env.NEXT_RUNTIME !== "nodejs") return null;
    const { createObservability } = await import("@codelitdev/observability");
    return createObservability({
      serviceName: "courselit-admin",
      environment: process.env.DEPLOY_ENV || process.env.NODE_ENV || "unknown",
      posthog: {
        apiKey,
        host: process.env.POSTHOG_HOST?.trim() || "https://us.i.posthog.com",
      },
      contextPolicy: {
        propertyAllowlist: new Set(["path", "method", "route", "kind", "digest"]),
      },
    });
  })().catch(() => null);
  return observability;
}

/** Server Component, route handler, server action and proxy errors. */
export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  const obs = await serverObservability();
  obs?.captureException({
    error,
    source: `next.${context.routeType}`,
    context: {
      path: request.path.split("?")[0],
      method: request.method,
      route: context.routePath,
      kind: context.routeType,
      digest:
        typeof error === "object" && error !== null && "digest" in error
          ? String((error as { digest: unknown }).digest)
          : undefined,
    },
  });
};
