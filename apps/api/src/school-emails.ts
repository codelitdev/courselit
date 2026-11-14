import { type Clock, uuidv7 } from "@codelitdev/platform";
import { and, count, eq, gte } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { schoolSiteUrl } from "./membership-events.js";
import {
  lastKnownPlan,
  planIncludesFeature,
  REMOVE_BRANDING_FEATURE,
} from "./school-plan.js";
import { courseLitBadgeUrl } from "./storefront-plan.js";
import { escapeHtml, type MailStream } from "./system-mail.js";
import type { AppDb } from "./types.js";

/** An email a school sends to one person: notifications, access grants and
 * lead-magnet deliveries. Delivered by the worker through the school's
 * mailing team, so a slow or unavailable mailing service never fails the
 * request that caused the email. */
export type SendSchoolEmailPayload = {
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
  /** Which platform team sends it; set by `queueSchoolEmail`. */
  stream?: MailStream;
};

/**
 * Daily caps per school on platform mail (docs/wip/plan-limits.md, S14 and
 * S22). Notifications have their own budget, so a busy community can never
 * use up the allowance that receipts and access emails need.
 */
export const PLATFORM_MAIL_DAILY_CAPS: Record<
  "transactional" | "notifications",
  Record<"trial" | "pro" | "business", number>
> = {
  transactional: { trial: 200, pro: 2_000, business: 10_000 },
  notifications: { trial: 500, pro: 5_000, business: 25_000 },
};

/**
 * The cap tier from the school's last confirmed plan (`schools.last_plan`), so
 * queueing an email never waits on billing. Anything not known to be paid
 * gets the smallest cap. `null` is uncapped (self-hosted).
 */
export function platformMailTier(lastPlan: unknown): "trial" | "pro" | "business" | null {
  if (process.env.BILLING_MODE === "oss") return null;
  const plan = lastPlan as { kind?: string; plan?: string } | null;
  if (plan?.kind === "oss") return null;
  if (plan?.kind === "paid" && (plan.plan === "pro" || plan.plan === "business")) {
    return plan.plan;
  }
  return "trial";
}

/**
 * Whether learner mail from a school carries the "Powered by CourseLit"
 * badge: always, unless the school hid it and its plan includes
 * `remove_branding`. Read from the cached `last_plan`, as mail is queued
 * outside any request that could ask billing.
 */
export function emailShowsCourseLitBadge(school: {
  hideCourseLitBranding: boolean;
  lastPlan: unknown;
}): boolean {
  if (!school.hideCourseLitBranding) return true;
  if (process.env.BILLING_MODE === "oss") return false;
  const plan = lastKnownPlan({ kind: "unknown" }, school.lastPlan);
  return !planIncludesFeature(plan, REMOVE_BRANDING_FEATURE);
}

