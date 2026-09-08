import { createHash, randomBytes } from "node:crypto";
import { grant as billingGrant } from "@codelitdev/billing/testing";
import { verifyOAuthAccessToken } from "@codelitdev/oauth-server-kit";
import { resolveBetterAuthSession } from "@codelitdev/oauth-server-kit/better-auth";
import { type Clock, createPublicId, uuidv7 } from "@codelitdev/platform";
import { eq } from "drizzle-orm";
import {
  digestApiKeySecret,
  formatApiKey,
  generateApiKeySecret,
} from "./auth/api-keys.js";
import * as schema from "./db/schema/index.js";
import { SCHOOL_PUBLIC_ID_PREFIX } from "./public-id-prefixes.js";
import {
  MEMBER_PERMISSIONS,
  OWNER_PERMISSIONS,
  serializePermissions,
} from "./permissions.js";
import type { Runtime } from "./runtime.js";

export type SeededWorld = {
  owner: {
    id: string;
    email: string;
    sessionCookie: string;
    oauthToken: string;
  };
  member: { id: string; email: string; sessionCookie: string };
  outsider: { id: string; email: string; sessionCookie: string };
  schoolA: { id: string; publicId: string };
  schoolB: { id: string; publicId: string };
  apiKeyA: { publicId: string; raw: string };
  noteA: { publicId: string };
};

const PASSWORD = "reference-password-1";
const SEEDED_TENANT_A_ID = "11111111-1111-4111-8111-111111111111";
const SEEDED_TENANT_B_ID = "22222222-2222-4222-8222-222222222222";

export async function hasSeededWorld(runtime: Runtime): Promise<boolean> {
  const rows = await runtime.db
    .select({ id: schema.schools.id })
    .from(schema.schools)
    .where(eq(schema.schools.id, SEEDED_TENANT_A_ID))
    .limit(1);
  return rows.length > 0;
}

function cookiesFromResponse(response: Response): string {
  const listed =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [];
  if (listed.length > 0) {
    return listed.map((entry) => entry.split(";", 1)[0]!).join("; ");
  }
  const header = response.headers.get("set-cookie");
  if (!header) throw new Error("missing_set_cookie");
  return header.split(";", 1)[0]!;
}

async function signUp(
  runtime: Runtime,
  name: string,
  email: string,
): Promise<{ id: string; sessionCookie: string }> {
  const response = await runtime.auth.auth.api.signUpEmail({
    body: { name, email, password: PASSWORD },
    asResponse: true,
  });
  if (!response.ok) {
    throw new Error(`signup_failed:${email}:${response.status}`);
  }
  const sessionCookie = cookiesFromResponse(response);
  const resolved = await resolveBetterAuthSession(
    { auth: runtime.auth.auth, issuer: runtime.auth.issuer },
    new Headers({ cookie: sessionCookie }),
  );
  if (resolved.status !== "authenticated") {
    throw new Error(`session_missing:${email}`);
  }
  return { id: resolved.identity.subject, sessionCookie };
}

function pkce() {
  const verifier = randomBytes(32).toString("base64url");
  return {
    verifier,
    challenge: createHash("sha256").update(verifier).digest("base64url"),
  };
}

