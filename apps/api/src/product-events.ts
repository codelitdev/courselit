import { eq } from "drizzle-orm";
import { ActivityType } from "./activity-types.js";
import * as schema from "./db/schema/index.js";
import { telemetrySink } from "./telemetry.js";
import type { AppDb } from "./types.js";

/**
 * Product analytics: the events that show whether people sign up, set up a
 * school and start using it. They go to PostHog from the API (browsers drop
 * analytics behind ad blockers) through `@codelitdev/observability`.
 *
 * - The person is the auth user id, the same id the admin browser identifies
 *   with, so server and browser events join up.
 * - Every school event carries the `school` group (the school's public id),
 *   because activation is measured per school and one person can own several.
 * - Events no staff user caused (learners, webhooks) are sent under one
 *   subject per school (`schoolSubject`), so each learner does not become a
 *   PostHog person. They can't be personless: PostHog does not link
 *   personless events to groups, and per-school counts would miss them.
 *
 * Telemetry never fails the caller. Events emitted inside a transaction that
 * later rolls back are still sent; that's accepted for analytics.
 */
export const ProductEvent = {
  SIGNED_UP: "user_signed_up",
  SCHOOL_CREATED: "school_created",
  ONBOARDING_STEP_COMPLETED: "onboarding_step_completed",
  ONBOARDING_COMPLETED: "onboarding_completed",
  PRODUCT_CREATED: "product_created",
  PRODUCT_PUBLISHED: "product_published",
  WEBSITE_PAGE_PUBLISHED: "website_page_published",
  PAYMENTS_CONNECTED: "payments_connected",
  CUSTOM_DOMAIN_ADDED: "custom_domain_added",
  CUSTOM_DOMAIN_VERIFIED: "custom_domain_verified",
  CUSTOM_DOMAIN_REMOVED: "custom_domain_removed",
  TEAM_MEMBER_INVITED: "team_member_invited",
  CHECKOUT_CREATED: "plan_checkout_created",
  SUBSCRIPTION_STARTED: "subscription_started",
  SUBSCRIPTION_SWITCHED: "subscription_switched",
  SUBSCRIPTION_CANCELLED: "subscription_cancelled",
  SUBSCRIPTION_RESUMED: "subscription_resumed",
  SUBSCRIPTION_ENDED: "subscription_ended",
  SCHOOL_LIFECYCLE_CHANGED: "school_lifecycle_changed",
  LEARNER_SIGNED_UP: "learner_signed_up",
  LEARNER_ENROLLED: "learner_enrolled",
  LEARNER_PURCHASED: "learner_purchased",
  LEARNER_JOINED_COMMUNITY: "learner_joined_community",
  LEARNER_COMPLETED_COURSE: "learner_completed_course",
  CERTIFICATE_ISSUED: "certificate_issued",
  NEWSLETTER_SUBSCRIBED: "newsletter_subscribed",
  COMMUNITY_POST_CREATED: "community_post_created",
} as const;

export type ProductEvent = (typeof ProductEvent)[keyof typeof ProductEvent];

export type ProductEventInput = {
  event: ProductEvent;
  /** The auth user who did it. Leave unset for learner and webhook events. */
  userId?: string | null;
  /** The school's public id (`sch_...`). */
  schoolId?: string | null;
  properties?: Record<string, string | number | boolean | null | undefined>;
  /** Person properties to set on the user (`$set`). */
  personProperties?: Record<string, string | number | boolean | null | undefined>;
};

function defined(input: ProductEventInput["properties"]) {
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(input ?? {})) {
    if (value !== null && value !== undefined) out[key] = value;
  }
  return out;
}

/**
 * The distinct id for events with no staff user behind them: one PostHog
 * person per school. Leave it out of user counts by excluding distinct ids
 * that start with `school_`.
 */
export function schoolSubject(schoolId: string) {
  return `school_${schoolId}`;
}

export function trackProductEvent(input: ProductEventInput) {
  const sink = telemetrySink();
  if (!sink) return;
  const school = input.schoolId || null;
  const user = input.userId || null;
  // Personless events still need a distinct id; the school's keeps them together.
  if (!user && !school) return;
  sink.captureEvent({
    event: input.event,
    source: "product",
    subjectId: user ?? schoolSubject(school as string),
    properties: defined(input.properties),
    ...(school ? { groups: { school } } : {}),
    ...(user && input.personProperties
      ? { personProperties: defined(input.personProperties) }
      : {}),
    dedupe: false,
  });
}

/** Sets properties (name, plan, status) on the school's PostHog group. */
export function identifySchoolGroup(
  schoolId: string | null | undefined,
  properties: Record<string, string | number | boolean | null | undefined>,
) {
  const sink = telemetrySink();
  if (!sink || !schoolId) return;
  sink.identifyGroup({
    groupType: "school",
    groupKey: schoolId,
    source: "product",
    properties: defined(properties),
  });
}

