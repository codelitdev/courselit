import {
  type Clock,
  createPlatformError,
  type PlatformError,
  type PlatformRequestContext,
  serializeDate,
  uuidv7,
} from "@codelitdev/platform";
import type { SectionDripEmail } from "@courselit/api-contract";
import { and, asc, eq, inArray } from "drizzle-orm";
import type { Logger } from "pino";
import { sectionUnlockAt } from "./catalog.js";
import * as schema from "./db/schema/index.js";
import type { CourseLitPermission } from "./permissions.js";
import {
  type SendLitConfig,
  sendLitConfig,
  sendSendLitTransactionalEmail,
} from "./sendlit-client.js";
import { getSendLitAuthForSchool } from "./sendlit-service.js";
import type { AppDb } from "./types.js";

type Ctx = PlatformRequestContext<string, string, CourseLitPermission>;
type Result<T> = { ok: true; value: T } | { ok: false; error: PlatformError };

async function loadSection(db: AppDb, schoolId: string, sectionPublicId: string) {
  const [section] = await db
    .select()
    .from(schema.productSections)
    .where(
      and(
        eq(schema.productSections.schoolId, schoolId),
        eq(schema.productSections.publicId, sectionPublicId),
      ),
    )
    .limit(1);
  return section ?? null;
}

function toDto(
  sectionPublicId: string,
  row: typeof schema.sectionDripEmails.$inferSelect | null,
): SectionDripEmail {
  return {
    sectionId: sectionPublicId,
    enabled: row?.enabled ?? false,
    subject: row?.subject ?? "",
    content: row?.content ?? null,
    updatedAt: row ? serializeDate(row.updatedAt) : null,
  };
}

export async function getSectionDripEmail(
  db: AppDb,
  ctx: Ctx,
  sectionPublicId: string,
): Promise<Result<SectionDripEmail>> {
  if (!ctx.permissions.has("products:read") || !ctx.tenantId) {
    return { ok: false, error: createPlatformError("forbidden") };
  }
  const section = await loadSection(db, ctx.tenantId, sectionPublicId);
  if (!section) return { ok: false, error: createPlatformError("not_found") };
  const [row] = await db
    .select()
    .from(schema.sectionDripEmails)
    .where(eq(schema.sectionDripEmails.sectionId, section.id))
    .limit(1);
  return { ok: true, value: toDto(section.publicId, row ?? null) };
}

export async function updateSectionDripEmail(
  db: AppDb,
  ctx: Ctx,
  sectionPublicId: string,
  input: {
    enabled?: boolean;
    subject?: string;
    content?: Record<string, unknown> | null;
    html?: string | null;
  },
  clock: Clock,
): Promise<Result<SectionDripEmail>> {
  if (!ctx.permissions.has("products:write") || !ctx.tenantId) {
    return { ok: false, error: createPlatformError("forbidden") };
  }
  const section = await loadSection(db, ctx.tenantId, sectionPublicId);
  if (!section) return { ok: false, error: createPlatformError("not_found") };
  const [existing] = await db
    .select()
    .from(schema.sectionDripEmails)
    .where(eq(schema.sectionDripEmails.sectionId, section.id))
    .limit(1);

  const now = clock.now();
  const next = {
    enabled: input.enabled ?? existing?.enabled ?? false,
    subject:
      input.subject !== undefined ? input.subject.trim() : (existing?.subject ?? ""),
    content: input.content !== undefined ? input.content : (existing?.content ?? null),
    html: input.html !== undefined ? input.html : (existing?.html ?? null),
  };
  if (next.enabled && (!next.subject || !next.html)) {
    return {
      ok: false,
      error: createPlatformError("validation_failed", {
        safeDetails: {
          reason: "Add a subject and content before turning on the email.",
        },
      }),
    };
  }
  const enabledAt = next.enabled
    ? existing?.enabled
      ? (existing.enabledAt ?? now)
      : now
    : null;

  const values = { ...next, enabledAt, updatedAt: now };
  let row: typeof schema.sectionDripEmails.$inferSelect;
  if (existing) {
    await db
      .update(schema.sectionDripEmails)
      .set(values)
      .where(eq(schema.sectionDripEmails.sectionId, section.id));
    row = { ...existing, ...values };
  } else {
    row = {
      sectionId: section.id,
      schoolId: ctx.tenantId,
      ...values,
      createdAt: now,
    };
    await db.insert(schema.sectionDripEmails).values(row);
  }
  await db.insert(schema.auditEvents).values({
    id: uuidv7(clock),
    schoolId: ctx.tenantId,
    actorId: ctx.principalId,
    action: "section.drip_email_updated",
    resourceType: "product_section",
    resourceId: section.publicId,
    requestId: ctx.requestId,
    createdAt: now,
  });
  return { ok: true, value: toDto(section.publicId, row) };
}

/**
 * Emails learners whose dripped section has unlocked. Each learner gets a
 * section's email at most once, and only for unlocks after the email was
 * turned on. Sent as a transactional email from the school's mailing team,
 * since it is part of the course the learner has access to.
 */
