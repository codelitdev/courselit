import {
  addSsoDomainBodySchema,
  createSsoConnectionBodySchema,
  startSsoConnectionTestBodySchema,
  updateSchoolLoginMethodsBodySchema,
  updateSsoConnectionBodySchema,
} from "@courselit/api-contract";
import { createPlatformError, toPublicHttpError } from "@codelitdev/platform";
import type { DispatchDeps } from "./deps.js";
import { readSchoolLoginMethods, updateSchoolLoginMethods } from "./login-methods.js";
import type { ResolvedSchool } from "./school-context.js";
import {
  activateSsoConnection,
  addSsoDomain,
  createSsoConnection,
  deleteSsoConnection,
  deleteSsoDomain,
  disableSsoConnection,
  getSsoConnection,
  getSsoConnectionTestResult,
  listSsoConnections,
  type SsoAdminContext,
  startSsoConnectionTest,
  unlinkSsoIdentity,
  updateSsoConnection,
  verifySsoDomain,
} from "./sso-admin.js";
import type { DispatchResponse, IncomingRequest } from "./types.js";

type Outcome<T> = { ok: true; value: T } | { ok: false; error: ReturnType<typeof createPlatformError> };

function respond<T>(result: Outcome<T>, status = 200): DispatchResponse {
  if (!result.ok) {
    const mapped = toPublicHttpError(result.error);
    return { status: mapped.status, body: mapped.body };
  }
  return status === 204 ? { status, body: undefined } : { status, body: result.value };
}

const badRequest = (): DispatchResponse => {
  const mapped = toPublicHttpError(createPlatformError("validation_failed"));
  return { status: mapped.status, body: mapped.body };
};

/**
 * The school-scoped single sign-on and sign-in-method operations. Credential
 * kind, ownership, permissions and the recent-sign-in rule are decided by the
 * operation policy before this runs; this only maps requests to the logic.
 * Returns null when the request is not one of these operations.
 */
export async function handleSsoAdminRequest(
  deps: DispatchDeps,
  request: IncomingRequest,
  path: string,
  school: ResolvedSchool,
): Promise<DispatchResponse | null> {
  const ctx: SsoAdminContext = {
    db: deps.db,
    clock: deps.clock,
    billing: deps.billing.billing,
    publicApiUrl: deps.auth.publicApiUrl,
    webOrigin: deps.auth.webOrigin,
    dnsResolver: deps.dnsResolver,
    schoolId: school.schoolId,
    actorSchoolAccountId: school.schoolAccountId,
  };
  const method = request.method;
  const body = request.body ?? {};

  if (path === "/v1/school/login-methods") {
    if (method === "GET") {
      return respond(await readSchoolLoginMethods(deps.db, deps.billing.billing, school.schoolId));
    }
    if (method === "PATCH") {
      const parsed = updateSchoolLoginMethodsBodySchema.safeParse(body);
      if (!parsed.success) return badRequest();
      return respond(
        await updateSchoolLoginMethods(
          deps.db,
          deps.billing.billing,
          school.schoolId,
          parsed.data,
          deps.clock,
        ),
      );
    }
    return null;
  }

  if (path === "/v1/sso/connections") {
    if (method === "GET") return respond(await listSsoConnections(ctx));
    if (method === "POST") {
      const parsed = createSsoConnectionBodySchema.safeParse(body);
      if (!parsed.success) return badRequest();
      return respond(await createSsoConnection(ctx, parsed.data), 201);
    }
    return null;
  }

  const identity = /^\/v1\/sso\/identities\/([^/]+)$/.exec(path);
  if (identity && method === "DELETE") {
    return respond(await unlinkSsoIdentity(ctx, decodeURIComponent(identity[1]!)), 204);
  }

  const match = /^\/v1\/sso\/connections\/([^/]+)(?:\/(.*))?$/.exec(path);
  if (!match) return null;
  const connectionId = decodeURIComponent(match[1]!);
  const rest = match[2] ?? "";

  if (rest === "") {
    if (method === "GET") return respond(await getSsoConnection(ctx, connectionId));
    if (method === "PATCH") {
      const parsed = updateSsoConnectionBodySchema.safeParse(body);
      if (!parsed.success) return badRequest();
      return respond(await updateSsoConnection(ctx, connectionId, parsed.data));
    }
    if (method === "DELETE") return respond(await deleteSsoConnection(ctx, connectionId), 204);
    return null;
  }
  if (rest === "domains" && method === "POST") {
    const parsed = addSsoDomainBodySchema.safeParse(body);
    if (!parsed.success) return badRequest();
    return respond(await addSsoDomain(ctx, connectionId, parsed.data), 201);
  }
  const domain = /^domains\/([^/]+)(\/verify)?$/.exec(rest);
  if (domain) {
    const name = decodeURIComponent(domain[1]!);
    if (domain[2] && method === "POST") return respond(await verifySsoDomain(ctx, connectionId, name));
    if (!domain[2] && method === "DELETE") {
      return respond(await deleteSsoDomain(ctx, connectionId, name), 204);
    }
    return null;
  }
  if (rest === "test" && method === "POST") {
    const parsed = startSsoConnectionTestBodySchema.safeParse(body);
    if (!parsed.success) return badRequest();
    return respond(await startSsoConnectionTest(ctx, connectionId, parsed.data));
  }
  const result = /^test-results\/([^/]+)$/.exec(rest);
  if (result && method === "GET") {
    return respond(await getSsoConnectionTestResult(ctx, connectionId, decodeURIComponent(result[1]!)));
  }
  if (rest === "activate" && method === "POST") {
    return respond(await activateSsoConnection(ctx, connectionId));
  }
  if (rest === "disable" && method === "POST") {
    return respond(await disableSsoConnection(ctx, connectionId));
  }
  return null;
}
