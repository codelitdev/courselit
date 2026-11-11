import { type Clock, uuidv7 } from "@codelitdev/platform";
import { and, count, eq, gt } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { schoolSiteUrl } from "./membership-events.js";
import { createAdminNotification } from "./notifications.js";
import { parsePermissions } from "./permissions.js";
import { queueSchoolEmail, renderSchoolEmail } from "./school-emails.js";
import type { AppDb } from "./types.js";

/** Staff notification type for a new product purchase or paid community join. */
export const NEW_SALE_NOTIFICATION_TYPE = "new_sale";

export function formatMoney(amountMinor: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
      amountMinor / 100,
    );
  } catch {
    return `${currency} ${(amountMinor / 100).toFixed(2)}`;
  }
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(date);
}

type Purchase = {
  schoolId: string;
  schoolName: string;
  schoolAccountId: string;
  orderId: string;
  paymentPublicId: string;
  amountMinor: number;
  currency: string;
  occurredAt: Date;
  /** Later installments and subscription renewals of the same checkout. */
  renewal: boolean;
  membershipActive: boolean;
  resourceType: "product" | "community";
  resourceId: string;
  title: string;
  planName: string;
};

/** Claims the payment so its receipt and sale alert go out exactly once, no
 * matter how often the provider redelivers the webhook. */
async function claimPayment(
  tx: AppDb,
  schoolId: string,
  paymentPublicId: string,
  clock: Clock,
): Promise<boolean> {
  const claimed = await tx
    .insert(schema.paymentNotifications)
    .values({
      id: uuidv7(clock),
      schoolId,
      paymentPublicId,
      createdAt: clock.now(),
    })
    .onConflictDoNothing({ target: schema.paymentNotifications.paymentPublicId })
    .returning({ id: schema.paymentNotifications.id });
  return claimed.length > 0;
}

async function claimProductPayment(
  tx: AppDb,
  providerPaymentId: string,
  clock: Clock,
): Promise<Purchase | null> {
  const [payment] = await tx
    .select()
    .from(schema.storefrontPayments)
    .where(
      and(
        eq(schema.storefrontPayments.providerPaymentId, providerPaymentId),
        eq(schema.storefrontPayments.status, "succeeded"),
      ),
    )
    .limit(1);
  if (!payment) return null;
  const [row] = await tx
    .select({
      attempt: schema.storefrontCheckoutAttempts,
      product: schema.products,
      plan: schema.storefrontPlans,
      school: schema.schools,
      membership: schema.learnerMemberships,
    })
    .from(schema.storefrontCheckoutAttempts)
    .innerJoin(
      schema.products,
      eq(schema.products.id, schema.storefrontCheckoutAttempts.productId),
    )
    .innerJoin(
      schema.storefrontPlans,
      eq(schema.storefrontPlans.id, schema.storefrontCheckoutAttempts.planId),
    )
    .innerJoin(
      schema.schools,
      eq(schema.schools.id, schema.storefrontCheckoutAttempts.schoolId),
    )
    .leftJoin(
      schema.learnerMemberships,
      eq(schema.learnerMemberships.id, schema.storefrontCheckoutAttempts.membershipId),
    )
    .where(eq(schema.storefrontCheckoutAttempts.id, payment.checkoutId))
    .limit(1);
  if (!row) return null;
  if (!(await claimPayment(tx, row.school.id, payment.publicId, clock))) return null;
  const [payments] = await tx
    .select({ total: count() })
    .from(schema.storefrontPayments)
    .where(eq(schema.storefrontPayments.checkoutId, payment.checkoutId));
  return {
    schoolId: row.school.id,
    schoolName: row.school.name,
    schoolAccountId: row.attempt.schoolAccountId,
    orderId: row.attempt.publicId,
    paymentPublicId: payment.publicId,
    amountMinor: payment.amountMinor,
    currency: payment.currency,
    occurredAt: payment.occurredAt,
    renewal: Number(payments?.total ?? 1) > 1,
    membershipActive: row.membership?.status === "active",
    resourceType: "product",
    resourceId: row.product.publicId,
    title: row.product.title,
    planName: row.plan.name,
  };
}

