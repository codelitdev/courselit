import type { Clock } from "@codelitdev/platform";
import { createPlatformError, type PlatformError } from "@codelitdev/platform";
import { and, desc, eq, inArray, isNotNull, isNull, ne, sql } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { getPaymentProvider } from "./payments.js";
import { getMailingSettings } from "./sendlit-service.js";
import type { AppDb } from "./types.js";

export const ONBOARDING_CHECKLIST_KEYS = [
  "pay",
  "mail",
  "legal",
  "home",
  "domain",
  "ai",
  "learners",
  "welcome",
  "course",
  "team",
] as const;
export type OnboardingChecklistKey = (typeof ONBOARDING_CHECKLIST_KEYS)[number];

export type OnboardingStep =
  | "school"
  | "offer"
  | "build"
  | "brand"
  | "email"
  | "plan"
  | "live";

export type SchoolOnboardingDto = {
  status: "in_progress" | "complete";
  step: OnboardingStep;
  draft: Record<string, unknown>;
  checklistHidden: boolean;
  checklist: Array<{ key: OnboardingChecklistKey; done: boolean }>;
  billing: { required: boolean; entitled: boolean };
  updatedAt: string;
};

/** Inserts the school's onboarding row. Runs inside school creation. */
export async function insertSchoolOnboarding(
  db: AppDb,
  schoolId: string,
  now: Date,
): Promise<void> {
  await db.insert(schema.schoolOnboarding).values({
    schoolId,
    status: "in_progress",
    step: "school",
    draft: {},
    checklistHidden: false,
    manualDone: [],
    createdAt: now,
    updatedAt: now,
  });
}

