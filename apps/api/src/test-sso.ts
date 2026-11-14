import { createPublicId, uuidv7, type Clock } from "@codelitdev/platform";
import { eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { connectionConfigDigest } from "./sso-config.js";
import { signInLearnerWithIdentity } from "./learners.js";
import { findOrCreateVerifiedUser } from "./learners.js";
import type { AppDb } from "./types.js";

/** An SSO connection for tests, with its verified domains. */
export async function seedSsoConnection(
  db: AppDb,
  clock: Clock,
  input: {
    schoolId: string;
    status?: "draft" | "active" | "suspended" | "disabled";
    enforcement?: "optional" | "required_for_domains";
    entityId?: string;
    domains?: string[];
    unverifiedDomains?: string[];
    idpCertificates?: string[];
    idpSsoUrl?: string;
    /** Record a successful test against the current settings, so it can be activated. */
    tested?: boolean;
    maxSessionMinutes?: number | null;
    displayName?: string;
  },
) {
  const now = clock.now();
  const id = uuidv7(clock);
  const entityId = input.entityId ?? "https://idp.example.test/entity";
  const [connection] = await db
    .insert(schema.schoolSsoConnections)
    .values({
      id,
      publicId: createPublicId("sso", clock),
      schoolId: input.schoolId,
      protocol: "saml",
      status: input.status ?? "active",
      displayName: input.displayName ?? "Acme employees",
      maxSessionMinutes: input.maxSessionMinutes ?? null,
      enforcement: input.enforcement ?? "optional",
      idpEntityId: entityId,
      idpSsoUrl: input.idpSsoUrl ?? "https://idp.example.test/sso",
      idpCertificates: input.idpCertificates ?? [],
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  if (input.tested) {
    await db
      .update(schema.schoolSsoConnections)
      .set({ testedAt: now, testedConfigDigest: connectionConfigDigest(connection!) })
      .where(eq(schema.schoolSsoConnections.id, id));
  }
  const rows = [
    ...(input.domains ?? ["acme.com"]).map((domain) => ({ domain, verified: true })),
    ...(input.unverifiedDomains ?? []).map((domain) => ({ domain, verified: false })),
  ];
  for (const row of rows) {
    await db.insert(schema.schoolSsoDomains).values({
      id: uuidv7(clock),
      connectionId: id,
      schoolId: input.schoolId,
      domain: row.domain,
      verificationToken: "t".repeat(32),
      verifiedAt: row.verified ? now : null,
      createdAt: now,
    });
  }
  return connection!;
}

/** A learner who signed in with an email code, so a real platform user backs the account. */
export async function seedRealLearner(
  db: AppDb,
  clock: Clock,
  schoolPublicId: string,
  email: string,
  name = "Real Person",
) {
  const user = await findOrCreateVerifiedUser(db, email, clock, name);
  const signedIn = await signInLearnerWithIdentity(
    db,
    { userId: user.id, email, name, schoolPublicId, authenticationMethod: "email" },
    clock,
  );
  if (!signedIn.ok) throw new Error("seed_real_learner_failed");
  return { user, session: signedIn.session, token: signedIn.token };
}

export const learnerCookie = (token: string) => ({
  cookie: `courselit.learner.session=${token}`,
});
