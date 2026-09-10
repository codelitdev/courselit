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
import { fromNodeHeaders } from "better-auth/node";
import { and, eq, isNull } from "drizzle-orm";
import * as schema from "../db/schema/index.js";
import type { AppDb } from "../types.js";
import { apiKeyDigestMatches, parseApiKey } from "./api-keys.js";
import type { AdminAuth, LearnerAuth } from "./better-auth.js";
import { ADMIN_SESSION_COOKIE_NAME } from "./options.js";

export type AuthRuntime = {
  db: AppDb;
  apiKeyPepper: string;
  auth: AdminAuth;
  clock: Clock;
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
  if (selected.kind === "ambiguous") {
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
      },
    };
  }
  const parsed = parseApiKey(presented.secret);
  if (!parsed) {
    return {
      kind: "rejected",
      error: createPlatformError("unauthenticated"),
    };
  }
  const keys = await deps.db
    .select()
    .from(schema.apiKeys)
    .where(
      and(
        eq(schema.apiKeys.publicId, parsed.publicId),
        isNull(schema.apiKeys.revokedAt),
      ),
    )
    .limit(1);
  const key = keys[0];
  if (
    !key ||
    (key.expiresAt && key.expiresAt.getTime() <= deps.clock.now().getTime()) ||
    !apiKeyDigestMatches(deps.apiKeyPepper, parsed.secret, key.digest)
  ) {
    return {
      kind: "rejected",
      error: createPlatformError("unauthenticated"),
    };
  }
  void deps.db
    .update(schema.apiKeys)
    .set({ lastUsedAt: deps.clock.now() })
    .where(eq(schema.apiKeys.id, key.id))
    .then(() => undefined)
    .catch(() => undefined);
  return {
    kind: "authenticated",
    principalId: key.userId,
    credential: { kind: "api_key", credentialId: key.id },
  };
}

/**
 * Resolve only the learner Better Auth cookie. This is deliberately separate
 * from authenticateHttpRequest: an admin session must never authenticate a
 * learner request.
 */
export async function authenticateLearnerHttpRequest(
  headers: HeaderMap,
  deps: { learnerAuth: LearnerAuth },
): Promise<AuthenticationResult<string>> {
  const cookie = headers.cookie ?? headers.Cookie;
  if (!cookie) {
    return mapTransportAuthentication({ kind: "absent" }, { transport: "http" });
  }
  const resolved = await resolveBetterAuthSession(
    {
      auth: deps.learnerAuth.auth,
      issuer: deps.learnerAuth.issuer,
    },
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

export async function authenticateMcpRequest(
  headers: HeaderMap,
  deps: AuthRuntime,
): Promise<AuthenticationResult<string>> {
  const selected = selectMcpCredential(headers);
  if (selected.kind === "absent") {
    return mapTransportAuthentication({ kind: "absent" }, { transport: "mcp" });
  }
  if (selected.kind === "ambiguous") {
    return { kind: "rejected", error: selected.error };
  }
  if (selected.credential.kind === "session") {
    return {
      kind: "rejected",
      error: createPlatformError("unauthenticated"),
    };
  }
  return authenticateHttpRequest(
    {
      authorization:
        selected.credential.kind === "oauth"
          ? `Bearer ${selected.credential.secret}`
          : undefined,
      "x-api-key":
        selected.credential.kind === "api_key" ? selected.credential.secret : undefined,
    },
    deps,
  ).then((result) => mapTransportAuthentication(result, { transport: "mcp" }));
}
