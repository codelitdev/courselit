import { createPlatformError, serializeDate } from "@codelitdev/platform";
import type { ProductCustomer, ProductCustomerProgress } from "@courselit/api-contract";
import { and, asc, desc, eq, inArray, isNotNull } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import type { CourseLitPermission } from "./permissions.js";
import type { AppDb } from "./types.js";

type Context = {
  tenantId?: string | null;
  permissions: ReadonlySet<CourseLitPermission>;
};

type Membership = typeof schema.learnerMemberships.$inferSelect;
type SchoolAccount = typeof schema.schoolAccounts.$inferSelect;

function membershipRank(membership: Membership) {
  const statusRank = {
    active: 5,
    pending: 4,
    payment_failed: 3,
    paused: 2,
    expired: 1,
    rejected: 0,
  }[membership.status];
  return statusRank * 2 + (membership.isIncludedInPlan ? 0 : 1);
}

function shouldReplaceMembership(current: Membership, candidate: Membership) {
  const currentRank = membershipRank(current);
  const candidateRank = membershipRank(candidate);
  if (candidateRank !== currentRank) return candidateRank > currentRank;
  return candidate.createdAt > current.createdAt;
}

export async function listProductCustomers(
  db: AppDb,
  ctx: Context,
  input: {
    productPublicId: string;
    query?: string;
    page: number;
    limit: number;
  },
): Promise<
  | {
      ok: true;
      value: {
        items: ProductCustomer[];
        total: number;
        page: number;
        limit: number;
      };
    }
  | { ok: false; error: ReturnType<typeof createPlatformError> }
> {
  if (!ctx.tenantId || !ctx.permissions.has("products:read")) {
    return { ok: false, error: createPlatformError("forbidden") };
  }

  const products = await db
    .select({ id: schema.products.id })
    .from(schema.products)
    .where(
      and(
        eq(schema.products.schoolId, ctx.tenantId),
        eq(schema.products.publicId, input.productPublicId),
      ),
    )
    .limit(1);
  const product = products[0];
  if (!product) return { ok: false, error: createPlatformError("not_found") };

  const [lessons, memberships] = await Promise.all([
    db
      .select({ id: schema.lessons.id })
      .from(schema.lessons)
      .where(
        and(
          eq(schema.lessons.schoolId, ctx.tenantId),
          eq(schema.lessons.productId, product.id),
          eq(schema.lessons.status, "published"),
        ),
      )
      .orderBy(asc(schema.lessons.position)),
    db
      .select({ membership: schema.learnerMemberships, account: schema.schoolAccounts })
      .from(schema.learnerMemberships)
      .innerJoin(
        schema.schoolAccounts,
        eq(schema.schoolAccounts.id, schema.learnerMemberships.schoolAccountId),
      )
      .where(
        and(
          eq(schema.learnerMemberships.schoolId, ctx.tenantId),
          eq(schema.learnerMemberships.entityType, "product"),
          eq(schema.learnerMemberships.entityId, input.productPublicId),
        ),
      )
      .orderBy(desc(schema.learnerMemberships.createdAt)),
  ]);

  const customers = new Map<
    string,
    { account: SchoolAccount; memberships: Membership[]; selected: Membership }
  >();
  for (const row of memberships) {
    const existing = customers.get(row.account.id);
    if (!existing) {
      customers.set(row.account.id, {
        account: row.account,
        memberships: [row.membership],
        selected: row.membership,
      });
      continue;
    }
    existing.memberships.push(row.membership);
    if (shouldReplaceMembership(existing.selected, row.membership)) {
      existing.selected = row.membership;
    }
  }

  const membershipIds = memberships.map((row) => row.membership.id);
  const completedByMembership = new Map<string, Set<string>>();
  if (membershipIds.length > 0 && lessons.length > 0) {
    const progressRows = await db
      .select({
        membershipId: schema.lessonProgress.membershipId,
        lessonId: schema.lessonProgress.lessonId,
      })
      .from(schema.lessonProgress)
      .innerJoin(schema.lessons, eq(schema.lessons.id, schema.lessonProgress.lessonId))
      .where(
        and(
          eq(schema.lessonProgress.schoolId, ctx.tenantId),
          inArray(schema.lessonProgress.membershipId, membershipIds),
          eq(schema.lessons.productId, product.id),
          isNotNull(schema.lessonProgress.completedAt),
        ),
      );
    for (const row of progressRows) {
      const completed = completedByMembership.get(row.membershipId) ?? new Set<string>();
      completed.add(row.lessonId);
      completedByMembership.set(row.membershipId, completed);
    }
  }

  const query = input.query?.trim().toLowerCase() ?? "";
  const filtered = [...customers.values()]
    .filter(({ account }) => {
      if (!query) return true;
      return (
        account.email.toLowerCase().includes(query) ||
        account.displayName.toLowerCase().includes(query)
      );
    })
    .sort((left, right) => {
      const leftName = left.account.displayName || left.account.email;
      const rightName = right.account.displayName || right.account.email;
      return leftName.localeCompare(rightName);
    });

  const total = filtered.length;
  const start = (input.page - 1) * input.limit;
  const page = filtered.slice(start, start + input.limit);
  const totalLessons = lessons.length;

  return {
    ok: true,
    value: {
      total,
      page: input.page,
      limit: input.limit,
      items: page.map(({ account, memberships: accountMemberships, selected }) => {
        const completedLessonIds = new Set<string>();
        for (const membership of accountMemberships) {
          for (const lessonId of completedByMembership.get(membership.id) ?? []) {
            completedLessonIds.add(lessonId);
          }
        }
        const completedLessons = Math.min(completedLessonIds.size, totalLessons);
        return {
          id: account.publicId,
          membershipId: selected.publicId,
          name: account.displayName,
          email: account.email,
          avatar: account.avatar ?? null,
          accountStatus: account.status,
          membershipStatus: selected.status,
          subscriptionMethod: selected.subscriptionMethod,
          subscriptionId: selected.subscriptionId,
          signedUpAt: serializeDate(selected.createdAt),
          lastActiveAt: account.lastActiveAt ? serializeDate(account.lastActiveAt) : null,
          progress: {
            completedLessons,
            totalLessons,
            percentage:
              totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100),
          },
        };
      }),
    },
  };
}