/** The school's public id for its internal id, for code that only has the latter. */
export async function schoolPublicId(
  db: AppDb,
  internalId: string,
): Promise<string | null> {
  const [row] = await db
    .select({ publicId: schema.schools.publicId })
    .from(schema.schools)
    .where(eq(schema.schools.id, internalId))
    .limit(1);
  return row?.publicId ?? null;
}

/** Like `trackProductEvent`, for callers that hold the school's internal id. */
export async function trackSchoolEvent(
  db: AppDb,
  internalSchoolId: string,
  input: Omit<ProductEventInput, "schoolId">,
) {
  if (!telemetrySink()) return;
  try {
    const schoolId = await schoolPublicId(db, internalSchoolId);
    trackProductEvent({ ...input, schoolId });
  } catch {
    // Telemetry must never fail the caller.
  }
}

/**
 * Learner activity worth tracking per school. High-volume activity (lesson
 * progress, video, likes) stays in the school's own analytics only.
 */
const ACTIVITY_EVENTS: Partial<Record<ActivityType, ProductEvent>> = {
  [ActivityType.USER_CREATED]: ProductEvent.LEARNER_SIGNED_UP,
  [ActivityType.ENROLLED]: ProductEvent.LEARNER_ENROLLED,
  [ActivityType.PURCHASED]: ProductEvent.LEARNER_PURCHASED,
  [ActivityType.COMMUNITY_JOINED]: ProductEvent.LEARNER_JOINED_COMMUNITY,
  [ActivityType.COURSE_COMPLETED]: ProductEvent.LEARNER_COMPLETED_COURSE,
  [ActivityType.CERTIFICATE_ISSUED]: ProductEvent.CERTIFICATE_ISSUED,
  [ActivityType.NEWSLETTER_SUBSCRIBED]: ProductEvent.NEWSLETTER_SUBSCRIBED,
  [ActivityType.COMMUNITY_POST_CREATED]: ProductEvent.COMMUNITY_POST_CREATED,
};

export function productEventForActivity(type: ActivityType): ProductEvent | null {
  return ACTIVITY_EVENTS[type] ?? null;
}

/** How a staff account was created, from the better-auth endpoint path. */
export function signUpMethod(path: string | undefined): string {
  if (!path) return "other";
  if (path.startsWith("/callback/") || path.includes("social")) return "google";
  if (path.includes("email-otp")) return "email_otp";
  return "other";
}

/** Onboarding steps in wizard order. */
export const ONBOARDING_STEP_ORDER = [
  "school",
  "offer",
  "build",
  "brand",
  "email",
  "plan",
  "live",
] as const;

/**
 * Events for an onboarding update: each step passed when the wizard moves
 * forward (going back reports nothing), and completion once.
 */
export function onboardingTransitionEvents(
  previous: { step: string; status: string },
  next: { step: string; status: string },
): Array<{ event: ProductEvent; step?: string }> {
  const events: Array<{ event: ProductEvent; step?: string }> = [];
  const from = ONBOARDING_STEP_ORDER.indexOf(previous.step as never);
  const to = ONBOARDING_STEP_ORDER.indexOf(next.step as never);
  if (from >= 0 && to > from) {
    for (const step of ONBOARDING_STEP_ORDER.slice(from, to)) {
      events.push({ event: ProductEvent.ONBOARDING_STEP_COMPLETED, step });
    }
  }
  if (previous.status !== "complete" && next.status === "complete") {
    events.push({ event: ProductEvent.ONBOARDING_COMPLETED, step: next.step });
  }
  return events;
}

type Subscription = {
  plan: string;
  interval: string;
  offerKey: string;
  provider: string;
  status: string;
  cancelAtPeriodEnd: boolean;
};

const LIVE_SUBSCRIPTION = new Set(["active", "trialing", "past_due"]);

/**
 * Subscription events for a billing projection, by comparing the previous
 * and next canonical subscription. Repeated projections with no change send
 * nothing.
 */
export function subscriptionTransitionEvents(
  previous: Subscription | null,
  next: Subscription,
): ProductEvent[] {
  const wasLive = previous ? LIVE_SUBSCRIPTION.has(previous.status) : false;
  const isLive = LIVE_SUBSCRIPTION.has(next.status);
  if (!wasLive && isLive) return [ProductEvent.SUBSCRIPTION_STARTED];
  if (wasLive && !isLive) return [ProductEvent.SUBSCRIPTION_ENDED];
  if (!previous || !isLive) return [];
  const events: ProductEvent[] = [];
  if (previous.offerKey !== next.offerKey)
    events.push(ProductEvent.SUBSCRIPTION_SWITCHED);
  if (!previous.cancelAtPeriodEnd && next.cancelAtPeriodEnd) {
    events.push(ProductEvent.SUBSCRIPTION_CANCELLED);
  }
  if (previous.cancelAtPeriodEnd && !next.cancelAtPeriodEnd) {
    events.push(ProductEvent.SUBSCRIPTION_RESUMED);
  }
  return events;
}
