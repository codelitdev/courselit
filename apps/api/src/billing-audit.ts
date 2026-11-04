import type { AuditRecord } from "@codelitdev/billing/workflows";
import { type Clock, uuidv7 } from "@codelitdev/platform";
import { eq } from "drizzle-orm";
import * as billingSchema from "./db/schema/billing.generated.js";
import * as schema from "./db/schema/index.js";
import type { AppDb } from "./types.js";

type Client = Pick<AppDb, "select" | "insert">;

/**
 * Finds the school an audit record belongs to. The engine only guarantees
 * row ids in `correlationIds`, so older rows are resolved through the
 * subscription, checkout and plan change tables.
 */
async function schoolIdFor(client: Client, event: AuditRecord): Promise<string | null> {
  const ids = event.correlationIds;
  if (ids.billableEntityId) return ids.billableEntityId;
  const next = event.next as { billableEntityId?: unknown } | null;
  if (typeof next?.billableEntityId === "string") return next.billableEntityId;
  if (ids.subscriptionId) {
    const [row] = await client
      .select({ id: billingSchema.billingSubscriptions.billableEntityId })
      .from(billingSchema.billingSubscriptions)
      .where(eq(billingSchema.billingSubscriptions.id, ids.subscriptionId))
      .limit(1);
    if (row) return row.id;
  }
  const checkoutId = ids.checkoutAttemptId ?? ids.attemptId;
  if (checkoutId) {
    const [row] = await client
      .select({ id: billingSchema.billingCheckoutAttempts.billableEntityId })
      .from(billingSchema.billingCheckoutAttempts)
      .where(
        ids.checkoutAttemptId
          ? eq(billingSchema.billingCheckoutAttempts.id, checkoutId)
          : eq(billingSchema.billingCheckoutAttempts.attemptId, checkoutId),
      )
      .limit(1);
    if (row) return row.id;
  }
  const changeId = ids.planChangeAttemptId ?? ids.changeId;
  if (changeId) {
    const [row] = await client
      .select({ id: billingSchema.billingPlanChangeAttempts.billableEntityId })
      .from(billingSchema.billingPlanChangeAttempts)
      .where(
        ids.planChangeAttemptId
          ? eq(billingSchema.billingPlanChangeAttempts.id, changeId)
          : eq(billingSchema.billingPlanChangeAttempts.changeId, changeId),
      )
      .limit(1);
    if (row) return row.id;
  }
  return null;
}

/**
 * Persists billing audit records to `audit_events`. It writes through the
 * engine's transaction when there is one, so a record commits or rolls back
 * with the state change it describes.
 */
export function createBillingAuditHook(options: {
  db: AppDb;
  clock: Clock;
  getTransaction: () => unknown;
}) {
  return {
    async record(event: AuditRecord): Promise<void> {
      const client = (options.getTransaction() ?? options.db) as Client;
      const schoolId = await schoolIdFor(client, event);
      if (!schoolId) return;
      await client.insert(schema.auditEvents).values({
        id: uuidv7(options.clock),
        schoolId,
        actorId: event.actor.kind === "user" ? event.actor.id : `${event.actor.kind}:${event.actor.id}`,
        action: `billing.${event.effectId.split(":")[0] || "effect"}`,
        resourceType: "billing",
        resourceId: event.effectId,
        requestId: event.effectId,
        createdAt: options.clock.now(),
      });
    },
  };
}
