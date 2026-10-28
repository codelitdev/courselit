import { type Clock, uuidv7 } from "@codelitdev/platform";
import { and, desc, eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import type {
  LearnerMembershipRow,
  LearnerMembershipStatus,
} from "./learner-memberships.js";
import { MailEventName } from "./mail-triggers.js";
import { defaultStorefrontHost } from "./schools.js";
import type { AppDb } from "./types.js";

export type TrackSendLitEventPayload = {
  schoolAccountId: string;
  eventName: MailEventName;
  properties: Record<string, unknown>;
  occurredAt: string;
};

/** The school's storefront origin: its verified primary custom host, or its
 * platform subdomain. */
export async function schoolSiteUrl(
  db: AppDb,
  schoolId: string,
): Promise<string | null> {
  const [customHost] = await db
    .select({ hostname: schema.schoolHosts.hostname })
    .from(schema.schoolHosts)
    .where(
      and(
        eq(schema.schoolHosts.schoolId, schoolId),
        eq(schema.schoolHosts.kind, "custom"),
        eq(schema.schoolHosts.verificationStatus, "verified"),
      ),
    )
    .orderBy(desc(schema.schoolHosts.isPrimary))
    .limit(1);
  if (customHost) return `https://${customHost.hostname}`;
  const [school] = await db
    .select({ subdomain: schema.schools.subdomain })
    .from(schema.schools)
    .where(eq(schema.schools.id, schoolId))
    .limit(1);
  if (!school) return null;
  const host = defaultStorefrontHost(school.subdomain) ?? `${school.subdomain}.courselit.app`;
  return `${/(^|\.)localhost$/.test(host) ? "http" : "https"}://${host}`;
}

async function queueSendLitEvent(
  db: AppDb,
  input: { schoolId: string; payload: TrackSendLitEventPayload; clock: Clock },
): Promise<void> {
  const now = input.clock.now();
  await db.insert(schema.integrationOutboxJobs).values({
    id: uuidv7(input.clock),
    schoolId: input.schoolId,
    provider: "sendlit",
    type: "track_sendlit_event",
    payload: input.payload,
    status: "pending",
    attempts: 0,
    revision: 1,
    nextAttemptAt: now,
    createdAt: now,
    updatedAt: now,
  });
}

async function productEventProperties(
  db: AppDb,
  schoolId: string,
  productPublicId: string,
): Promise<Record<string, unknown> | null> {
  const [product] = await db
    .select({
      publicId: schema.products.publicId,
      title: schema.products.title,
      kind: schema.products.kind,
    })
    .from(schema.products)
    .where(
      and(
        eq(schema.products.schoolId, schoolId),
        eq(schema.products.publicId, productPublicId),
      ),
    )
    .limit(1);
  if (!product) return null;
  const siteUrl = await schoolSiteUrl(db, schoolId);
  return {
    productId: product.publicId,
    productTitle: product.title,
    productType: product.kind,
    ...(siteUrl
      ? {
          productUrl:
            product.kind === "course"
              ? `${siteUrl}/dashboard/courses/${product.publicId}`
              : `${siteUrl}/dashboard/products`,
        }
      : {}),
  };
}

async function communityEventProperties(
  db: AppDb,
  schoolId: string,
  communityPublicId: string,
): Promise<Record<string, unknown> | null> {
  const [community] = await db
    .select({ publicId: schema.communities.publicId, name: schema.communities.name })
    .from(schema.communities)
    .where(
      and(
        eq(schema.communities.schoolId, schoolId),
        eq(schema.communities.publicId, communityPublicId),
      ),
    )
    .limit(1);
  if (!community) return null;
  const siteUrl = await schoolSiteUrl(db, schoolId);
  return {
    communityId: community.publicId,
    communityName: community.name,
    ...(siteUrl
      ? { communityUrl: `${siteUrl}/communities/${community.publicId}` }
      : {}),
  };
}

/**
 * Reports a membership status change to the school's mailing service so
 * sequences triggered by "product purchased", "community joined" and
 * "community left" can enroll the learner. Call it after every write that
 * changes a membership's status; transitions that don't start or end
 * access are ignored.
 */
export async function queueMembershipEvents(
  db: AppDb,
  input: {
    membership: Pick<
      LearnerMembershipRow,
      "schoolId" | "schoolAccountId" | "entityType" | "entityId" | "isIncludedInPlan"
    >;
    previousStatus: LearnerMembershipStatus | string | null | undefined;
    nextStatus: LearnerMembershipStatus | string;
    clock: Clock;
  },
): Promise<void> {
  const { membership, previousStatus, nextStatus } = input;
  const wasActive = previousStatus === "active";
  const isActive = nextStatus === "active";
  if (wasActive === isActive || !membership.schoolAccountId) return;

  // Schools without a mailing integration have nowhere to send events.
  const [integration] = await db
    .select({ id: schema.schoolIntegrations.id })
    .from(schema.schoolIntegrations)
    .where(
      and(
        eq(schema.schoolIntegrations.schoolId, membership.schoolId),
        eq(schema.schoolIntegrations.provider, "sendlit"),
      ),
    )
    .limit(1);
  if (!integration) return;

  let eventName: MailEventName | null = null;
  let properties: Record<string, unknown> | null = null;
  if (membership.entityType === "product" && isActive) {
    eventName = MailEventName.PRODUCT_PURCHASED;
    properties = await productEventProperties(
      db,
      membership.schoolId,
      membership.entityId,
    );
    if (properties) properties.includedInPlan = membership.isIncludedInPlan;
  } else if (membership.entityType === "community" && !membership.isIncludedInPlan) {
    eventName = isActive
      ? MailEventName.COMMUNITY_JOINED
      : MailEventName.COMMUNITY_LEFT;
    properties = await communityEventProperties(
      db,
      membership.schoolId,
      membership.entityId,
    );
  }
  if (!eventName || !properties) return;

  await queueSendLitEvent(db, {
    schoolId: membership.schoolId,
    clock: input.clock,
    payload: {
      schoolAccountId: membership.schoolAccountId,
      eventName,
      properties,
      occurredAt: input.clock.now().toISOString(),
    },
  });
}