export async function getProductCustomerProgress(
  db: AppDb,
  ctx: Context,
  input: {
    productPublicId: string;
    customerPublicId: string;
  },
): Promise<
  | { ok: true; value: ProductCustomerProgress }
  | { ok: false; error: ReturnType<typeof createPlatformError> }
> {
  if (!ctx.tenantId || !ctx.permissions.has("products:read")) {
    return { ok: false, error: createPlatformError("forbidden") };
  }

  const products = await db
    .select({ id: schema.products.id })
    .from(schema.products)
    .where(
      and(
        eq(schema.products.schoolId, ctx.tenantId),
        eq(schema.products.publicId, input.productPublicId),
      ),
    )
    .limit(1);
  const product = products[0];
  if (!product) return { ok: false, error: createPlatformError("not_found") };

  const [lessons, membershipRows] = await Promise.all([
    db
      .select({
        id: schema.lessons.id,
        publicId: schema.lessons.publicId,
        title: schema.lessons.title,
        position: schema.lessons.position,
      })
      .from(schema.lessons)
      .where(
        and(
          eq(schema.lessons.schoolId, ctx.tenantId),
          eq(schema.lessons.productId, product.id),
          eq(schema.lessons.status, "published"),
        ),
      )
      .orderBy(asc(schema.lessons.position)),
    db
      .select({ membership: schema.learnerMemberships, account: schema.schoolAccounts })
      .from(schema.learnerMemberships)
      .innerJoin(
        schema.schoolAccounts,
        eq(schema.schoolAccounts.id, schema.learnerMemberships.schoolAccountId),
      )
      .where(
        and(
          eq(schema.learnerMemberships.schoolId, ctx.tenantId),
          eq(schema.learnerMemberships.entityType, "product"),
          eq(schema.learnerMemberships.entityId, input.productPublicId),
          eq(schema.schoolAccounts.publicId, input.customerPublicId),
        ),
      )
      .orderBy(desc(schema.learnerMemberships.createdAt)),
  ]);

  const firstMembership = membershipRows[0];
  if (!firstMembership) {
    return { ok: false, error: createPlatformError("not_found") };
  }

  const membershipIds = membershipRows.map(({ membership }) => membership.id);
  const completedAtByLesson = new Map<string, Date>();
  if (membershipIds.length > 0 && lessons.length > 0) {
    const progressRows = await db
      .select({
        lessonId: schema.lessonProgress.lessonId,
        completedAt: schema.lessonProgress.completedAt,
      })
      .from(schema.lessonProgress)
      .where(
        and(
          eq(schema.lessonProgress.schoolId, ctx.tenantId),
          inArray(schema.lessonProgress.membershipId, membershipIds),
          inArray(
            schema.lessonProgress.lessonId,
            lessons.map((lesson) => lesson.id),
          ),
          isNotNull(schema.lessonProgress.completedAt),
        ),
      );
    for (const row of progressRows) {
      if (!row.completedAt) continue;
      const current = completedAtByLesson.get(row.lessonId);
      if (!current || row.completedAt > current) {
        completedAtByLesson.set(row.lessonId, row.completedAt);
      }
    }
  }

  return {
    ok: true,
    value: {
      customer: {
        id: firstMembership.account.publicId,
        name: firstMembership.account.displayName,
        email: firstMembership.account.email,
        avatar: firstMembership.account.avatar ?? null,
      },
      lessons: lessons.map((lesson) => ({
        id: lesson.publicId,
        title: lesson.title,
        completed: completedAtByLesson.has(lesson.id),
        completedAt: completedAtByLesson.has(lesson.id)
          ? serializeDate(completedAtByLesson.get(lesson.id)!)
          : null,
      })),
    },
  };
}
