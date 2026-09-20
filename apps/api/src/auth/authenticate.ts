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
import type { AdminAuth } from "./better-auth.js";
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
    .select({
      key: schema.apiKeys,
      accountUserId: schema.schoolAccounts.userId,
    })
    .from(schema.apiKeys)
    .leftJoin(
      schema.memberships,
      eq(schema.memberships.id, schema.apiKeys.membershipId),
    )
    .leftJoin(
      schema.schoolAccounts,
      eq(schema.schoolAccounts.id, schema.memberships.schoolAccountId),
    )
    .where(
      and(
        eq(schema.apiKeys.publicId, parsed.publicId),
        isNull(schema.apiKeys.revokedAt),
      ),
    )
    .limit(1);
  const row = keys[0];
  if (
    !row ||
    (row.key.expiresAt && row.key.expiresAt.getTime() <= deps.clock.now().getTime()) ||
    !apiKeyDigestMatches(deps.apiKeyPepper, parsed.secret, row.key.digest)
  ) {
    return {
      kind: "rejected",
      error: createPlatformError("unauthenticated"),
    };
  }
  const principalId = row.key.userId ?? row.accountUserId ?? "";
  if (!principalId) {
    return {
      kind: "rejected",
      error: createPlatformError("unauthenticated"),
    };
  }
  void deps.db
    .update(schema.apiKeys)
    .set({ lastUsedAt: deps.clock.now() })
    .where(eq(schema.apiKeys.id, row.key.id))
    .then(() => undefined)
    .catch(() => undefined);
  return {
    kind: "authenticated",
    principalId,
    credential: { kind: "api_key", credentialId: row.key.id },
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
    .select({
      key: schema.apiKeys,
      userId: schema.schoolAccounts.userId,
    })
    .from(schema.apiKeys)
    .innerJoin(
      schema.memberships,
      eq(schema.memberships.id, schema.apiKeys.membershipId),
    )
    .innerJoin(
      schema.schoolAccounts,
      eq(schema.schoolAccounts.id, schema.memberships.schoolAccountId),
    )
    .where(
      and(
        eq(schema.apiKeys.publicId, parsed.publicId),
        isNull(schema.apiKeys.revokedAt),
      ),
    )
    .limit(1);
  const matched = keys[0];
  if (
    !matched ||
    (matched.key.expiresAt && matched.key.expiresAt.getTime() <= deps.clock.now().getTime()) ||
    !apiKeyDigestMatches(deps.apiKeyPepper, parsed.secret, matched.key.digest)
  ) {
    return {
      kind: "rejected",
      error: createPlatformError("unauthenticated"),
    };
  }
  void deps.db
    .update(schema.apiKeys)
    .set({ lastUsedAt: deps.clock.now() })
    .where(eq(schema.apiKeys.id, matched.key.id))
    .then(() => undefined)
    .catch(() => undefined);
  return {
    kind: "authenticated",
    principalId: matched.userId,
    credential: { kind: "api_key", credentialId: matched.key.id },
  };
}
