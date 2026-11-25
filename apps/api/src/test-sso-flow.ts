// Test harness for the single sign-on flow: a runtime, the Express app on a
// real port, a seeded SAML connection pinned to the fixture IdP's certificate,
// and helpers to start a sign-in and answer it as that IdP.
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { dispatch } from "./dispatch.js";
import { digestToken } from "./learners.js";
import { createExpressApp } from "./express-app.js";
import { createPgliteRuntime, freezeRuntimeClock, type Runtime } from "./runtime.js";
import { seedWorld, type SeededWorld } from "./seed.js";
import { ssoServiceProviderUrls } from "./sso-config.js";
import { seedSsoConnection } from "./test-sso.js";
import {
  type AssertionOptions,
  idpKeys,
  type ResponseOptions,
  signedResponse,
  type SigningOptions,
} from "./sso-protocol/test-idp.js";

export const SCHOOL_A_HOST = "school-a.localhost:3001";
export const NONCE = "n".repeat(43);
export const bareCertificate = (pem: string) =>
  pem.replace(/-----[A-Z ]+-----/g, "").replace(/\s+/g, "");

export async function ssoSetup(
  options: {
    billingMode?: "cloud" | "oss";
    status?: "draft" | "active" | "suspended" | "disabled";
    enforcement?: "optional" | "required_for_domains";
    maxSessionMinutes?: number | null;
    tested?: boolean;
    domains?: string[];
    /** Don't create a connection at all. */
    noConnection?: boolean;
  } = {},
) {
  // Better Auth stamps sessions with real time, and the SAML library judges
  // assertions against it, so the frozen clock starts at real time.
  const clock = freezeRuntimeClock(new Date());
  const runtime = await createPgliteRuntime({
    clock,
    billingMode: options.billingMode ?? "oss",
  });
  const world = await seedWorld(runtime, clock);
  const app = createExpressApp(runtime);
  const server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, () => resolve(listening));
  });
  const appBase = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const connection = options.noConnection
    ? null
    : await seedSsoConnection(runtime.db, clock, {
        schoolId: world.schoolA.id,
        status: options.status ?? "active",
        enforcement: options.enforcement,
        entityId: "https://idp.example/entity",
        idpSsoUrl: "https://idp.example/sso",
        idpCertificates: [bareCertificate(idpKeys.cert)],
        tested: options.tested ?? true,
        maxSessionMinutes: options.maxSessionMinutes,
        domains: options.domains ?? ["acme.com"],
      });
  const urls = connection
    ? ssoServiceProviderUrls(runtime.auth.publicApiUrl, connection.publicId)
    : null;
  const connectionPath = connection
    ? `/learner-login/sso/${connection.publicId}`
    : "/learner-login/sso/sso_missing";

  const startSignIn = async (next?: string) => {
    const started = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/auth/sso",
      headers: { "x-school-id": world.schoolA.publicId },
      body: { host: SCHOOL_A_HOST, nonce: NONCE, ...(next ? { next } : {}) },
    });
    if (started.status !== 200) return { started, token: null, requestId: null, redirect: null };
    const url = new URL((started.body as { url: string }).url);
    const token = url.searchParams.get("request")!;
    const redirect = await fetch(`${appBase}${url.pathname}${url.search}`, { redirect: "manual" });
    const [row] = await runtime.db
      .select()
      .from(schema.schoolSsoRequests)
      .where(eq(schema.schoolSsoRequests.requestDigest, digestToken(token)));
    return { started, token, requestId: row?.protocolRequestId ?? null, redirect };
  };

  const response = (
    requestId: string,
    assertion: AssertionOptions = {},
    responseOptions: Partial<ResponseOptions> = {},
    signing: SigningOptions = { keys: idpKeys },
  ) =>
    signedResponse(
      requestId,
      {
        audience: urls!.entityId,
        recipient: urls!.acsUrl,
        nameId: "subject-1",
        attributes: { email: ["alice@acme.com"], displayName: ["Alice"] },
        ...assertion,
      },
      { destination: urls!.acsUrl, ...responseOptions },
      signing,
    );

  const acs = (samlResponse: string, relayState: string, path = connectionPath) =>
    fetch(`${appBase}${path}/acs`, {
      method: "POST",
      redirect: "manual",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ SAMLResponse: samlResponse, RelayState: relayState }),
    });

  const redeem = (ticket: string, nonce = NONCE) =>
    dispatch(runtime, {
      method: "POST",
      path: "/v1/auth/tickets/consume",
      headers: {
        "x-school-id": world.schoolA.publicId,
        cookie: `courselit.login.nonce=${nonce}`,
      },
      body: { ticket },
    });

  return {
    clock,
    runtime,
    world,
    connection: connection!,
    urls: urls!,
    appBase,
    connectionPath,
    startSignIn,
    response,
    acs,
    redeem,
    async close() {
      server.close();
      await runtime.close();
    },
  };
}

export type SsoSetup = Awaited<ReturnType<typeof ssoSetup>>;

export function ticketFrom(location: string | null): string | null {
  if (!location) return null;
  return new URLSearchParams(new URL(location).hash.slice(1)).get("ticket");
}

export function ownerHeaders(world: SeededWorld, extra: Record<string, string> = {}) {
  return {
    cookie: world.owner.sessionCookie,
    "x-school-id": world.schoolA.publicId,
    ...extra,
  };
}

export type { Runtime };