async function mintOAuthToken(
  runtime: Runtime,
  sessionCookie: string,
): Promise<string> {
  const redirectUri = "com.example.reference:/oauth/callback";
  const client = await runtime.auth.auth.api.createOAuthClient({
    headers: new Headers({ cookie: sessionCookie }),
    body: {
      client_name: "Reference test client",
      redirect_uris: [redirectUri],
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      application_type: "native",
    },
  });
  await runtime.auth.auth.api.adminGetOAuthResource({
    headers: new Headers({ cookie: sessionCookie }),
    params: { identifier: runtime.auth.mcpResource },
  });
  await runtime.auth.auth.api.adminLinkClientResource({
    headers: new Headers({ cookie: sessionCookie }),
    params: {
      identifier: runtime.auth.mcpResource,
      client_id: client.client_id,
    },
  });
  const proof = pkce();
  const query = new URLSearchParams({
    client_id: client.client_id,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid profile email offline_access data:read",
    state: "state-123",
    code_challenge: proof.challenge,
    code_challenge_method: "S256",
    resource: runtime.auth.mcpResource,
  });
  const authorization = await runtime.auth.auth.handler(
    new Request(`${runtime.auth.issuer}/oauth2/authorize?${query}`, {
      headers: { cookie: sessionCookie },
      redirect: "manual",
    }),
  );
  let code: string | null;
  const location = authorization.headers.get("location");
  if (authorization.status === 302 && location?.startsWith(redirectUri)) {
    code = new URL(location).searchParams.get("code");
  } else {
    const consentLocation =
      location ?? ((await authorization.json()) as { url?: string }).url ?? null;
    if (!consentLocation) {
      throw new Error(`authorize_failed:${authorization.status}`);
    }
    const oauthQuery = new URL(consentLocation).search.slice(1);
    const consent = await runtime.auth.auth.handler(
      new Request(`${runtime.auth.issuer}/oauth2/consent`, {
        method: "POST",
        headers: {
          cookie: sessionCookie,
          origin: runtime.auth.publicApiUrl,
          "content-type": "application/json",
        },
        body: JSON.stringify({ accept: true, oauth_query: oauthQuery }),
      }),
    );
    const body = (await consent.json()) as { url?: string };
    code = body.url ? new URL(body.url).searchParams.get("code") : null;
  }
  if (!code) throw new Error("oauth_code_missing");
  const tokenResponse = await runtime.auth.auth.handler(
    new Request(`${runtime.auth.issuer}/oauth2/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: client.client_id,
        code_verifier: proof.verifier,
        resource: runtime.auth.mcpResource,
      }),
    }),
  );
  const token = (await tokenResponse.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };
  if (!token.access_token) {
    throw new Error(
      `oauth_token_failed:${tokenResponse.status}:${token.error}:${token.error_description}`,
    );
  }
  const verified = await verifyOAuthAccessToken(
    {
      oauthResourceClient: runtime.auth.oauthResourceClient,
      issuer: runtime.auth.issuer,
      audiences: [runtime.auth.mcpResource],
    },
    token.access_token,
  );
  if (verified.status !== "authenticated") {
    throw new Error(`oauth_verify_failed:${verified.status}`);
  }
  return token.access_token;
}

export async function seedWorld(runtime: Runtime, clock: Clock): Promise<SeededWorld> {
  const now = clock.now();
  const owner = await signUp(runtime, "Owner", "owner@example.com");
  const member = await signUp(runtime, "Member", "member@example.com");
  const outsider = await signUp(runtime, "Outsider", "outsider@example.com");
  const oauthToken = await mintOAuthToken(runtime, owner.sessionCookie);

  const schoolAId = SEEDED_TENANT_A_ID;
  const schoolBId = SEEDED_TENANT_B_ID;
  const schoolAPublic = createPublicId(SCHOOL_PUBLIC_ID_PREFIX, clock);
  const schoolBPublic = createPublicId(SCHOOL_PUBLIC_ID_PREFIX, clock);

  await runtime.db.insert(schema.schools).values([
    {
      id: schoolAId,
      publicId: schoolAPublic,
      name: "School A",
      subdomain: "school-a",
      status: "active",
      locale: "en",
      currency: "USD",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: schoolBId,
      publicId: schoolBPublic,
      name: "School B",
      subdomain: "school-b",
      status: "active",
      locale: "en",
      currency: "USD",
      createdAt: now,
      updatedAt: now,
    },
  ]);
  await runtime.db.insert(schema.schoolHosts).values([
    {
      id: uuidv7(clock),
      schoolId: schoolAId,
      hostname: "school-a",
      kind: "subdomain",
      verificationStatus: "verified",
      verifiedAt: now,
      isPrimary: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uuidv7(clock),
      schoolId: schoolBId,
      hostname: "school-b",
      kind: "subdomain",
      verificationStatus: "verified",
      verifiedAt: now,
      isPrimary: true,
      createdAt: now,
      updatedAt: now,
    },
  ]);
  await runtime.db.insert(schema.memberships).values([
    {
      id: uuidv7(clock),
      schoolId: schoolAId,
      userId: owner.id,
      role: "owner",
      isOwner: true,
      permissions: serializePermissions(OWNER_PERMISSIONS),
      createdAt: now,
    },
    {
      id: uuidv7(clock),
      schoolId: schoolAId,
      userId: member.id,
      role: "member",
      isOwner: false,
      permissions: serializePermissions(MEMBER_PERMISSIONS),
      createdAt: now,
    },
    {
      id: uuidv7(clock),
      schoolId: schoolBId,
      userId: owner.id,
      role: "owner",
      isOwner: true,
      permissions: serializePermissions(OWNER_PERMISSIONS),
      createdAt: now,
    },
  ]);
  await runtime.db.insert(schema.selectedSchools).values({
    userId: owner.id,
    schoolId: schoolAId,
  });

  const keyPublicId = createPublicId("key", clock);
  const secret = generateApiKeySecret();
  await runtime.db.insert(schema.apiKeys).values({
    id: uuidv7(clock),
    publicId: keyPublicId,
    schoolId: schoolAId,
    userId: owner.id,
    digest: digestApiKeySecret(runtime.apiKeyPepper, secret),
    permissions: serializePermissions(OWNER_PERMISSIONS),
    createdAt: now,
  });

  const notePublicId = createPublicId("prd", clock);
  await runtime.db.insert(schema.products).values({
    id: uuidv7(clock),
    publicId: notePublicId,
    schoolId: schoolAId,
    kind: "course",
    status: "draft",
    slug: "seed-product",
    title: "Seed product",
    description: "hello",
    createdBy: owner.id,
    createdAt: now,
    updatedAt: now,
  });

  if (runtime.billingMode === "oss") {
    return {
      owner: {
        id: owner.id,
        email: "owner@example.com",
        sessionCookie: owner.sessionCookie,
        oauthToken,
      },
      member: {
        id: member.id,
        email: "member@example.com",
        sessionCookie: member.sessionCookie,
      },
      outsider: {
        id: outsider.id,
        email: "outsider@example.com",
        sessionCookie: outsider.sessionCookie,
      },
      schoolA: { id: schoolAId, publicId: schoolAPublic },
      schoolB: { id: schoolBId, publicId: schoolBPublic },
      apiKeyA: { publicId: keyPublicId, raw: formatApiKey(keyPublicId, secret) },
      noteA: { publicId: notePublicId },
    };
  }

  await runtime.billing.billing.verifyRequestedCatalog();
  const token = {
    ...billingGrant("checkout", schoolAId, owner.id, now),
    target: { kind: "school", id: schoolAId },
  };
  runtime.billing.authorization.issue(token);
  const checkout = await runtime.billing.billing.startCheckout({
    grant: token,
    entity: { kind: "school", id: schoolAId },
    payer: { id: owner.id, email: "owner@example.com", name: "Owner" },
    offerKey: "pro_month",
    catalogRevision: 1,
    returnUrl: "https://app.test/billing",
  });
  const paid = await runtime.billing.fake.simulatePayment(
    checkout.attempt.providerCheckoutSessionId!,
  );
  const signed = runtime.billing.fake.signWebhook(
    JSON.stringify({
      type: "subscription.active",
      data: {
        subscription_id: paid.providerSubscriptionId,
        metadata: { checkoutAttemptId: checkout.attempt.attemptId },
      },
    }),
  );
  await runtime.billing.billing.ingestWebhook({
    provider: "fake",
    raw: signed,
  });
  await runtime.billing.billing.runWebhookInboxBatch({
    workerId: "seed-webhooks",
  });

  return {
    owner: {
      id: owner.id,
      email: "owner@example.com",
      sessionCookie: owner.sessionCookie,
      oauthToken,
    },
    member: {
      id: member.id,
      email: "member@example.com",
      sessionCookie: member.sessionCookie,
    },
    outsider: {
      id: outsider.id,
      email: "outsider@example.com",
      sessionCookie: outsider.sessionCookie,
    },
    schoolA: { id: schoolAId, publicId: schoolAPublic },
    schoolB: { id: schoolBId, publicId: schoolBPublic },
    apiKeyA: { publicId: keyPublicId, raw: formatApiKey(keyPublicId, secret) },
    noteA: { publicId: notePublicId },
  };
}