async function claimCommunityPayment(
  tx: AppDb,
  providerPaymentId: string,
  clock: Clock,
): Promise<Purchase | null> {
  const [payment] = await tx
    .select()
    .from(schema.communityPayments)
    .where(
      and(
        eq(schema.communityPayments.providerPaymentId, providerPaymentId),
        eq(schema.communityPayments.status, "succeeded"),
      ),
    )
    .limit(1);
  if (!payment) return null;
  const [row] = await tx
    .select({
      attempt: schema.communityCheckoutAttempts,
      community: schema.communities,
      plan: schema.storefrontPlans,
      school: schema.schools,
      membership: schema.learnerMemberships,
    })
    .from(schema.communityCheckoutAttempts)
    .innerJoin(
      schema.communities,
      eq(schema.communities.id, schema.communityCheckoutAttempts.communityId),
    )
    .innerJoin(
      schema.storefrontPlans,
      eq(schema.storefrontPlans.id, schema.communityCheckoutAttempts.planId),
    )
    .innerJoin(
      schema.schools,
      eq(schema.schools.id, schema.communityCheckoutAttempts.schoolId),
    )
    .leftJoin(
      schema.learnerMemberships,
      eq(schema.learnerMemberships.id, schema.communityCheckoutAttempts.membershipId),
    )
    .where(eq(schema.communityCheckoutAttempts.id, payment.checkoutId))
    .limit(1);
  if (!row) return null;
  if (!(await claimPayment(tx, row.school.id, payment.publicId, clock))) return null;
  const [payments] = await tx
    .select({ total: count() })
    .from(schema.communityPayments)
    .where(eq(schema.communityPayments.checkoutId, payment.checkoutId));
  return {
    schoolId: row.school.id,
    schoolName: row.school.name,
    schoolAccountId: row.attempt.schoolAccountId,
    orderId: row.attempt.publicId,
    paymentPublicId: payment.publicId,
    amountMinor: payment.amountMinor,
    currency: payment.currency,
    occurredAt: payment.occurredAt,
    renewal: Number(payments?.total ?? 1) > 1,
    membershipActive: row.membership?.status === "active",
    resourceType: "community",
    resourceId: row.community.publicId,
    title: row.community.name,
    planName: row.plan.name,
  };
}

async function queuePurchaseReceipt(tx: AppDb, purchase: Purchase, clock: Clock) {
  const [account] = await tx
    .select({
      email: schema.schoolAccounts.email,
      status: schema.schoolAccounts.status,
    })
    .from(schema.schoolAccounts)
    .where(eq(schema.schoolAccounts.id, purchase.schoolAccountId))
    .limit(1);
  if (!account || account.status === "deletion_pending") return;
  const origin = await schoolSiteUrl(tx, purchase.schoolId);
  if (!origin) return;

  const free = purchase.amountMinor === 0;
  const amount = free ? "Free" : formatMoney(purchase.amountMinor, purchase.currency);
  const details = [
    `Item: ${purchase.title} (${purchase.planName})`,
    `Amount: ${amount}`,
    `Date: ${formatDate(purchase.occurredAt)}`,
    `Order number: ${purchase.orderId}`,
  ];
  const purchasesUrl = `${origin}/dashboard/account/purchases`;
  const resourceUrl =
    purchase.resourceType === "product"
      ? `${origin}/dashboard/courses/${encodeURIComponent(purchase.resourceId)}`
      : `${origin}/dashboard`;
  const rendered = purchase.renewal
    ? renderSchoolEmail({
        schoolName: purchase.schoolName,
        paragraphs: [
          `We received your payment for ${purchase.title}. Thank you!`,
          ...details,
        ],
        button: { label: "View your purchases", url: purchasesUrl },
      })
    : renderSchoolEmail({
        schoolName: purchase.schoolName,
        paragraphs: [
          free
            ? `You now have access to ${purchase.title}.`
            : `Thank you for your purchase from ${purchase.schoolName}. You now have access to ${purchase.title}.`,
          ...details,
        ],
        button: {
          label:
            purchase.resourceType === "product"
              ? `Open ${purchase.title}`
              : "Go to the community",
          url: resourceUrl,
        },
        footer: {
          text: "Your purchases and receipts are always in your account.",
          link: { label: "View your purchases", url: purchasesUrl },
        },
      });
  await queueSchoolEmail(
    tx,
    purchase.schoolId,
    {
      to: account.email,
      subject: purchase.renewal
        ? `Payment received for ${purchase.title}`
        : free
          ? `You're in: ${purchase.title}`
          : `Your receipt for ${purchase.title}`,
      ...rendered,
      idempotencyKey: `receipt:${purchase.paymentPublicId}`,
    },
    clock,
  );
}

/** The owner and every team member who can manage the kind of thing sold. */
async function saleAlertRecipients(
  tx: AppDb,
  schoolId: string,
  resourceType: "product" | "community",
): Promise<string[]> {
  const permission =
    resourceType === "product" ? "products:write" : "communities:write";
  const members = await tx
    .select({
      schoolAccountId: schema.memberships.schoolAccountId,
      isOwner: schema.memberships.isOwner,
      permissions: schema.memberships.permissions,
    })
    .from(schema.memberships)
    .where(eq(schema.memberships.schoolId, schoolId));
  return members
    .filter(
      (member) =>
        member.isOwner || parsePermissions(member.permissions).has(permission),
    )
    .map((member) => member.schoolAccountId);
}

