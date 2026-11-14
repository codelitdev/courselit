import { createPlatformError, type PlatformError } from "@codelitdev/platform";
import { and, desc, eq, inArray, lt, notLike, or, type SQL } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import type { AppDb } from "./types.js";

export type AuditEventDto = {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string;
  actor: { kind: "user" | "system"; name: string | null; email: string | null };
  createdAt: string;
};

/** A position in the newest-first list: the last event's time and id. */
export function encodeAuditCursor(row: { createdAt: Date; id: string }): string {
  return Buffer.from(`${row.createdAt.toISOString()}|${row.id}`).toString("base64url");
}

export function decodeAuditCursor(
  cursor: string,
): { createdAt: Date; id: string } | null {
  const [at, id] = Buffer.from(cursor, "base64url").toString("utf8").split("|");
  const createdAt = new Date(at ?? "");
  if (!id || Number.isNaN(createdAt.getTime()) || !/^[0-9a-f-]{36}$/i.test(id))
    return null;
  return { createdAt, id };
}

/**
 * A school's audit log, newest first (docs/wip/plan-limits.md, section 4).
 * `billing.*` events are included only when `includeBilling` is set: for the
 * owner in a browser session, never for API keys, OAuth or MCP (S9, S30).
 */
export async function listAuditEvents(
  db: AppDb,
  input: { schoolId: string; cursor?: string; limit: number; includeBilling: boolean },
): Promise<
  | { ok: true; value: { items: AuditEventDto[]; nextCursor: string | null } }
  | { ok: false; error: PlatformError }
> {
  const conditions: SQL[] = [eq(schema.auditEvents.schoolId, input.schoolId)];
  if (!input.includeBilling)
    conditions.push(notLike(schema.auditEvents.action, "billing.%"));
  if (input.cursor) {
    const after = decodeAuditCursor(input.cursor);
    if (!after) return { ok: false, error: createPlatformError("validation_failed") };
    conditions.push(
      or(
        lt(schema.auditEvents.createdAt, after.createdAt),
        and(
          eq(schema.auditEvents.createdAt, after.createdAt),
          lt(schema.auditEvents.id, after.id),
        ),
      )!,
    );
  }
  const rows = await db
    .select()
    .from(schema.auditEvents)
    .where(and(...conditions))
    .orderBy(desc(schema.auditEvents.createdAt), desc(schema.auditEvents.id))
    .limit(input.limit + 1);
  const page = rows.slice(0, input.limit);

  const userIds = [
    ...new Set(page.map((row) => row.actorId).filter((id) => !id.startsWith("system"))),
  ];
  const users = userIds.length
    ? await db
        .select({
          id: schema.user.id,
          name: schema.user.name,
          email: schema.user.email,
        })
        .from(schema.user)
        .where(inArray(schema.user.id, userIds))
    : [];
  const byId = new Map(users.map((user) => [user.id, user]));

  return {
    ok: true,
    value: {
      items: page.map((row) => {
        const user = byId.get(row.actorId);
        return {
          id: row.id,
          action: row.action,
          resourceType: row.resourceType,
          resourceId: row.resourceId,
          actor: row.actorId.startsWith("system")
            ? { kind: "system" as const, name: null, email: null }
            : {
                kind: "user" as const,
                name: user?.name || null,
                email: user?.email ?? null,
              },
          createdAt: row.createdAt.toISOString(),
        };
      }),
      nextCursor:
        rows.length > input.limit && page.length
          ? encodeAuditCursor(page[page.length - 1]!)
          : null,
    },
  };
}
