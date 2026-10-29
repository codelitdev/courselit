import { type Clock, uuidv7 } from "@codelitdev/platform";
import { and, eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { schoolSiteUrl } from "./membership-events.js";
import { escapeHtml } from "./system-mail.js";
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
};

type EmailBody = {
  schoolName: string;
  paragraphs: string[];
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
  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#ffffff;font-family:Arial,sans-serif"><div style="max-width:560px;margin:0 auto">${paragraphs}${button}<p style="margin:0;font-size:14px;color:#374151">${escapeHtml(body.schoolName)}</p>${footer}</div></body></html>`;

  const text = [
    ...body.paragraphs,
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

export async function queueSchoolEmail(
  db: AppDb,
  schoolId: string,
  payload: SendSchoolEmailPayload,
  clock: Clock,
): Promise<boolean> {
  // Schools without a mailing integration have no way to send email.
  const [integration] = await db
    .select({ id: schema.schoolIntegrations.id })
    .from(schema.schoolIntegrations)
    .where(
      and(
        eq(schema.schoolIntegrations.schoolId, schoolId),
        eq(schema.schoolIntegrations.provider, "sendlit"),
      ),
    )
    .limit(1);
  if (!integration) return false;

  const now = clock.now();
  await db.insert(schema.integrationOutboxJobs).values({
    id: uuidv7(clock),
    schoolId,
    provider: "sendlit",
    type: "send_school_email",
    payload,
    status: "pending",
    attempts: 0,
    revision: 1,
    nextAttemptAt: now,
    createdAt: now,
    updatedAt: now,
  });
  return true;
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
