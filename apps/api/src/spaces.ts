import {
  type Clock,
  createPlatformError,
  createPublicId,
  type PlatformError,
  type PlatformRequestContext,
  serializeDate,
  uuidv7,
} from "@codelitdev/platform";
import type { MediaRef } from "@courselit/api-contract";
import { and, asc, desc, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";
import {
  type CommunityLearnerViewer,
  createReport,
  type LearnerSpaceFeedPostDto,
  listReports,
  mapLearnerSpaceFeedPosts,
} from "./communities.js";
import * as schema from "./db/schema/index.js";
import { upsertLearnerMembership } from "./learner-memberships.js";
import {
  mediaIdsForRichTextContent,
  reconcileMediaReferencesInTransaction,
} from "./media.js";
import type { CourseLitPermission } from "./permissions.js";
import { accessibleSpaceIds } from "./space-access.js";
import type { AppDb } from "./types.js";

type AdminContext = PlatformRequestContext<string, string, CourseLitPermission>;
type Result<T> = { ok: true; value: T } | { ok: false; error: PlatformError };

export type SpaceUnlockInput = {
  entityType: "community" | "product";
  entityId?: string;
  planIds?: string[];
};

export type SpaceDto = {
  id: string;
  name: string;
  slug: string;
  description: string;
  logo: string;
  featuredImage: MediaRef | null;
  follow: boolean;
  whoCanPost: "members" | "admin";
  position: number;
  unlocks: Array<{
    entityType: "community" | "product";
    entityId: string;
    planIds: string[];
  }>;
  canPost?: boolean;
  followed?: boolean;
  createdAt: string;
  updatedAt: string;
};

function notFound(): Result<never> {
  return { ok: false, error: createPlatformError("not_found") };
}

function forbidden(): Result<never> {
  return { ok: false, error: createPlatformError("forbidden") };
}

function validation(reason: string): Result<never> {
  return {
    ok: false,
    error: createPlatformError("validation_failed", { safeDetails: { reason } }),
  };
}

export function canManageSpaces(context: AdminContext): boolean {
  return context.permissions.has("communities:write");
}

export function canModerateSpaces(context: AdminContext): boolean {
  return context.permissions.has("communities:moderate");
}

function slugify(name: string, publicId: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120)
    .replace(/-$/g, "");
  return slug || `space-${publicId.slice(-8).toLowerCase()}`;
}

async function uniqueSlug(
  db: AppDb,
  schoolId: string,
  name: string,
  publicId: string,
): Promise<string> {
  const base = slugify(name, publicId);
  let slug = base;
  let n = 2;
  for (;;) {
    const existing = await db
      .select({ id: schema.spaces.id })
      .from(schema.spaces)
      .where(and(eq(schema.spaces.schoolId, schoolId), eq(schema.spaces.slug, slug)))
      .limit(1);
    if (!existing[0]) return slug;
    slug = `${base}-${n}`;
    n += 1;
  }
}