export async function processDripEmails(
  db: AppDb,
  clock: Clock,
  options: {
    logger?: Pick<Logger, "warn">;
    config?: SendLitConfig;
    limit?: number;
    sendEmail?: typeof sendSendLitTransactionalEmail;
  } = {},
): Promise<number> {
  const now = clock.now();
  const config = options.config ?? sendLitConfig();
  if (!config.server) return 0;
  const limit = options.limit ?? 200;
  const sendEmail = options.sendEmail ?? sendSendLitTransactionalEmail;

  const emails = await db
    .select({ email: schema.sectionDripEmails, section: schema.productSections })
    .from(schema.sectionDripEmails)
    .innerJoin(
      schema.productSections,
      eq(schema.productSections.id, schema.sectionDripEmails.sectionId),
    )
    .where(
      and(
        eq(schema.sectionDripEmails.enabled, true),
        eq(schema.productSections.dripEnabled, true),
      ),
    );

  let sent = 0;
  const sectionsByProduct = new Map<
    string,
    (typeof schema.productSections.$inferSelect)[]
  >();
  for (const { email, section } of emails) {
    if (sent >= limit) break;
    if (!email.html || !email.subject || !email.enabledAt) continue;

    let productSections = sectionsByProduct.get(section.productId);
    if (!productSections) {
      productSections = await db
        .select()
        .from(schema.productSections)
        .where(eq(schema.productSections.productId, section.productId))
        .orderBy(asc(schema.productSections.position));
      sectionsByProduct.set(section.productId, productSections);
    }
    const [product] = await db
      .select({ publicId: schema.products.publicId })
      .from(schema.products)
      .where(eq(schema.products.id, section.productId))
      .limit(1);
    if (!product) continue;

    const memberships = await db
      .select({ membership: schema.learnerMemberships, account: schema.schoolAccounts })
      .from(schema.learnerMemberships)
      .innerJoin(
        schema.schoolAccounts,
        eq(schema.schoolAccounts.id, schema.learnerMemberships.schoolAccountId),
      )
      .where(
        and(
          eq(schema.learnerMemberships.schoolId, section.schoolId),
          eq(schema.learnerMemberships.entityType, "product"),
          eq(schema.learnerMemberships.entityId, product.publicId),
          eq(schema.learnerMemberships.status, "active"),
        ),
      );
    if (memberships.length === 0) continue;

    const delivered = await db
      .select({ membershipId: schema.sectionDripEmailDeliveries.membershipId })
      .from(schema.sectionDripEmailDeliveries)
      .where(
        and(
          eq(schema.sectionDripEmailDeliveries.sectionId, section.id),
          inArray(
            schema.sectionDripEmailDeliveries.membershipId,
            memberships.map((row) => row.membership.id),
          ),
        ),
      );
    const deliveredIds = new Set(delivered.map((row) => row.membershipId));

    const due = memberships.filter(({ membership, account }) => {
      if (deliveredIds.has(membership.id) || account.status === "deletion_pending") {
        return false;
      }
      const unlockAt = sectionUnlockAt(
        productSections!,
        section.id,
        membership.createdAt,
      );
      return Boolean(unlockAt && unlockAt <= now && unlockAt >= email.enabledAt!);
    });
    if (due.length === 0) continue;

    const auth = await getSendLitAuthForSchool(db, section.schoolId, clock, config);
    if (!auth.ok) {
      options.logger?.warn(
        { schoolId: section.schoolId, sectionId: section.publicId },
        "drip email skipped: mailing service unavailable",
      );
      continue;
    }

    for (const { membership, account } of due) {
      if (sent >= limit) break;
      const unlockedAt = sectionUnlockAt(
        productSections,
        section.id,
        membership.createdAt,
      )!;
      // Claim the delivery first so concurrent workers never send twice.
      const claimed = await db
        .insert(schema.sectionDripEmailDeliveries)
        .values({
          id: uuidv7(clock),
          schoolId: section.schoolId,
          sectionId: section.id,
          membershipId: membership.id,
          unlockedAt,
          createdAt: now,
        })
        .onConflictDoNothing()
        .returning({ id: schema.sectionDripEmailDeliveries.id });
      if (claimed.length === 0) continue;
      try {
        await sendEmail(
          auth.value.teamApiKey,
          {
            to: account.email,
            subject: email.subject,
            html: email.html,
            idempotencyKey: `drip:${section.publicId}:${membership.publicId}`,
          },
          { config: { ...config, server: auth.value.server || config.server } },
        );
        sent += 1;
      } catch (error) {
        // Release the claim so the next run retries this learner.
        await db
          .delete(schema.sectionDripEmailDeliveries)
          .where(eq(schema.sectionDripEmailDeliveries.id, claimed[0]!.id));
        options.logger?.warn(
          {
            schoolId: section.schoolId,
            sectionId: section.publicId,
            error: error instanceof Error ? error.message : String(error),
          },
          "drip email send failed",
        );
      }
    }
  }
  return sent;
}