async function loadRow(db: AppDb, schoolId: string, clock: Clock) {
  const rows = await db
    .select()
    .from(schema.schoolOnboarding)
    .where(eq(schema.schoolOnboarding.schoolId, schoolId))
    .limit(1);
  if (rows[0]) return rows[0];
  // Schools created before onboarding existed get a row on first read.
  const now = clock.now();
  await db
    .insert(schema.schoolOnboarding)
    .values({
      schoolId,
      status: "in_progress",
      step: "school",
      draft: {},
      checklistHidden: false,
      manualDone: [],
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing();
  const again = await db
    .select()
    .from(schema.schoolOnboarding)
    .where(eq(schema.schoolOnboarding.schoolId, schoolId))
    .limit(1);
  return again[0]!;
}

async function paymentsDone(db: AppDb, schoolId: string): Promise<boolean> {
  try {
    return (await getPaymentProvider(db, schoolId)) !== null;
  } catch {
    return false;
  }
}

async function mailDone(db: AppDb, schoolId: string, clock: Clock): Promise<boolean> {
  try {
    const result = await getMailingSettings(db, schoolId, clock);
    if (!result.ok) return false;
    const address = (result.value as { mailingAddress?: unknown }).mailingAddress;
    return typeof address === "string" && address.trim().length > 0;
  } catch {
    // The mail service being down must never break onboarding.
    return false;
  }
}

async function legalDone(db: AppDb, schoolId: string): Promise<boolean> {
  const pages = await db
    .select({
      slug: schema.websitePages.slug,
      layout: schema.websitePages.layout,
    })
    .from(schema.websitePages)
    .where(
      and(
        eq(schema.websitePages.schoolId, schoolId),
        inArray(schema.websitePages.slug, ["terms", "privacy"]),
        isNotNull(schema.websitePages.publishedAt),
      ),
    );
  const hasContent = (slug: string) =>
    pages.some(
      (page) =>
        page.slug === slug &&
        page.layout.some(
          (widget) => widget.name !== "header" && widget.name !== "footer",
        ),
    );
  return hasContent("terms") && hasContent("privacy");
}

async function count(db: AppDb, query: PromiseLike<Array<{ n: number | string }>>) {
  void db;
  return Number((await query)[0]?.n ?? 0);
}

export async function computeChecklist(
  db: AppDb,
  input: { schoolId: string; principalId: string; manualDone: readonly string[] },
  clock: Clock,
): Promise<Array<{ key: OnboardingChecklistKey; done: boolean }>> {
  const { schoolId, principalId } = input;
  const [pay, mail, legal, domain, ai, learners, course, team] = await Promise.all([
    paymentsDone(db, schoolId),
    mailDone(db, schoolId, clock),
    legalDone(db, schoolId),
    count(
      db,
      db
        .select({ n: sql<number>`count(*)` })
        .from(schema.schoolHosts)
        .where(
          and(
            eq(schema.schoolHosts.schoolId, schoolId),
            eq(schema.schoolHosts.kind, "custom"),
            eq(schema.schoolHosts.verificationStatus, "verified"),
          ),
        ),
    ).then((n) => n > 0),
    aiConnected(db, schoolId, principalId),
    count(
      db,
      db
        .select({ n: sql<number>`count(*)` })
        .from(schema.schoolAccounts)
        .where(
          and(
            eq(schema.schoolAccounts.schoolId, schoolId),
            ne(schema.schoolAccounts.userId, principalId),
          ),
        ),
    ).then((n) => n > 0),
    count(
      db,
      db
        .select({ n: sql<number>`count(*)` })
        .from(schema.products)
        .where(
          and(eq(schema.products.schoolId, schoolId), eq(schema.products.kind, "course")),
        ),
    ).then((n) => n > 0),
    teamGrown(db, schoolId, clock),
  ]);
  const derived: Record<OnboardingChecklistKey, boolean> = {
    pay,
    mail,
    legal,
    home: false,
    domain,
    ai,
    learners,
    welcome: false,
    course,
    team,
  };
  return ONBOARDING_CHECKLIST_KEYS.map((key) => ({
    key,
    done: derived[key] || input.manualDone.includes(key),
  }));
}

async function aiConnected(
  db: AppDb,
  schoolId: string,
  principalId: string,
): Promise<boolean> {
  const consents = await db
    .select({ id: schema.oauthConsent.id })
    .from(schema.oauthConsent)
    .where(eq(schema.oauthConsent.userId, principalId))
    .limit(1);
  if (consents[0]) return true;
  const keys = await db
    .select({ id: schema.apiKeys.id })
    .from(schema.apiKeys)
    .where(and(eq(schema.apiKeys.schoolId, schoolId), isNull(schema.apiKeys.revokedAt)))
    .limit(1);
  return Boolean(keys[0]);
}

async function teamGrown(db: AppDb, schoolId: string, clock: Clock): Promise<boolean> {
  const [members, pending] = await Promise.all([
    db
      .select({ n: sql<number>`count(*)` })
      .from(schema.memberships)
      .where(eq(schema.memberships.schoolId, schoolId)),
    db
      .select({ n: sql<number>`count(*)` })
      .from(schema.invitations)
      .where(
        and(
          eq(schema.invitations.schoolId, schoolId),
          eq(schema.invitations.status, "pending"),
          sql`${schema.invitations.expiresAt} > ${clock.now()}`,
        ),
      ),
  ]);
  return Number(members[0]?.n ?? 0) + Number(pending[0]?.n ?? 0) > 1;
}

export async function readSchoolOnboarding(
  db: AppDb,
  input: {
    schoolId: string;
    principalId: string;
    billing: { required: boolean; entitled: boolean };
  },
  clock: Clock,
): Promise<SchoolOnboardingDto> {
  const row = await loadRow(db, input.schoolId, clock);
  return toDto(db, row, input, clock);
}

async function toDto(
  db: AppDb,
  row: typeof schema.schoolOnboarding.$inferSelect,
  input: {
    schoolId: string;
    principalId: string;
    billing: { required: boolean; entitled: boolean };
  },
  clock: Clock,
): Promise<SchoolOnboardingDto> {
  return {
    status: row.status,
    step: row.step as OnboardingStep,
    draft: row.draft,
    checklistHidden: row.checklistHidden,
    checklist: await computeChecklist(
      db,
      {
        schoolId: input.schoolId,
        principalId: input.principalId,
        manualDone: row.manualDone,
      },
      clock,
    ),
    billing: input.billing,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function updateSchoolOnboarding(
  db: AppDb,
  input: {
    schoolId: string;
    principalId: string;
    billing: { required: boolean; entitled: boolean };
    patch: {
      status?: "in_progress" | "complete";
      step?: OnboardingStep;
      draft?: Record<string, unknown>;
      checklistHidden?: boolean;
      markDone?: OnboardingChecklistKey[];
    };
  },
  clock: Clock,
): Promise<SchoolOnboardingDto> {
  const row = await loadRow(db, input.schoolId, clock);
  const { patch } = input;
  const [updated] = await db
    .update(schema.schoolOnboarding)
    .set({
      status: patch.status ?? row.status,
      step: patch.step ?? row.step,
      draft: patch.draft ? { ...row.draft, ...patch.draft } : row.draft,
      checklistHidden: patch.checklistHidden ?? row.checklistHidden,
      manualDone: patch.markDone
        ? [...new Set([...row.manualDone, ...patch.markDone])]
        : row.manualDone,
      updatedAt: clock.now(),
    })
    .where(eq(schema.schoolOnboarding.schoolId, input.schoolId))
    .returning();
  return toDto(db, updated!, input, clock);
}

// ---------------------------------------------------------------------------
// School address availability
// ---------------------------------------------------------------------------

const SUBDOMAIN_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidSubdomain(value: string): boolean {
  return value.length >= 3 && value.length <= 63 && SUBDOMAIN_PATTERN.test(value);
}

async function takenAmong(db: AppDb, candidates: string[]): Promise<Set<string>> {
  if (candidates.length === 0) return new Set();
  const [schools, hosts] = await Promise.all([
    db
      .select({ value: schema.schools.subdomain })
      .from(schema.schools)
      .where(inArray(schema.schools.subdomain, candidates)),
    db
      .select({ value: schema.schoolHosts.hostname })
      .from(schema.schoolHosts)
      .where(inArray(schema.schoolHosts.hostname, candidates)),
  ]);
  return new Set([...schools, ...hosts].map((row) => row.value));
}

export async function checkSchoolSubdomain(
  db: AppDb,
  rawSubdomain: string,
): Promise<{
  subdomain: string;
  available: boolean;
  reason: "invalid" | "taken" | null;
  suggestions: string[];
}> {
  const subdomain = rawSubdomain.trim();
  if (!isValidSubdomain(subdomain)) {
    return { subdomain, available: false, reason: "invalid", suggestions: [] };
  }
  if ((await takenAmong(db, [subdomain])).size === 0) {
    return { subdomain, available: true, reason: null, suggestions: [] };
  }
  const ideas = [`${subdomain}-studio`, `${subdomain}-art`, `${subdomain}-school`];
  for (let i = 2; i <= 9; i++) ideas.push(`${subdomain}${i}`);
  const candidates = ideas.filter(isValidSubdomain);
  const taken = await takenAmong(db, candidates);
  return {
    subdomain,
    available: false,
    reason: "taken",
    suggestions: candidates.filter((value) => !taken.has(value)).slice(0, 3),
  };
}

// ---------------------------------------------------------------------------
// AI connections (OAuth clients the signed-in user authorised)
// ---------------------------------------------------------------------------

function readableClientName(client: {
  clientId: string;
  name: string | null;
  uri: string | null;
  redirectUris: string[];
}): string {
  const name = client.name?.trim();
  if (name) return name;
  for (const candidate of [client.uri, client.clientId, client.redirectUris[0]]) {
    if (!candidate) continue;
    try {
      const url = new URL(candidate);
      if (url.hostname) return url.hostname;
    } catch {
      /* not a URL */
    }
  }
  return client.clientId;
}

export async function listAiConnections(
  db: AppDb,
  principalId: string,
  clock: Clock,
): Promise<
  Array<{ id: string; name: string; connectedAt: string; lastUsedAt: string | null }>
> {
  const consents = await db
    .select({
      clientId: schema.oauthConsent.clientId,
      createdAt: schema.oauthConsent.createdAt,
      name: schema.oauthClient.name,
      uri: schema.oauthClient.uri,
      redirectUris: schema.oauthClient.redirectUris,
    })
    .from(schema.oauthConsent)
    .innerJoin(
      schema.oauthClient,
      eq(schema.oauthClient.clientId, schema.oauthConsent.clientId),
    )
    .where(eq(schema.oauthConsent.userId, principalId))
    .orderBy(desc(schema.oauthConsent.createdAt));
  if (consents.length === 0) return [];
  const [access, refresh] = await Promise.all([
    db
      .select({
        clientId: schema.oauthAccessToken.clientId,
        at: schema.oauthAccessToken.createdAt,
      })
      .from(schema.oauthAccessToken)
      .where(eq(schema.oauthAccessToken.userId, principalId)),
    db
      .select({
        clientId: schema.oauthRefreshToken.clientId,
        at: schema.oauthRefreshToken.createdAt,
      })
      .from(schema.oauthRefreshToken)
      .where(eq(schema.oauthRefreshToken.userId, principalId)),
  ]);
  const lastUsed = new Map<string, Date>();
  for (const row of [...access, ...refresh]) {
    if (!row.at) continue;
    const current = lastUsed.get(row.clientId);
    if (!current || row.at > current) lastUsed.set(row.clientId, row.at);
  }
  const seen = new Set<string>();
  const items: Array<{
    id: string;
    name: string;
    connectedAt: string;
    lastUsedAt: string | null;
  }> = [];
  for (const consent of consents) {
    if (seen.has(consent.clientId)) continue;
    seen.add(consent.clientId);
    items.push({
      id: consent.clientId,
      name: readableClientName(consent),
      connectedAt: (consent.createdAt ?? clock.now()).toISOString(),
      lastUsedAt: lastUsed.get(consent.clientId)?.toISOString() ?? null,
    });
  }
  return items;
}

export async function disconnectAiConnection(
  db: AppDb,
  principalId: string,
  clientId: string,
): Promise<{ ok: true } | { ok: false; error: PlatformError }> {
  const found = await db
    .select({ id: schema.oauthConsent.id })
    .from(schema.oauthConsent)
    .where(
      and(
        eq(schema.oauthConsent.userId, principalId),
        eq(schema.oauthConsent.clientId, clientId),
      ),
    )
    .limit(1);
  if (!found[0]) return { ok: false, error: createPlatformError("not_found") };
  await db.transaction(async (tx) => {
    await tx
      .delete(schema.oauthAccessToken)
      .where(
        and(
          eq(schema.oauthAccessToken.userId, principalId),
          eq(schema.oauthAccessToken.clientId, clientId),
        ),
      );
    await tx
      .delete(schema.oauthRefreshToken)
      .where(
        and(
          eq(schema.oauthRefreshToken.userId, principalId),
          eq(schema.oauthRefreshToken.clientId, clientId),
        ),
      );
    await tx
      .delete(schema.oauthConsent)
      .where(
        and(
          eq(schema.oauthConsent.userId, principalId),
          eq(schema.oauthConsent.clientId, clientId),
        ),
      );
  });
  return { ok: true };
}