async function schoolCommunity(db: AppDb, schoolId: string) {
  const rows = await db
    .select()
    .from(schema.communities)
    .where(
      and(
        eq(schema.communities.schoolId, schoolId),
        isNull(schema.communities.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function provisionSchoolCommunity(
  tx: AppDb,
  input: {
    schoolId: string;
    schoolName: string;
    principalId: string;
    schoolAccountId: string;
    schoolAccountPublicId: string;
  },
  clock: Clock,
): Promise<void> {
  const now = clock.now();
  const communityPublicId = createPublicId("com", clock);
  const communityId = uuidv7(clock);
  const spacePublicId = createPublicId("spc", clock);
  const spaceId = uuidv7(clock);
  await tx.insert(schema.communities).values({
    id: communityId,
    publicId: communityPublicId,
    schoolId: input.schoolId,
    salesPageId: null,
    name: `${input.schoolName} Community`,
    slug: "community",
    description: "",
    banner: "",
    featuredImage: null,
    categories: '["General"]',
    autoAcceptMembers: true,
    joiningReasonText: "",
    deletedAt: null,
    createdBy: input.principalId,
    createdAt: now,
    updatedAt: now,
  });
  await tx.insert(schema.spaces).values({
    id: spaceId,
    publicId: spacePublicId,
    schoolId: input.schoolId,
    name: "General",
    slug: "general",
    description: "",
    logo: "MessagesSquare",
    featuredImage: null,
    follow: true,
    whoCanPost: "members",
    position: 1,
    createdAt: now,
    updatedAt: now,
  });
  await tx.insert(schema.spaceUnlocks).values({
    id: uuidv7(clock),
    schoolId: input.schoolId,
    spaceId,
    entityType: "community",
    entityId: communityPublicId,
    createdAt: now,
  });
  await upsertLearnerMembership(
    tx,
    {
      schoolId: input.schoolId,
      schoolAccountId: input.schoolAccountId,
      entityType: "community",
      entityId: communityPublicId,
      status: "active",
      role: "moderate",
    },
    clock,
  );
}

async function loadUnlocks(db: AppDb, spaceIds: string[]) {
  if (spaceIds.length === 0) return new Map<string, SpaceDto["unlocks"]>();
  const unlocks = await db
    .select()
    .from(schema.spaceUnlocks)
    .where(inArray(schema.spaceUnlocks.spaceId, spaceIds));
  const plans =
    unlocks.length === 0
      ? []
      : await db
          .select({
            unlockId: schema.spaceUnlockPlans.unlockId,
            publicId: schema.storefrontPlans.publicId,
          })
          .from(schema.spaceUnlockPlans)
          .innerJoin(
            schema.storefrontPlans,
            eq(schema.storefrontPlans.id, schema.spaceUnlockPlans.paymentPlanId),
          )
          .where(
            inArray(
              schema.spaceUnlockPlans.unlockId,
              unlocks.map((row) => row.id),
            ),
          );
  const plansByUnlock = new Map<string, string[]>();
  for (const row of plans) {
    const list = plansByUnlock.get(row.unlockId) ?? [];
    list.push(row.publicId);
    plansByUnlock.set(row.unlockId, list);
  }
  const bySpace = new Map<string, SpaceDto["unlocks"]>();
  for (const unlock of unlocks) {
    const list = bySpace.get(unlock.spaceId) ?? [];
    list.push({
      entityType: unlock.entityType,
      entityId: unlock.entityId,
      planIds: plansByUnlock.get(unlock.id) ?? [],
    });
    bySpace.set(unlock.spaceId, list);
  }
  return bySpace;
}

function toDto(
  row: typeof schema.spaces.$inferSelect,
  unlocks: SpaceDto["unlocks"],
  followed?: boolean,
  canPost?: boolean,
): SpaceDto {
  return {
    id: row.publicId,
    name: row.name,
    slug: row.slug,
    description: row.description,
    logo: row.logo,
    featuredImage: row.featuredImage ?? null,
    follow: row.follow,
    whoCanPost: row.whoCanPost,
    position: row.position,
    unlocks,
    ...(canPost === undefined ? {} : { canPost }),
    ...(followed === undefined ? {} : { followed }),
    createdAt: serializeDate(row.createdAt),
    updatedAt: serializeDate(row.updatedAt),
  };
}

async function replaceUnlocks(
  db: AppDb,
  schoolId: string,
  spaceId: string,
  unlocks: SpaceUnlockInput[],
  clock: Clock,
): Promise<Result<void>> {
  const community = await schoolCommunity(db, schoolId);
  if (!community) return notFound();
  const existing = await db
    .select({ id: schema.spaceUnlocks.id })
    .from(schema.spaceUnlocks)
    .where(eq(schema.spaceUnlocks.spaceId, spaceId));
  if (existing.length > 0) {
    await db
      .delete(schema.spaceUnlocks)
      .where(eq(schema.spaceUnlocks.spaceId, spaceId));
  }
  for (const unlock of unlocks) {
    if (unlock.entityType === "community") {
      const unlockId = uuidv7(clock);
      await db.insert(schema.spaceUnlocks).values({
        id: unlockId,
        schoolId,
        spaceId,
        entityType: "community",
        entityId: community.publicId,
        createdAt: clock.now(),
      });
      const planIds = unlock.planIds ?? [];
      if (planIds.length > 0) {
        const plans = await db
          .select()
          .from(schema.storefrontPlans)
          .where(
            and(
              eq(schema.storefrontPlans.schoolId, schoolId),
              eq(schema.storefrontPlans.entityType, "community"),
              eq(schema.storefrontPlans.entityId, community.publicId),
              inArray(schema.storefrontPlans.publicId, planIds),
            ),
          );
        if (plans.length !== planIds.length) return validation("invalid_unlock");
        for (const plan of plans) {
          await db.insert(schema.spaceUnlockPlans).values({
            id: uuidv7(clock),
            schoolId,
            unlockId,
            paymentPlanId: plan.id,
          });
        }
      }
      continue;
    }
    const productId = unlock.entityId?.trim();
    if (!productId) return validation("invalid_unlock");
    const products = await db
      .select()
      .from(schema.products)
      .where(
        and(
          eq(schema.products.schoolId, schoolId),
          eq(schema.products.publicId, productId),
        ),
      )
      .limit(1);
    const product = products[0];
    if (!product) return validation("invalid_unlock");
    const unlockId = uuidv7(clock);
    await db.insert(schema.spaceUnlocks).values({
      id: unlockId,
      schoolId,
      spaceId,
      entityType: "product",
      entityId: product.publicId,
      createdAt: clock.now(),
    });
    const planIds = unlock.planIds ?? [];
    if (planIds.length > 0) {
      const plans = await db
        .select()
        .from(schema.storefrontPlans)
        .where(
          and(
            eq(schema.storefrontPlans.schoolId, schoolId),
            eq(schema.storefrontPlans.entityType, "product"),
            eq(schema.storefrontPlans.entityId, product.publicId),
            inArray(schema.storefrontPlans.publicId, planIds),
          ),
        );
      if (plans.length !== planIds.length) return validation("invalid_unlock");
      for (const plan of plans) {
        await db.insert(schema.spaceUnlockPlans).values({
          id: uuidv7(clock),
          schoolId,
          unlockId,
          paymentPlanId: plan.id,
        });
      }
    }
  }
  return { ok: true, value: undefined };
}

export async function listAdminSpaces(
  db: AppDb,
  context: AdminContext,
  schoolId: string,
): Promise<Result<{ items: SpaceDto[] }>> {
  if (
    !canManageSpaces(context) &&
    !canModerateSpaces(context) &&
    !context.permissions.has("communities:read")
  ) {
    return forbidden();
  }
  const rows = await db
    .select()
    .from(schema.spaces)
    .where(eq(schema.spaces.schoolId, schoolId))
    .orderBy(asc(schema.spaces.position), asc(schema.spaces.id));
  const unlocks = await loadUnlocks(
    db,
    rows.map((row) => row.id),
  );
  return {
    ok: true,
    value: { items: rows.map((row) => toDto(row, unlocks.get(row.id) ?? [])) },
  };
}

export async function createSpace(
  db: AppDb,
  context: AdminContext,
  schoolId: string,
  input: {
    name: string;
    description?: string;
    logo?: string;
    featuredImage?: MediaRef | null;
    unlocks?: SpaceUnlockInput[];
    follow?: boolean;
    whoCanPost?: "members" | "admin";
  },
  clock: Clock,
): Promise<Result<SpaceDto>> {
  if (!canManageSpaces(context)) return forbidden();
  const name = input.name.trim();
  if (!name || name.length > 100) return validation("invalid_name");
  const whoCanPost = input.whoCanPost ?? "members";
  if (whoCanPost !== "members" && whoCanPost !== "admin") {
    return validation("invalid_who_can_post");
  }
  const logo = input.logo?.trim() || "MessagesSquare";
  if (!/^[A-Z][A-Za-z0-9]*$/.test(logo)) return validation("invalid_logo");
  const now = clock.now();
  const publicId = createPublicId("spc", clock);
  const slug = await uniqueSlug(db, schoolId, name, publicId);
  const [max] = await db
    .select({ position: sql<number>`coalesce(max(${schema.spaces.position}), 0)` })
    .from(schema.spaces)
    .where(eq(schema.spaces.schoolId, schoolId));
  const row = {
    id: uuidv7(clock),
    publicId,
    schoolId,
    name,
    slug,
    description: input.description ?? "",
    logo,
    featuredImage: input.featuredImage ?? null,
    follow: input.follow ?? false,
    whoCanPost,
    position: (max?.position ?? 0) + 1,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(schema.spaces).values(row);
  const unlocks = await replaceUnlocks(
    db,
    schoolId,
    row.id,
    input.unlocks ?? [],
    clock,
  );
  if (!unlocks.ok) {
    await db.delete(schema.spaces).where(eq(schema.spaces.id, row.id));
    return unlocks;
  }
  const loaded = await loadUnlocks(db, [row.id]);
  return { ok: true, value: toDto(row, loaded.get(row.id) ?? []) };
}

async function loadSpace(db: AppDb, schoolId: string, publicId: string) {
  const rows = await db
    .select()
    .from(schema.spaces)
    .where(
      and(eq(schema.spaces.schoolId, schoolId), eq(schema.spaces.publicId, publicId)),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function getAdminSpace(
  db: AppDb,
  context: AdminContext,
  schoolId: string,
  spacePublicId: string,
): Promise<Result<SpaceDto>> {
  if (
    !canManageSpaces(context) &&
    !canModerateSpaces(context) &&
    !context.permissions.has("communities:read")
  ) {
    return forbidden();
  }
  const row = await loadSpace(db, schoolId, spacePublicId);
  if (!row) return notFound();
  const unlocks = await loadUnlocks(db, [row.id]);
  return { ok: true, value: toDto(row, unlocks.get(row.id) ?? []) };
}

export async function updateSpace(
  db: AppDb,
  context: AdminContext,
  schoolId: string,
  spacePublicId: string,
  input: {
    name?: string;
    description?: string;
    logo?: string;
    featuredImage?: MediaRef | null;
    unlocks?: SpaceUnlockInput[];
    follow?: boolean;
    whoCanPost?: "members" | "admin";
  },
  clock: Clock,
): Promise<Result<SpaceDto>> {
  if (!canManageSpaces(context)) return forbidden();
  const row = await loadSpace(db, schoolId, spacePublicId);
  if (!row) return notFound();
  if (
    input.whoCanPost &&
    input.whoCanPost !== "members" &&
    input.whoCanPost !== "admin"
  ) {
    return validation("invalid_who_can_post");
  }
  if (
    input.logo !== undefined &&
    input.logo &&
    !/^[A-Z][A-Za-z0-9]*$/.test(input.logo)
  ) {
    return validation("invalid_logo");
  }
  if (input.name !== undefined && !input.name.trim()) return validation("invalid_name");
  const patch = {
    name: input.name?.trim() ?? row.name,
    description: input.description ?? row.description,
    logo: input.logo ?? row.logo,
    featuredImage:
      input.featuredImage === undefined ? row.featuredImage : input.featuredImage,
    follow: input.follow ?? row.follow,
    whoCanPost: input.whoCanPost ?? row.whoCanPost,
    updatedAt: clock.now(),
  };
  await db.update(schema.spaces).set(patch).where(eq(schema.spaces.id, row.id));
  if (input.unlocks) {
    const unlocks = await replaceUnlocks(db, schoolId, row.id, input.unlocks, clock);
    if (!unlocks.ok) return unlocks;
  }
  const updated = { ...row, ...patch };
  const loaded = await loadUnlocks(db, [row.id]);
  return { ok: true, value: toDto(updated, loaded.get(row.id) ?? []) };
}

export async function orderSpaces(
  db: AppDb,
  context: AdminContext,
  schoolId: string,
  spaceIds: string[],
  clock: Clock,
): Promise<Result<{ items: SpaceDto[] }>> {
  if (!canManageSpaces(context)) return forbidden();
  const rows = await db
    .select()
    .from(schema.spaces)
    .where(eq(schema.spaces.schoolId, schoolId));
  const wanted = new Set(spaceIds);
  if (
    wanted.size !== spaceIds.length ||
    wanted.size !== rows.length ||
    rows.some((row) => !wanted.has(row.publicId))
  ) {
    return validation("incomplete_order");
  }
  const now = clock.now();
  for (const [index, publicId] of spaceIds.entries()) {
    await db
      .update(schema.spaces)
      .set({ position: index + 1, updatedAt: now })
      .where(
        and(eq(schema.spaces.schoolId, schoolId), eq(schema.spaces.publicId, publicId)),
      );
  }
  return listAdminSpaces(db, context, schoolId);
}

export async function deleteSpace(
  db: AppDb,
  context: AdminContext,
  schoolId: string,
  spacePublicId: string,
  destinationSpaceId: string | undefined,
  clock: Clock,
): Promise<Result<{ id: string }>> {
  if (!canManageSpaces(context)) return forbidden();
  return db.transaction(async (tx) => {
    const transaction = tx as AppDb;
    const row = await loadSpace(transaction, schoolId, spacePublicId);
    if (!row) return notFound();
    const siblings = await transaction
      .select({ id: schema.spaces.id })
      .from(schema.spaces)
      .where(eq(schema.spaces.schoolId, schoolId));
    if (siblings.length <= 1) return validation("last_space");
    const posts = await transaction
      .select({ id: schema.communityPosts.id })
      .from(schema.communityPosts)
      .where(eq(schema.communityPosts.spaceId, row.id))
      .limit(1);
    if (posts[0]) {
      if (!destinationSpaceId) return validation("destination_required");
      if (destinationSpaceId === row.publicId) return validation("destination_same");
      const destination = await loadSpace(transaction, schoolId, destinationSpaceId);
      if (!destination) return notFound();
      await transaction
        .update(schema.communityPosts)
        .set({ spaceId: destination.id, updatedAt: clock.now() })
        .where(eq(schema.communityPosts.spaceId, row.id));
    }
    await transaction
      .update(schema.products)
      .set({ discussionSpaceId: null, discussions: false, updatedAt: clock.now() })
      .where(eq(schema.products.discussionSpaceId, row.id));
    await transaction.delete(schema.spaces).where(eq(schema.spaces.id, row.id));
    return { ok: true, value: { id: row.publicId } };
  });
}

export async function listLearnerSpaces(
  db: AppDb,
  viewer: CommunityLearnerViewer,
): Promise<Result<{ items: SpaceDto[] }>> {
  const accessible = await accessibleSpaceIds(db, viewer.schoolId, viewer.learnerId);
  if (accessible.size === 0) return { ok: true, value: { items: [] } };
  const rows = await db
    .select()
    .from(schema.spaces)
    .where(
      and(
        eq(schema.spaces.schoolId, viewer.schoolId),
        inArray(schema.spaces.id, [...accessible]),
      ),
    )
    .orderBy(asc(schema.spaces.position), asc(schema.spaces.id));
  const unlocks = await loadUnlocks(
    db,
    rows.map((row) => row.id),
  );
  const follows = await db
    .select({ spaceId: schema.spaceFollowers.spaceId })
    .from(schema.spaceFollowers)
    .where(
      and(
        eq(schema.spaceFollowers.schoolAccountId, viewer.learnerId),
        inArray(
          schema.spaceFollowers.spaceId,
          rows.map((row) => row.id),
        ),
      ),
    );
  const followed = new Set(follows.map((row) => row.spaceId));
  const memberships = await db
    .select()
    .from(schema.learnerMemberships)
    .where(
      and(
        eq(schema.learnerMemberships.schoolId, viewer.schoolId),
        eq(schema.learnerMemberships.schoolAccountId, viewer.learnerId),
        eq(schema.learnerMemberships.status, "active"),
      ),
    );
  const communityMembership = memberships.find(
    (membership) => membership.entityType === "community",
  );
  const onlyComment =
    communityMembership?.role === "comment" &&
    memberships.every(
      (membership) =>
        membership.entityType === "community" || membership.isIncludedInPlan,
    );
  return {
    ok: true,
    value: {
      items: rows.map((row) =>
        toDto(
          row,
          unlocks.get(row.id) ?? [],
          followed.has(row.id),
          row.whoCanPost === "admin"
            ? communityMembership?.role === "moderate"
            : !onlyComment,
        ),
      ),
    },
  };
}

export async function followSpace(
  db: AppDb,
  viewer: CommunityLearnerViewer,
  spacePublicId: string,
  clock: Clock,
): Promise<Result<{ followed: true }>> {
  const row = await loadSpace(db, viewer.schoolId, spacePublicId);
  if (!row) return notFound();
  const accessible = await accessibleSpaceIds(db, viewer.schoolId, viewer.learnerId);
  if (!accessible.has(row.id)) return notFound();
  const existing = await db
    .select({ id: schema.spaceFollowers.id })
    .from(schema.spaceFollowers)
    .where(
      and(
        eq(schema.spaceFollowers.spaceId, row.id),
        eq(schema.spaceFollowers.schoolAccountId, viewer.learnerId),
      ),
    )
    .limit(1);
  if (!existing[0]) {
    await db.insert(schema.spaceFollowers).values({
      id: uuidv7(clock),
      schoolId: viewer.schoolId,
      spaceId: row.id,
      schoolAccountId: viewer.learnerId,
      createdAt: clock.now(),
    });
  }
  return { ok: true, value: { followed: true } };
}

export async function unfollowSpace(
  db: AppDb,
  viewer: CommunityLearnerViewer,
  spacePublicId: string,
): Promise<Result<{ followed: false }>> {
  const row = await loadSpace(db, viewer.schoolId, spacePublicId);
  if (!row) return notFound();
  const accessible = await accessibleSpaceIds(db, viewer.schoolId, viewer.learnerId);
  if (!accessible.has(row.id)) return notFound();
  await db
    .delete(schema.spaceFollowers)
    .where(
      and(
        eq(schema.spaceFollowers.spaceId, row.id),
        eq(schema.spaceFollowers.schoolAccountId, viewer.learnerId),
      ),
    );
  return { ok: true, value: { followed: false } };
}

export async function createLearnerSpacePost(
  db: AppDb,
  viewer: CommunityLearnerViewer,
  spacePublicId: string,
  input: { title: string; content: string; mediaIds?: readonly string[] },
  clock: Clock,
): Promise<Result<{ id: string; spaceId: string; title: string; content: string }>> {
  const space = await loadSpace(db, viewer.schoolId, spacePublicId);
  if (!space) return notFound();
  const accessible = await accessibleSpaceIds(db, viewer.schoolId, viewer.learnerId);
  if (!accessible.has(space.id)) return notFound();
  const memberships = await db
    .select()
    .from(schema.learnerMemberships)
    .where(
      and(
        eq(schema.learnerMemberships.schoolId, viewer.schoolId),
        eq(schema.learnerMemberships.schoolAccountId, viewer.learnerId),
        eq(schema.learnerMemberships.status, "active"),
      ),
    );
  const communityMembership = memberships.find((row) => row.entityType === "community");
  const onlyComment =
    communityMembership?.role === "comment" &&
    memberships.every((row) => row.entityType === "community" || row.isIncludedInPlan);
  if (space.whoCanPost === "admin") {
    if (communityMembership?.role !== "moderate") {
      return forbidden();
    }
  } else if (onlyComment) {
    return forbidden();
  }
  const title = input.title.trim();
  if (!title) return validation("invalid_title");
  const community = await schoolCommunity(db, viewer.schoolId);
  if (!community) return notFound();
  const now = clock.now();
  const row = {
    id: uuidv7(clock),
    publicId: createPublicId("pst", clock),
    schoolId: viewer.schoolId,
    communityId: community.id,
    spaceId: space.id,
    schoolAccountId: viewer.learnerId,
    title,
    content: input.content,
    category: space.name,
    pinned: false,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(schema.communityPosts).values(row);
  const richTextMediaIds = await mediaIdsForRichTextContent(
    db,
    viewer.schoolId,
    input.content,
  );
  const mediaIds = [...new Set([...(input.mediaIds ?? []), ...richTextMediaIds])];
  if (mediaIds.length > 0) {
    const references = await reconcileMediaReferencesInTransaction(
      db,
      viewer.schoolId,
      mediaIds,
      "community_content",
      row.id,
      row.publicId,
      clock,
      {
        allowedKinds: ["image", "video", "document"],
        allowedMimeTypes: ["application/pdf"],
        allowedMimePrefixes: ["image/", "video/"],
      },
    );
    if (!references.ok) {
      await db
        .delete(schema.communityPosts)
        .where(eq(schema.communityPosts.id, row.id));
      return references;
    }
  }
  return {
    ok: true,
    value: { id: row.publicId, spaceId: space.publicId, title, content: input.content },
  };
}

async function feedCursorCondition(
  db: AppDb,
  schoolId: string,
  cursor: string | undefined,
) {
  if (!cursor) return undefined;
  const [row] = await db
    .select({
      id: schema.communityPosts.id,
      createdAt: schema.communityPosts.createdAt,
    })
    .from(schema.communityPosts)
    .where(
      and(
        eq(schema.communityPosts.schoolId, schoolId),
        eq(schema.communityPosts.publicId, cursor),
      ),
    )
    .limit(1);
  if (!row) return undefined;
  return or(
    lt(schema.communityPosts.createdAt, row.createdAt),
    and(
      eq(schema.communityPosts.createdAt, row.createdAt),
      lt(schema.communityPosts.id, row.id),
    ),
  );
}

export async function listLearnerSpaceFeed(
  db: AppDb,
  viewer: CommunityLearnerViewer,
  options: { cursor?: string; limit: number; spaceId?: string },
): Promise<
  Result<{
    items: LearnerSpaceFeedPostDto[];
    nextCursor: string | null;
    banner: string;
  }>
> {
  const community = await schoolCommunity(db, viewer.schoolId);
  const banner = community?.banner ?? "";
  const accessible = await accessibleSpaceIds(db, viewer.schoolId, viewer.learnerId);
  const cursorWhere = await feedCursorCondition(db, viewer.schoolId, options.cursor);
  if (options.spaceId) {
    const space = await loadSpace(db, viewer.schoolId, options.spaceId);
    if (!space || !accessible.has(space.id)) return notFound();
    const rows = await db
      .select({ post: schema.communityPosts, space: schema.spaces })
      .from(schema.communityPosts)
      .innerJoin(schema.spaces, eq(schema.spaces.id, schema.communityPosts.spaceId))
      .where(
        and(
          eq(schema.communityPosts.schoolId, viewer.schoolId),
          eq(schema.communityPosts.spaceId, space.id),
          isNull(schema.communityPosts.deletedAt),
          ...(cursorWhere ? [cursorWhere] : []),
        ),
      )
      .orderBy(desc(schema.communityPosts.createdAt), desc(schema.communityPosts.id))
      .limit(options.limit + 1);
    const page = rows.slice(0, options.limit);
    const items = await mapLearnerSpaceFeedPosts(db, viewer, page);
    return {
      ok: true,
      value: {
        items,
        nextCursor:
          rows.length > options.limit ? page[page.length - 1]!.post.publicId : null,
        banner,
      },
    };
  }
  const spaceIds = [...accessible];
  if (spaceIds.length === 0)
    return { ok: true, value: { items: [], nextCursor: null, banner } };
  const rows = await db
    .select({
      post: schema.communityPosts,
      space: schema.spaces,
    })
    .from(schema.communityPosts)
    .innerJoin(schema.spaces, eq(schema.spaces.id, schema.communityPosts.spaceId))
    .where(
      and(
        eq(schema.communityPosts.schoolId, viewer.schoolId),
        inArray(schema.communityPosts.spaceId, spaceIds),
        isNull(schema.communityPosts.deletedAt),
        ...(cursorWhere ? [cursorWhere] : []),
      ),
    )
    .orderBy(desc(schema.communityPosts.createdAt), desc(schema.communityPosts.id))
    .limit(options.limit + 1);
  const page = rows.slice(0, options.limit);
  const items = await mapLearnerSpaceFeedPosts(db, viewer, page);
  return {
    ok: true,
    value: {
      items,
      nextCursor:
        rows.length > options.limit ? page[page.length - 1]!.post.publicId : null,
      banner,
    },
  };
}

export async function getLearnerSpacePost(
  db: AppDb,
  viewer: CommunityLearnerViewer,
  spacePublicId: string,
  postPublicId: string,
): Promise<Result<LearnerSpaceFeedPostDto>> {
  const space = await loadSpace(db, viewer.schoolId, spacePublicId);
  if (!space) return notFound();
  const accessible = await accessibleSpaceIds(db, viewer.schoolId, viewer.learnerId);
  if (!accessible.has(space.id)) return notFound();
  const rows = await db
    .select({ post: schema.communityPosts })
    .from(schema.communityPosts)
    .where(
      and(
        eq(schema.communityPosts.schoolId, viewer.schoolId),
        eq(schema.communityPosts.spaceId, space.id),
        eq(schema.communityPosts.publicId, postPublicId),
        isNull(schema.communityPosts.deletedAt),
      ),
    )
    .limit(1);
  const post = rows[0]?.post;
  if (!post) return notFound();
  const [item] = await mapLearnerSpaceFeedPosts(db, viewer, [{ post, space }]);
  return item ? { ok: true, value: item } : notFound();
}

export async function listSpaceReports(
  db: AppDb,
  context: AdminContext,
  school: { schoolId: string; publicId: string },
  options: {
    status?: "pending" | "accepted" | "rejected";
    cursor?: string;
    limit: number;
    spaceId?: string;
  },
) {
  if (!canModerateSpaces(context)) return forbidden();
  const community = await schoolCommunity(db, school.schoolId);
  if (!community) return { ok: true as const, value: { items: [], nextCursor: null } };
  return listReports(db, context, school, community.publicId, options);
}

export async function createLearnerSpaceReport(
  db: AppDb,
  viewer: CommunityLearnerViewer,
  school: { schoolId: string; publicId: string },
  spacePublicId: string,
  input: {
    contentType: "post" | "comment" | "reply";
    contentId: string;
    reason: string;
  },
  clock: Clock,
) {
  const space = await loadSpace(db, viewer.schoolId, spacePublicId);
  if (!space) return notFound();
  const accessible = await accessibleSpaceIds(db, viewer.schoolId, viewer.learnerId);
  if (!accessible.has(space.id)) return notFound();
  const community = await schoolCommunity(db, viewer.schoolId);
  if (!community) return notFound();
  return createReport(db, viewer, school, community.publicId, input, clock);
}

export async function enableProductDiscussionSpace(
  db: AppDb,
  schoolId: string,
  product: typeof schema.products.$inferSelect,
  clock: Clock,
): Promise<string> {
  if (product.discussionSpaceId) return product.discussionSpaceId;
  const now = clock.now();
  const publicId = createPublicId("spc", clock);
  const slug = await uniqueSlug(db, schoolId, product.title, publicId);
  const [max] = await db
    .select({ position: sql<number>`coalesce(max(${schema.spaces.position}), 0)` })
    .from(schema.spaces)
    .where(eq(schema.spaces.schoolId, schoolId));
  const spaceId = uuidv7(clock);
  await db.insert(schema.spaces).values({
    id: spaceId,
    publicId,
    schoolId,
    name: product.title,
    slug,
    description: "",
    logo: "MessagesSquare",
    featuredImage: null,
    follow: true,
    whoCanPost: "members",
    position: (max?.position ?? 0) + 1,
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(schema.spaceUnlocks).values({
    id: uuidv7(clock),
    schoolId,
    spaceId,
    entityType: "product",
    entityId: product.publicId,
    createdAt: now,
  });
  return spaceId;
}

export async function syncIncludedProductMemberships(
  db: AppDb,
  schoolId: string,
  clock: Clock,
): Promise<void> {
  const included = await db
    .select()
    .from(schema.products)
    .where(
      and(
        eq(schema.products.schoolId, schoolId),
        eq(schema.products.includedWithCommunity, true),
        eq(schema.products.status, "published"),
      ),
    );
  const parents = await db
    .select()
    .from(schema.learnerMemberships)
    .where(
      and(
        eq(schema.learnerMemberships.schoolId, schoolId),
        eq(schema.learnerMemberships.entityType, "community"),
        eq(schema.learnerMemberships.status, "active"),
      ),
    );
  for (const parent of parents) {
    if (!parent.paymentPlanId) continue;
    for (const product of included) {
      await upsertLearnerMembership(
        db,
        {
          schoolId,
          schoolAccountId: parent.schoolAccountId,
          entityType: "product",
          entityId: product.publicId,
          paymentPlanId: parent.paymentPlanId,
          status: "active",
          isIncludedInPlan: true,
          parentMembershipId: parent.id,
        },
        clock,
      );
    }
  }
}