async function createSaleAlerts(tx: AppDb, purchase: Purchase, clock: Clock) {
  const [buyer] = await tx
    .select({
      displayName: schema.schoolAccounts.displayName,
      email: schema.schoolAccounts.email,
    })
    .from(schema.schoolAccounts)
    .where(eq(schema.schoolAccounts.id, purchase.schoolAccountId))
    .limit(1);
  const who = buyer?.displayName?.trim() || buyer?.email || "A learner";
  const amount = formatMoney(purchase.amountMinor, purchase.currency);
  const recipients = await saleAlertRecipients(
    tx,
    purchase.schoolId,
    purchase.resourceType,
  );
  for (const schoolAccountId of recipients) {
    await createAdminNotification(
      tx,
      { schoolId: purchase.schoolId, schoolAccountId },
      {
        type: NEW_SALE_NOTIFICATION_TYPE,
        title:
          purchase.resourceType === "product"
            ? `New sale: ${purchase.title}`
            : `New paid member: ${purchase.title}`,
        body:
          purchase.resourceType === "product"
            ? `${who} bought ${purchase.title} (${purchase.planName}) for ${amount}.`
            : `${who} joined ${purchase.title} on the ${purchase.planName} plan for ${amount}.`,
        href:
          purchase.resourceType === "product"
            ? `/products/${encodeURIComponent(purchase.resourceId)}/customers`
            : "/community/memberships",
      },
      clock,
    );
  }
}

/** Staff notification type for checkouts the payment provider refused. */
export const CHECKOUT_REFUSED_NOTIFICATION_TYPE = "checkout_refused";

const PROVIDER_LABELS: Record<string, string> = {
  stripe: "Stripe",
  lemonsqueezy: "Lemon Squeezy",
  razorpay: "Razorpay",
};

/**
 * Tells the owner and everyone who manages payments that the payment
 * provider refused to start a learner's checkout, usually because the saved
 * keys are wrong or were revoked. At most one alert an hour per school,
 * however many learners try in that time.
 */
export async function notifyCheckoutRefused(
  db: AppDb,
  input: { schoolId: string; provider: string; title: string },
  clock: Clock,
) {
  const [recent] = await db
    .select({ id: schema.notifications.id })
    .from(schema.notifications)
    .where(
      and(
        eq(schema.notifications.schoolId, input.schoolId),
        eq(schema.notifications.type, CHECKOUT_REFUSED_NOTIFICATION_TYPE),
        gt(schema.notifications.createdAt, new Date(clock.now().getTime() - 60 * 60 * 1000)),
      ),
    )
    .limit(1);
  if (recent) return;
  const members = await db
    .select({
      schoolAccountId: schema.memberships.schoolAccountId,
      isOwner: schema.memberships.isOwner,
      permissions: schema.memberships.permissions,
    })
    .from(schema.memberships)
    .where(eq(schema.memberships.schoolId, input.schoolId));
  const provider = PROVIDER_LABELS[input.provider] ?? input.provider;
  for (const member of members) {
    if (!member.isOwner && !parsePermissions(member.permissions).has("commerce:manage")) {
      continue;
    }
    await createAdminNotification(
      db,
      { schoolId: input.schoolId, schoolAccountId: member.schoolAccountId },
      {
        type: CHECKOUT_REFUSED_NOTIFICATION_TYPE,
        title: `${provider} refused a checkout`,
        body: `A learner couldn't pay for ${input.title} because ${provider} refused to start the checkout. Check your ${provider} keys in the payment settings.`,
        href: "/settings/payment",
      },
      clock,
    );
  }
}

/**
 * Sends the learner's receipt and alerts the team about a sale, once per
 * payment. Call it after the payment's transaction has committed. First
 * purchases get a confirmation with a link to the item; later installments
 * and renewals get a short "payment received" receipt and no sale alert.
 * Free community joins awaiting approval get nothing here: the learner hears
 * back when they are let in.
 *
 * Delivery problems never fail the caller; the payment is already recorded.
 */
export async function notifyPaymentSucceeded(
  db: AppDb,
  input: { resourceType: "product" | "community"; providerPaymentId: string },
  clock: Clock,
): Promise<void> {
  try {
    await db.transaction(async (rawTx) => {
      const tx = rawTx as unknown as AppDb;
      const purchase =
        input.resourceType === "product"
          ? await claimProductPayment(tx, input.providerPaymentId, clock)
          : await claimCommunityPayment(tx, input.providerPaymentId, clock);
      if (!purchase) return;
      if (purchase.amountMinor === 0 && !purchase.membershipActive) return;
      await queuePurchaseReceipt(tx, purchase, clock);
      if (!purchase.renewal && purchase.amountMinor > 0) {
        await createSaleAlerts(tx, purchase, clock);
      }
    });
  } catch (error) {
    console.error("[CourseLit] Purchase notification failed", {
      resourceType: input.resourceType,
      error: error instanceof Error ? error.message : String(error),
    }); // eslint-disable-line no-console
  }
}
