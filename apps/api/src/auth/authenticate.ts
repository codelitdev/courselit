import { verifyOAuthAccessToken } from "@codelitdev/oauth-server-kit";
import { resolveBetterAuthSession } from "@codelitdev/oauth-server-kit/better-auth";
import {
  type AuthenticationResult,
  type Clock,
  createPlatformError,
  type HeaderMap,
  mapTransportAuthentication,
  selectHttpCredential,
  selectMcpCredential,
} from "@codelitdev/platform";
import type { Observability } from "@codelitdev/observability";
import { fromNodeHeaders } from "better-auth/node";
import type { AppDb } from "../types.js";
import {
  apiKeyDigestMatches,
  isApiKeyExpired,
  loadActiveApiKey,
  parseApiKey,
  touchApiKeyLastUsed,
} from "./api-keys.js";
import { apiKeyFailureLimiterFor, clientKeyFromHeaders } from "./api-key-throttle.js";
import type { AdminAuth } from "./better-auth.js";
import { ADMIN_SESSION_COOKIE_NAME } from "./options.js";

export type AuthRuntime = {
  db: AppDb;
  apiKeyPepper: string;
  auth: AdminAuth;
  clock: Clock;
  observability?: Pick<Observability, "logger">;
};

function toNodeHeaderMap(
  headers: HeaderMap,
): Record<string, string | string[] | undefined> {
  return headers;
}

export async function authenticateHttpRequest(
  headers: HeaderMap,
  deps: AuthRuntime,
): Promise<AuthenticationResult<string>> {
  const selected = selectHttpCredential(headers, {
    sessionCookieName: ADMIN_SESSION_COOKIE_NAME,
  });
  if (selected.kind === "absent") {
    return mapTransportAuthentication({ kind: "absent" }, { transport: "http" });
  }
  // Rejects "ambiguous" and, from @codelitdev/platform 0.1.0, "malformed"
  // (an Authorization header that is not `Bearer <token>`); never falls back.
  if ("error" in selected) {
    return { kind: "rejected", error: selected.error };
  }
  const presented = selected.credential;
  if (presented.kind === "session") {
    const resolved = await resolveBetterAuthSession(
      { auth: deps.auth.auth, issuer: deps.auth.issuer },
      fromNodeHeaders(toNodeHeaderMap(headers)),
    );
    if (resolved.status === "unavailable") {
      return {
        kind: "rejected",
        error: createPlatformError("internal_error"),
      };
    }
    if (resolved.status !== "authenticated" || resolved.identity.method !== "session") {
      return {
        kind: "rejected",
        error: createPlatformError("unauthenticated"),
      };
    }
    return {
      kind: "authenticated",
      principalId: resolved.identity.subject,
      credential: { kind: "session", credentialId: resolved.identity.subject },
    };
  }
  if (presented.kind === "oauth") {
    const resolved = await verifyOAuthAccessToken(
      {
        oauthResourceClient: deps.auth.oauthResourceClient,
        issuer: deps.auth.issuer,
        audiences: [deps.auth.mcpResource, deps.auth.restResource],
      },
      presented.secret,
    );
    if (resolved.status === "unavailable") {
      return {
        kind: "rejected",
        error: createPlatformError("internal_error"),
      };
    }
    if (resolved.status !== "authenticated" || resolved.identity.method !== "oauth") {
      return {
        kind: "rejected",
        error: createPlatformError("unauthenticated"),
      };
    }
    return {
      kind: "authenticated",
      principalId: resolved.identity.subject,
      credential: {
        kind: "oauth",
        credentialId: resolved.identity.clientId,
        scopes: resolved.identity.scopes,
      },
    };
  }
  return verifyApiKey(presented.secret, headers, deps);
}

export async function authenticateMcpRequest(
  headers: HeaderMap,
  deps: AuthRuntime,
): Promise<AuthenticationResult<string>> {
  const selected = selectMcpCredential(headers);
  if (selected.kind === "absent") {
    return mapTransportAuthentication({ kind: "absent" }, { transport: "mcp" });
  }
  // Rejects "ambiguous" and, from @codelitdev/platform 0.1.0, "malformed"
  // (an Authorization header that is not `Bearer <token>`); never falls back.
  if ("error" in selected) {
    return { kind: "rejected", error: selected.error };
  }
  const presented = selected.credential;
  if (presented.kind === "oauth") {
    const resolved = await verifyOAuthAccessToken(
      {
        oauthResourceClient: deps.auth.oauthResourceClient,
        issuer: deps.auth.issuer,
        audiences: [deps.auth.mcpResource, deps.auth.restResource],
      },
      presented.secret,
    );
    if (resolved.status === "unavailable") {
      return {
        kind: "rejected",
        error: createPlatformError("internal_error"),
      };
    }
    if (resolved.status !== "authenticated" || resolved.identity.method !== "oauth") {
      return {
        kind: "rejected",
        error: createPlatformError("unauthenticated"),
      };
    }
    return {
      kind: "authenticated",
      principalId: resolved.identity.subject,
      credential: {
        kind: "oauth",
        credentialId: resolved.identity.clientId,
        scopes: resolved.identity.scopes,
      },
    };
  }
  return verifyApiKey(presented.secret, headers, deps);
}

/**
 * Shared HTTP/MCP API-key verification. Malformed, unknown, revoked, expired
 * and wrong-secret keys, and keys of deleted schools, all produce the same
 * `unauthenticated` error. A key does not depend on its creator's membership. Failed attempts are rate limited
 * per client; raw keys and digests never leave this function.
 */
async function verifyApiKey(
  presented: string,
  headers: HeaderMap,
  deps: AuthRuntime,
): Promise<AuthenticationResult<string>> {
  const limiter = apiKeyFailureLimiterFor(deps, deps.clock);
  const clientKey = clientKeyFromHeaders(
    headers as Record<string, string | string[] | undefined>,
  );
  const retryAfter = limiter.retryAfterSeconds(clientKey);
  if (retryAfter !== null) {
    return {
      kind: "rejected",
      error: createPlatformError("rate_limited", {
        safeDetails: { retryAfterSeconds: retryAfter },
      }),
    };
  }
  const rejected = (): AuthenticationResult<string> => {
    limiter.recordFailure(clientKey);
    return { kind: "rejected", error: createPlatformError("unauthenticated") };
  };
  const parsed = parseApiKey(presented);
  if (!parsed) return rejected();
  const loaded = await loadActiveApiKey(deps.db, { publicId: parsed.publicId });
  const now = deps.clock.now();
  if (
    !loaded ||
    isApiKeyExpired(loaded.key.expiresAt, now) ||
    !apiKeyDigestMatches(deps.apiKeyPepper, parsed.secret, loaded.key.digest)
  ) {
    return rejected();
  }
  touchApiKeyLastUsed({
    db: deps.db,
    keyId: loaded.key.id,
    lastUsedAt: loaded.key.lastUsedAt,
    now,
    onError: () =>
      deps.observability?.logger.warn(
        { event: "api_key.last_used_update_failed" },
        "Failed to record API key usage",
      ),
  });
  return {
    kind: "authenticated",
    // The key acts for its school; the school owner's user id is the
    // principal so user-referencing columns stay valid. Owner-only and
    // account operations remain unreachable via the operation policy.
    principalId: loaded.ownerAccount.userId,
    credential: { kind: "api_key", credentialId: loaded.key.id },
  };
}
