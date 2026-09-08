import type { Clock } from "@codelitdev/platform";
import { and, eq, lte, or } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import {
  createFrontLitPage,
  FrontLitApiError,
  type FrontLitConfig,
  type FrontLitWidget,
  frontLitConfig,
  listFrontLitPages,
  publishFrontLitPage,
  updateFrontLitPage,
} from "./frontlit-client.js";
import type { AppDb } from "./types.js";

export const COURSELIT_SALES_PAGE_PREFIX = "courselit-sales-";

export type SalesPageResourceType = "product" | "community";

export type SalesPageDto = {
  resourceType: SalesPageResourceType;
  resourceId: string;
  slug: string;
  pageId: string | null;
  status: "pending" | "provisioning" | "ready" | "failed";
  lastError: string | null;
};

function normalizeSalesPageId(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function salesPageSlug(
  resourceType: SalesPageResourceType,
  resourcePublicId: string,
): string {
  return `${COURSELIT_SALES_PAGE_PREFIX}${resourceType}-${normalizeSalesPageId(resourcePublicId)}`;
}

export function isCourseLitSalesPageSlug(slug: string): boolean {
  return slug.startsWith(COURSELIT_SALES_PAGE_PREFIX);
}

export function salesPageDto(
  row: typeof schema.frontlitSalesPages.$inferSelect,
): SalesPageDto {
  return {
    resourceType: row.resourceType,
    resourceId: row.resourcePublicId,
    slug: row.slug,
    pageId: row.remotePageId,
    status: row.status,
    lastError: row.lastError,
  };
}

export function salesPageLayout(input: {
  resourceType: SalesPageResourceType;
  resourceId: string;
  name: string;
  description: string;
}): FrontLitWidget[] {
  const description = input.description.trim();
  const descriptionContent = (() => {
    try {
      const parsed = JSON.parse(description) as { type?: unknown; content?: unknown };
      if (parsed?.type === "doc" && Array.isArray(parsed.content)) return parsed;
    } catch {
      // Plain text descriptions are still valid sales-page copy.
    }
    return {
      type: "doc",
      content: description
        ? [{ type: "paragraph", content: [{ type: "text", text: description }] }]
        : [{ type: "paragraph" }],
    };
  })();
  const isProduct = input.resourceType === "product";
  const resourcePath = isProduct ? "product" : "communities";

  return [
    {
      widgetId: `${input.resourceId}-header`,
      name: "header",
      deletable: false,
      moveable: false,
      shared: true,
    },
    {
      widgetId: `${input.resourceId}-sales-banner`,
      name: "banner",
      // The owning product/community controls the existence of this hero.
      // Authors can edit its settings, but cannot remove it from the sales page.
      deletable: false,
      moveable: true,
      shared: false,
      settings: {
        preTitle: isProduct ? "Learn at your own pace" : "Join the conversation",
        title: input.name,
        description: descriptionContent,
        buttonCaption: isProduct ? "Buy now" : "Join community",
        buttonAction: `/${resourcePath}/${input.resourceId}#checkout`,
        alignment: "center",
        contentAlignment: "center",
        layout: "centered",
      },
    },
    {
      widgetId: `${input.resourceId}-sales-content`,
      name: "data-slot",
      // The CourseLit-owned product/community content must always remain on
      // the sales page, even while the rest of the layout is editable.
      deletable: false,
      moveable: false,
      shared: false,
      settings: { slot: "courselit.sales-page-content" },
    },
    {
      widgetId: `${input.resourceId}-footer`,
      name: "footer",
      deletable: false,
      moveable: false,
      shared: true,
    },
  ];
}

export async function createPendingSalesPage(
  db: AppDb,
  input: {
    schoolId: string;
    resourceType: SalesPageResourceType;
    resourceId: string;
    resourcePublicId: string;
    now: Date;
    id: string;
  },
) {
  await db.insert(schema.frontlitSalesPages).values({
    id: input.id,
    schoolId: input.schoolId,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    resourcePublicId: input.resourcePublicId,
    slug: salesPageSlug(input.resourceType, input.resourcePublicId),
    remotePageId: null,
    status: "pending",
    attempts: 0,
    lastAttemptAt: null,
    nextAttemptAt: input.now,
    lastError: null,
    createdAt: input.now,
    updatedAt: input.now,
  });
}

export async function getSalesPage(
  db: AppDb,
  schoolId: string,
  resourceType: SalesPageResourceType,
  resourcePublicId: string,
): Promise<SalesPageDto | null> {
  const [row] = await db
    .select()
    .from(schema.frontlitSalesPages)
    .where(
      and(
        eq(schema.frontlitSalesPages.schoolId, schoolId),
        eq(schema.frontlitSalesPages.resourceType, resourceType),
        eq(schema.frontlitSalesPages.resourcePublicId, resourcePublicId),
      ),
    )
    .limit(1);
  return row ? salesPageDto(row) : null;
}

export async function ensureSalesPageMappings(db: AppDb, clock: Clock): Promise<void> {
  const [products, communities, existing] = await Promise.all([
    db
      .select({
        id: schema.products.id,
        publicId: schema.products.publicId,
        schoolId: schema.products.schoolId,
      })
      .from(schema.products),
    db
      .select({
        id: schema.communities.id,
        publicId: schema.communities.publicId,
        schoolId: schema.communities.schoolId,
      })
      .from(schema.communities),
    db
      .select({
        schoolId: schema.frontlitSalesPages.schoolId,
        resourceType: schema.frontlitSalesPages.resourceType,
        resourceId: schema.frontlitSalesPages.resourceId,
      })
      .from(schema.frontlitSalesPages),
  ]);
  const known = new Set(
    existing.map((row) => `${row.schoolId}:${row.resourceType}:${row.resourceId}`),
  );
  const now = clock.now();
  for (const resource of products) {
    const key = `${resource.schoolId}:product:${resource.id}`;
    if (known.has(key)) continue;
    await db
      .insert(schema.frontlitSalesPages)
      .values({
        id: crypto.randomUUID(),
        schoolId: resource.schoolId,
        resourceType: "product",
        resourceId: resource.id,
        resourcePublicId: resource.publicId,
        slug: salesPageSlug("product", resource.publicId),
        remotePageId: null,
        status: "pending",
        attempts: 0,
        lastAttemptAt: null,
        nextAttemptAt: now,
        lastError: null,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();
    known.add(key);
  }
  for (const resource of communities) {
    const key = `${resource.schoolId}:community:${resource.id}`;
    if (known.has(key)) continue;
    await db
      .insert(schema.frontlitSalesPages)
      .values({
        id: crypto.randomUUID(),
        schoolId: resource.schoolId,
        resourceType: "community",
        resourceId: resource.id,
        resourcePublicId: resource.publicId,
        slug: salesPageSlug("community", resource.publicId),
        remotePageId: null,
        status: "pending",
        attempts: 0,
        lastAttemptAt: null,
        nextAttemptAt: now,
        lastError: null,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();
    known.add(key);
  }
}

function backoffMs(attempts: number): number {
  return Math.min(1000 * 2 ** Math.min(attempts, 6), 60 * 1000);
}

async function claimSalesPage(db: AppDb, now: Date) {
  const [candidate] = await db
    .select()
    .from(schema.frontlitSalesPages)
    .where(
      and(
        or(
          eq(schema.frontlitSalesPages.status, "pending"),
          eq(schema.frontlitSalesPages.status, "failed"),
        ),
        lte(schema.frontlitSalesPages.nextAttemptAt, now),
      ),
    )
    .orderBy(schema.frontlitSalesPages.nextAttemptAt)
    .limit(1);
  if (!candidate) return null;
  const [claimed] = await db
    .update(schema.frontlitSalesPages)
    .set({
      status: "provisioning",
      attempts: candidate.attempts + 1,
      lastAttemptAt: now,
      updatedAt: now,
      lastError: null,
    })
    .where(
      and(
        eq(schema.frontlitSalesPages.id, candidate.id),
        or(
          eq(schema.frontlitSalesPages.status, "pending"),
          eq(schema.frontlitSalesPages.status, "failed"),
        ),
      ),
    )
    .returning();
  return claimed ?? null;
}

async function salesPageSource(
  db: AppDb,
  page: typeof schema.frontlitSalesPages.$inferSelect,
) {
  if (page.resourceType === "product") {
    const [row] = await db
      .select({ name: schema.products.title, description: schema.products.description })
      .from(schema.products)
      .where(
        and(
          eq(schema.products.id, page.resourceId),
          eq(schema.products.schoolId, page.schoolId),
        ),
      )
      .limit(1);
    return row ? { name: row.name, description: row.description } : null;
  }
  const [row] = await db
    .select({
      name: schema.communities.name,
      description: schema.communities.description,
    })
    .from(schema.communities)
    .where(
      and(
        eq(schema.communities.id, page.resourceId),
        eq(schema.communities.schoolId, page.schoolId),
      ),
    )
    .limit(1);
  return row ? { name: row.name, description: row.description } : null;
}

export async function processNextFrontLitSalesPage(
  db: AppDb,
  clock: Clock,
  config: FrontLitConfig = frontLitConfig(),
): Promise<boolean> {
  if (!config.server) return false;
  const page = await claimSalesPage(db, clock.now());
  if (!page) return false;
  try {
    const integration = await db
      .select()
      .from(schema.schoolIntegrations)
      .where(
        and(
          eq(schema.schoolIntegrations.schoolId, page.schoolId),
          eq(schema.schoolIntegrations.provider, "frontlit"),
        ),
      )
      .limit(1);
    const mapping = integration[0];
    if (!mapping?.encryptedTeamKey || !mapping.remoteTeamId) {
      throw new FrontLitApiError("FrontLit school integration is not ready yet");
    }
    const source = await salesPageSource(db, page);
    if (!source) {
      await db
        .delete(schema.frontlitSalesPages)
        .where(eq(schema.frontlitSalesPages.id, page.id));
      return true;
    }
    const teamApiKey = (
      await import("./utils/integration-secrets.js")
    ).decryptIntegrationSecret(mapping.encryptedTeamKey);
    const apiConfig = {
      server: mapping.server || config.server,
      provisioningSecret: null,
    };
    const pages = await listFrontLitPages(teamApiKey, { config: apiConfig });
    let remote = pages.find((item) => item.id === page.remotePageId);
    remote ??= pages.find((item) => item.slug === page.slug);
    if (!remote) {
      remote = pages.find((item) => item.name === `${source.name} sales page`);
    }
    if (!remote) {
      remote = await createFrontLitPage(
        { name: `${source.name} sales page` },
        teamApiKey,
        { config: apiConfig },
      );
      await db
        .update(schema.frontlitSalesPages)
        .set({ remotePageId: remote.id, updatedAt: clock.now() })
        .where(eq(schema.frontlitSalesPages.id, page.id));
    }
    if (!remote) throw new FrontLitApiError("FrontLit did not return the sales page");
    await updateFrontLitPage(
      remote.id,
      {
        name: `${source.name} sales page`,
        slug: page.slug,
        layout: salesPageLayout({
          resourceType: page.resourceType,
          resourceId: page.resourcePublicId,
          name: source.name,
          description: source.description,
        }),
        title: source.name,
        description: source.description,
        robotsAllowed: true,
      },
      teamApiKey,
      { config: apiConfig },
    );
    await publishFrontLitPage(remote.id, teamApiKey, { config: apiConfig });
    await db
      .update(schema.frontlitSalesPages)
      .set({
        remotePageId: remote.id,
        status: "ready",
        lastError: null,
        updatedAt: clock.now(),
      })
      .where(eq(schema.frontlitSalesPages.id, page.id));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const now = clock.now();
    await db
      .update(schema.frontlitSalesPages)
      .set({
        status: "failed",
        lastError: message.replace(/\s+/g, " ").slice(0, 2000),
        nextAttemptAt: new Date(now.getTime() + backoffMs(page.attempts)),
        updatedAt: now,
      })
      .where(eq(schema.frontlitSalesPages.id, page.id));
  }
  return true;
}