/** Adds the badge at the end of a rendered email. */
export function withCourseLitBadge(
  email: { html: string; text: string },
  subdomain: string,
): { html: string; text: string } {
  const url = escapeHtml(courseLitBadgeUrl(subdomain));
  const badge = `<p style="margin:24px 0 0;font-size:12px;color:#6b7280;text-align:center">Powered by <a href="${url}" rel="nofollow" style="color:#6b7280;font-weight:bold">CourseLit</a></p>`;
  const html = email.html.includes("</div></body>")
    ? email.html.replace(
        /<\/div><\/body>(?![\s\S]*<\/div><\/body>)/,
        `${badge}</div></body>`,
      )
    : `${email.html}${badge}`;
  return {
    html,
    text: `${email.text}\n\nPowered by CourseLit: ${courseLitBadgeUrl(subdomain)}`,
  };
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

type EmailBody = {
  schoolName: string;
  paragraphs: string[];
  /** A one-time code, shown large under the paragraphs. */
  code?: string;
  button?: { label: string; url: string };
  /** Small print under the button, e.g. where to change email settings. */
  footer?: { text: string; link?: { label: string; url: string } };
};

export function renderSchoolEmail(body: EmailBody): { html: string; text: string } {
  const paragraphs = body.paragraphs
    .map(
      (paragraph) =>
        `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#111827">${escapeHtml(paragraph)}</p>`,
    )
    .join("");
  const code = body.code
    ? `<div style="margin:8px 0 24px"><span style="display:inline-block;padding:12px 20px;background:#f3f4f6;border-radius:8px;font-size:32px;font-weight:700;letter-spacing:6px;color:#111827">${escapeHtml(body.code)}</span></div>`
    : "";
  const button = body.button
    ? `<p style="margin:24px 0 32px"><a href="${escapeHtml(body.button.url)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-weight:600;padding:10px 18px;border-radius:6px">${escapeHtml(body.button.label)}</a></p>`
    : "";
  const footer = body.footer
    ? `<p style="margin:32px 0 0;font-size:12px;line-height:1.5;color:#6b7280">${escapeHtml(body.footer.text)}${
        body.footer.link
          ? ` <a href="${escapeHtml(body.footer.link.url)}" style="color:#6b7280">${escapeHtml(body.footer.link.label)}</a>`
          : ""
      }</p>`
    : "";
  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#ffffff;font-family:Arial,sans-serif"><div style="max-width:560px;margin:0 auto">${paragraphs}${code}${button}<p style="margin:0;font-size:14px;color:#374151">${escapeHtml(body.schoolName)}</p>${footer}</div></body></html>`;

  const text = [
    ...body.paragraphs,
    ...(body.code ? [body.code] : []),
    ...(body.button ? [`${body.button.label}: ${body.button.url}`] : []),
    body.schoolName,
    ...(body.footer
      ? [
          body.footer.link
            ? `${body.footer.text} ${body.footer.link.label}: ${body.footer.link.url}`
            : body.footer.text,
        ]
      : []),
  ].join("\n\n");
  return { html, text };
}

/** Who delivers a school's email: its own mailing team, or the platform's
 * default sender when the school has no working mailing team. */
export type SchoolEmailSender = "school" | "platform";

export async function schoolEmailSender(
  db: AppDb,
  schoolId: string,
): Promise<{ sender: SchoolEmailSender; integrationStatus: string | null }> {
  const [integration] = await db
    .select({ status: schema.schoolIntegrations.status })
    .from(schema.schoolIntegrations)
    .where(
      and(
        eq(schema.schoolIntegrations.schoolId, schoolId),
        eq(schema.schoolIntegrations.provider, "sendlit"),
      ),
    )
    .limit(1);
  // A team still being provisioned will be ready shortly; its jobs wait.
  // One that needs attention may never be, so its email goes out through the
  // platform instead of piling up.
  const usable =
    integration &&
    (integration.status === "ready" ||
      integration.status === "pending" ||
      integration.status === "provisioning");
  return {
    sender: usable ? "school" : "platform",
    integrationStatus: integration?.status ?? null,
  };
}

/**
 * Queues one email to a learner or the school's owner. It always goes through
 * the platform's own SendLit teams, never the school's: no school quota can
 * block sign-in codes or receipts, and the school's team carries marketing
 * only (docs/wip/plan-limits.md, section 6).
 *
 * The subject names the school, because the sender is the platform until
 * SendLit can set a sender name per message. Transactional mail over the
 * school's daily cap waits for the next UTC day; notifications over theirs
 * are skipped and stay in-app.
 */
export async function queueSchoolEmail(
  db: AppDb,
  schoolId: string,
  payload: SendSchoolEmailPayload,
  clock: Clock,
  stream: MailStream = "transactional",
): Promise<"queued" | "deferred" | "skipped"> {
  const now = clock.now();
  const [school] = await db
    .select({
      name: schema.schools.name,
      subdomain: schema.schools.subdomain,
      lastPlan: schema.schools.lastPlan,
      hideCourseLitBranding: schema.schools.hideCourseLitBranding,
    })
    .from(schema.schools)
    .where(eq(schema.schools.id, schoolId))
    .limit(1);
  if (!school) return "skipped";

  let nextAttemptAt = now;
  if (stream === "transactional" || stream === "notifications") {
    const tier = platformMailTier(school.lastPlan);
    if (tier) {
      const cap = PLATFORM_MAIL_DAILY_CAPS[stream][tier];
      const dayStart = startOfUtcDay(now);
      const [row] = await db
        .select({ count: count() })
        .from(schema.rateLimitEvents)
        .where(
          and(
            eq(schema.rateLimitEvents.schoolId, schoolId),
            eq(schema.rateLimitEvents.scope, "platform_mail"),
            eq(schema.rateLimitEvents.action, stream),
            gte(schema.rateLimitEvents.createdAt, dayStart),
          ),
        );
      const used = Number(row?.count ?? 0);
      if (used >= cap) {
        if (stream === "notifications") return "skipped";
        nextAttemptAt = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      }
      if (used + 1 === Math.ceil(cap * 0.8)) {
        console.warn(
          JSON.stringify({ msg: "platform mail cap at 80%", schoolId, stream, cap }),
        );
      }
      await db.insert(schema.rateLimitEvents).values({
        id: uuidv7(clock),
        schoolId,
        userId: "system",
        scope: "platform_mail",
        action: stream,
        subjectId: schoolId,
        fingerprint: null,
        createdAt: now,
      });
    }
  }

  const schoolName = school.name.replace(/[\r\n]+/g, " ").trim();
  const subject = payload.subject.includes(schoolName)
    ? payload.subject
    : `${payload.subject} | ${schoolName}`;
  // Staff mail (team invites, owner notices) is CourseLit's own and is
  // branded on every plan; learner mail carries the badge (section 4).
  const body =
    stream !== "staff" && emailShowsCourseLitBadge(school)
      ? withCourseLitBadge({ html: payload.html, text: payload.text }, school.subdomain)
      : { html: payload.html, text: payload.text };
  await db.insert(schema.integrationOutboxJobs).values({
    id: uuidv7(clock),
    schoolId,
    provider: "system",
    type: "send_system_email",
    payload: { ...payload, ...body, subject, stream },
    status: "pending",
    attempts: 0,
    revision: 1,
    nextAttemptAt,
    createdAt: now,
    updatedAt: now,
  });
  return nextAttemptAt > now ? "deferred" : "queued";
}

/** The admin app's origin, where staff notification links point. */
export function adminSiteUrl(): string {
  return (process.env.WEB_ORIGIN ?? "http://localhost:3000").replace(/\/+$/, "");
}

function absoluteUrl(origin: string, href: string): string {
  if (/^https?:\/\//i.test(href)) return href;
  return `${origin}${href.startsWith("/") ? "" : "/"}${href}`;
}

async function loadSchoolName(db: AppDb, schoolId: string): Promise<string | null> {
  const [school] = await db
    .select({ name: schema.schools.name })
    .from(schema.schools)
    .where(eq(schema.schools.id, schoolId))
    .limit(1);
  return school?.name ?? null;
}

async function loadRecipient(db: AppDb, schoolId: string, schoolAccountId: string) {
  const [account] = await db
    .select({
      email: schema.schoolAccounts.email,
      status: schema.schoolAccounts.status,
    })
    .from(schema.schoolAccounts)
    .where(
      and(
        eq(schema.schoolAccounts.id, schoolAccountId),
        eq(schema.schoolAccounts.schoolId, schoolId),
      ),
    )
    .limit(1);
  if (!account || account.status === "deletion_pending") return null;
  return account;
}

/** Emails a notification to its recipient. Callers check the recipient's
 * email preference first. */
export async function queueNotificationEmail(
  db: AppDb,
  input: {
    schoolId: string;
    schoolAccountId: string;
    audience: "learner" | "admin";
    notificationId: string;
    title: string;
    body: string;
    href: string | null;
  },
  clock: Clock,
): Promise<void> {
  const recipient = await loadRecipient(db, input.schoolId, input.schoolAccountId);
  const schoolName = await loadSchoolName(db, input.schoolId);
  if (!recipient || !schoolName) return;
  const origin =
    input.audience === "admin"
      ? adminSiteUrl()
      : await schoolSiteUrl(db, input.schoolId);
  if (!origin) return;

  const settingsUrl =
    input.audience === "admin"
      ? `${origin}/settings/notifications`
      : `${origin}/dashboard/account/notifications`;
  const rendered = renderSchoolEmail({
    schoolName,
    paragraphs: [input.body],
    button: input.href
      ? { label: "View notification", url: absoluteUrl(origin, input.href) }
      : undefined,
    footer: {
      text: "You're receiving this because of your notification settings.",
      link: { label: "Manage notification emails", url: settingsUrl },
    },
  });
  await queueSchoolEmail(
    db,
    input.schoolId,
    {
      to: recipient.email,
      subject: input.title,
      ...rendered,
      idempotencyKey: `notification:${input.notificationId}`,
    },
    clock,
    input.audience === "admin" ? "staff" : "notifications",
  );
}

async function loadProduct(db: AppDb, schoolId: string, productPublicId: string) {
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
  return product ?? null;
}

/** Tells a learner a creator gave them access to a product. */
export async function queueAccessGrantedEmail(
  db: AppDb,
  input: { schoolId: string; schoolAccountId: string; productPublicId: string },
  clock: Clock,
): Promise<void> {
  const recipient = await loadRecipient(db, input.schoolId, input.schoolAccountId);
  const product = await loadProduct(db, input.schoolId, input.productPublicId);
  const schoolName = await loadSchoolName(db, input.schoolId);
  const origin = await schoolSiteUrl(db, input.schoolId);
  if (!recipient || !product || !schoolName || !origin) return;

  const rendered = renderSchoolEmail({
    schoolName,
    paragraphs: [`You have been given access to ${product.title}.`],
    button: {
      label: "Sign in to get started",
      url: `${origin}/dashboard/courses/${encodeURIComponent(product.publicId)}`,
    },
  });
  await queueSchoolEmail(
    db,
    input.schoolId,
    {
      to: recipient.email,
      subject: `You have been invited to ${product.title}`,
      ...rendered,
      idempotencyKey: `access:${input.schoolAccountId}:${product.publicId}:${clock.now().getTime()}`,
    },
    clock,
  );
}

/** Delivers a free lead-magnet product to the person who signed up for it. */
export async function queueLeadMagnetEmail(
  db: AppDb,
  input: { schoolId: string; schoolAccountId: string; productPublicId: string },
  clock: Clock,
): Promise<void> {
  const recipient = await loadRecipient(db, input.schoolId, input.schoolAccountId);
  const product = await loadProduct(db, input.schoolId, input.productPublicId);
  const schoolName = await loadSchoolName(db, input.schoolId);
  const origin = await schoolSiteUrl(db, input.schoolId);
  if (!recipient || !product || !schoolName || !origin) return;

  const rendered = renderSchoolEmail({
    schoolName,
    paragraphs: [
      `Thank you for signing up for ${product.title}.`,
      "Sign in with this email address to access it any time.",
    ],
    button: {
      label: product.kind === "download" ? "Download now" : "Start learning",
      url: `${origin}/dashboard/courses/${encodeURIComponent(product.publicId)}`,
    },
  });
  await queueSchoolEmail(
    db,
    input.schoolId,
    {
      to: recipient.email,
      subject: `Thank you for signing up for ${product.title}`,
      ...rendered,
      idempotencyKey: `lead:${input.schoolAccountId}:${product.publicId}:${clock.now().getTime()}`,
    },
    clock,
  );
}

/** Tells a learner a creator invited them into the school's community. */
export async function queueCommunityInviteEmail(
  db: AppDb,
  input: {
    schoolId: string;
    schoolAccountId: string;
    communityName: string;
    membershipPublicId: string;
  },
  clock: Clock,
): Promise<void> {
  const recipient = await loadRecipient(db, input.schoolId, input.schoolAccountId);
  const schoolName = await loadSchoolName(db, input.schoolId);
  const origin = await schoolSiteUrl(db, input.schoolId);
  if (!recipient || !schoolName || !origin) return;

  const rendered = renderSchoolEmail({
    schoolName,
    paragraphs: [
      `You have been invited to join ${input.communityName}.`,
      "Sign in with this email address to meet the other members.",
    ],
    button: { label: "Go to the community", url: `${origin}/dashboard` },
  });
  await queueSchoolEmail(
    db,
    input.schoolId,
    {
      to: recipient.email,
      subject: `You're invited to ${input.communityName}`,
      ...rendered,
      idempotencyKey: `community-invite:${input.membershipPublicId}:${clock.now().getTime()}`,
    },
    clock,
  );
}
