import type { Clock } from "@codelitdev/platform";
import { and, eq, isNull } from "drizzle-orm";
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
import { decryptIntegrationSecret } from "./utils/integration-secrets.js";

/** Kept only to recognize pages created by older CourseLit versions. */
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

export type SalesPageJobPayload = {
  resourceType: SalesPageResourceType;
  resourceId: string;
};

function normalizeSalesPageId(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Legacy helper for compatibility routes and old API consumers. New sales
 * pages use the product/community slug directly. */
export function salesPageSlug(
  resourceType: SalesPageResourceType,
  resourcePublicId: string,
): string {
  return `${COURSELIT_SALES_PAGE_PREFIX}${resourceType}-${normalizeSalesPageId(resourcePublicId)}`;
}

export function isCourseLitSalesPageSlug(slug: string): boolean {
  return slug.startsWith(COURSELIT_SALES_PAGE_PREFIX);
}

export function salesPageLayout(input: {
  resourceType: SalesPageResourceType;
  resourceId: string;
  name: string;
  description: string;
  productKind?: "course" | "download";
}): FrontLitWidget[] {
  const isProduct = input.resourceType === "product";
  const layout: FrontLitWidget[] = [
    {
      widgetId: `${input.resourceId}-header`,
      name: "header",
      deletable: false,
      moveable: false,
      shared: true,
    },
  ];

  if (isProduct) {
    layout.push({
      widgetId: `${input.resourceId}-sales-banner`,
      name: "courselit-product",
      deletable: false,
      moveable: true,
      shared: false,
      settings: { textPosition: "left", textAlignment: "left" },
    });
    if (input.productKind === "course") {
      layout.push({
        widgetId: `${input.resourceId}-sales-curriculum`,
        name: "courselit-product-curriculum",
        deletable: false,
        moveable: true,
        shared: false,
        settings: {
          title: "Curriculum",
          headerAlignment: "center",
          openByDefault: false,
        },
      });
    }
  } else {
    layout.push({
      widgetId: `${input.resourceId}-sales-banner`,
      name: "courselit-community",
      deletable: false,
      moveable: true,
      shared: false,
      settings: { textPosition: "left", textAlignment: "left" },
    });
  }

  layout.push({
    widgetId: `${input.resourceId}-footer`,
    name: "footer",
    deletable: false,
    moveable: false,
    shared: true,
  });
  return layout;
}

function jobKey(resourceType: SalesPageResourceType, resourceId: string): string {
  return `${resourceType}:${resourceId}`;
}

function resourcePayload(
  resourceType: SalesPageResourceType,
  resourceId: string,
): SalesPageJobPayload {
  return { resourceType, resourceId };
}

export async function enqueueSalesPageProvisioning(
  db: AppDb,
  input: {
    schoolId: string;
    resourceType: SalesPageResourceType;
    resourceId: string;
    now: Date;
    id: string;
  },
): Promise<void> {
  const existingJobs = await db
    .select({
      id: schema.integrationOutboxJobs.id,
      payload: schema.integrationOutboxJobs.payload,
    })
    .from(schema.integrationOutboxJobs)
    .where(
      and(
        eq(schema.integrationOutboxJobs.schoolId, input.schoolId),
        eq(schema.integrationOutboxJobs.provider, "frontlit"),
        eq(schema.integrationOutboxJobs.type, "provision_sales_page"),
      ),
    );
  const existing = existingJobs.find((job) => {
    const payload = job.payload as Partial<SalesPageJobPayload>;
    return (
      payload.resourceType === input.resourceType &&
      payload.resourceId === input.resourceId
    );
  });
  if (existing) {
    await db
      .update(schema.integrationOutboxJobs)
      .set({
        status: "pending",
        nextAttemptAt: input.now,
        lastError: null,
        updatedAt: input.now,
      })
      .where(eq(schema.integrationOutboxJobs.id, existing.id));
    return;
  }
  await db
    .insert(schema.integrationOutboxJobs)
    .values({
      id: input.id,
      schoolId: input.schoolId,
      provider: "frontlit",
      type: "provision_sales_page",
      payload: resourcePayload(input.resourceType, input.resourceId),
      status: "pending",
      attempts: 0,
      nextAttemptAt: input.now,
      lastError: null,
      createdAt: input.now,
      updatedAt: input.now,
    })
    .onConflictDoNothing();
}

/** Reconciles resources into the outbox. This is deliberately separate from
 * page ownership: products and communities own the page ID, while this job
 * is only the retryable work record. */
export async function ensureSalesPageJobs(db: AppDb, clock: Clock): Promise<void> {
  const [products, communities, jobs] = await Promise.all([
    db
      .select({ id: schema.products.id, schoolId: schema.products.schoolId })
      .from(schema.products),
    db
      .select({ id: schema.communities.id, schoolId: schema.communities.schoolId })
      .from(schema.communities)
      .where(isNull(schema.communities.deletedAt)),
    db
      .select({
        schoolId: schema.integrationOutboxJobs.schoolId,
        payload: schema.integrationOutboxJobs.payload,
      })
      .from(schema.integrationOutboxJobs)
      .where(
        and(
          eq(schema.integrationOutboxJobs.provider, "frontlit"),
          eq(schema.integrationOutboxJobs.type, "provision_sales_page"),
        ),
      ),
  ]);

  const known = new Set<string>();
  for (const job of jobs) {
    const payload = job.payload as Partial<SalesPageJobPayload>;
    if (
      (payload.resourceType === "product" || payload.resourceType === "community") &&
      typeof payload.resourceId === "string"
    ) {
      known.add(`${job.schoolId}:${jobKey(payload.resourceType, payload.resourceId)}`);
    }
  }

  const now = clock.now();
  for (const product of products) {
    const key = `${product.schoolId}:${jobKey("product", product.id)}`;
    if (known.has(key)) continue;
    await enqueueSalesPageProvisioning(db, {
      id: crypto.randomUUID(),
      schoolId: product.schoolId,
      resourceType: "product",
      resourceId: product.id,
      now,
    });
    known.add(key);
  }
  for (const community of communities) {
    const key = `${community.schoolId}:${jobKey("community", community.id)}`;
    if (known.has(key)) continue;
    await enqueueSalesPageProvisioning(db, {
      id: crypto.randomUUID(),
      schoolId: community.schoolId,
      resourceType: "community",
      resourceId: community.id,
      now,
    });
    known.add(key);
  }
}

function statusForSalesPage(
  pageId: string | null,
  job: typeof schema.integrationOutboxJobs.$inferSelect | undefined,
): SalesPageDto["status"] {
  if (job?.status === "processing") return "provisioning";
  if (job?.status === "failed") return "failed";
  if (pageId) return "ready";
  return "pending";
}

export async function getSalesPage(
  db: AppDb,
  schoolId: string,
  resourceType: SalesPageResourceType,
  resourcePublicId: string,
): Promise<SalesPageDto | null> {
  const resource =
    resourceType === "product"
      ? (
          await db
            .select({
              id: schema.products.id,
              publicId: schema.products.publicId,
              slug: schema.products.slug,
              pageId: schema.products.salesPageId,
            })
            .from(schema.products)
            .where(
              and(
                eq(schema.products.schoolId, schoolId),
                eq(schema.products.publicId, resourcePublicId),
              ),
            )
            .limit(1)
        )[0]
      : (
          await db
            .select({
              id: schema.communities.id,
              publicId: schema.communities.publicId,
              slug: schema.communities.slug,
              pageId: schema.communities.salesPageId,
            })
            .from(schema.communities)
            .where(
              and(
                eq(schema.communities.schoolId, schoolId),
                eq(schema.communities.publicId, resourcePublicId),
                isNull(schema.communities.deletedAt),
              ),
            )
            .limit(1)
        )[0];
  if (!resource) return null;

  const jobs = await db
    .select()
    .from(schema.integrationOutboxJobs)
    .where(
      and(
        eq(schema.integrationOutboxJobs.schoolId, schoolId),
        eq(schema.integrationOutboxJobs.provider, "frontlit"),
        eq(schema.integrationOutboxJobs.type, "provision_sales_page"),
      ),
    );
  const job = jobs.find((candidate) => {
    const payload = candidate.payload as Partial<SalesPageJobPayload>;
    return payload.resourceType === resourceType && payload.resourceId === resource.id;
  });

  return {
    resourceType,
    resourceId: resource.publicId,
    slug: resource.slug,
    pageId: resource.pageId,
    status: statusForSalesPage(resource.pageId, job),
    lastError: job?.lastError ?? null,
  };
}

function salesPageSourcePayload(job: {
  payload: Record<string, unknown>;
}): SalesPageJobPayload {
  const payload = job.payload as Partial<SalesPageJobPayload>;
  if (
    (payload.resourceType !== "product" && payload.resourceType !== "community") ||
    typeof payload.resourceId !== "string"
  ) {
    throw new FrontLitApiError("Invalid sales page provisioning payload", 400, false);
  }
  return { resourceType: payload.resourceType, resourceId: payload.resourceId };
}

async function salesPageSource(
  db: AppDb,
  schoolId: string,
  payload: SalesPageJobPayload,
) {
  if (payload.resourceType === "product") {
    const [row] = await db
      .select({
        id: schema.products.id,
        publicId: schema.products.publicId,
        name: schema.products.title,
        description: schema.products.description,
        kind: schema.products.kind,
        slug: schema.products.slug,
        pageId: schema.products.salesPageId,
      })
      .from(schema.products)
      .where(
        and(
          eq(schema.products.id, payload.resourceId),
          eq(schema.products.schoolId, schoolId),
        ),
      )
      .limit(1);
    return row ? { ...row, resourceType: payload.resourceType } : null;
  }

  const [row] = await db
    .select({
      id: schema.communities.id,
      publicId: schema.communities.publicId,
      name: schema.communities.name,
      description: schema.communities.description,
      slug: schema.communities.slug,
      pageId: schema.communities.salesPageId,
    })
    .from(schema.communities)
    .where(
      and(
        eq(schema.communities.id, payload.resourceId),
        eq(schema.communities.schoolId, schoolId),
        isNull(schema.communities.deletedAt),
      ),
    )
    .limit(1);
  return row ? { ...row, resourceType: payload.resourceType, kind: undefined } : null;
}

export type SalesPageOperations = {
  listPages: typeof listFrontLitPages;
  createPage: typeof createFrontLitPage;
  updatePage: typeof updateFrontLitPage;
  publishPage: typeof publishFrontLitPage;
};

const defaultSalesPageOperations: SalesPageOperations = {
  listPages: listFrontLitPages,
  createPage: createFrontLitPage,
  updatePage: updateFrontLitPage,
  publishPage: publishFrontLitPage,
};

type SalesPageJob = {
  schoolId: string;
  payload: Record<string, unknown>;
};

/** Provisions or reconciles one saved page. The outbox caller owns retry and
 * failure state; this function only performs the remote work and persists the
 * resulting page ID on the owning resource. */
export async function provisionSalesPageJob(
  db: AppDb,
  job: SalesPageJob,
  clock: Clock,
  config: FrontLitConfig = frontLitConfig(),
  operations: SalesPageOperations = defaultSalesPageOperations,
): Promise<void> {
  if (!config.server) {
    throw new FrontLitApiError("FrontLit configuration is missing", undefined, true);
  }
  const payload = salesPageSourcePayload(job);
  const source = await salesPageSource(db, job.schoolId, payload);
  if (!source) return;

  const [integration] = await db
    .select()
    .from(schema.schoolIntegrations)
    .where(
      and(
        eq(schema.schoolIntegrations.schoolId, job.schoolId),
        eq(schema.schoolIntegrations.provider, "frontlit"),
      ),
    )
    .limit(1);
  if (!integration?.encryptedTeamKey || !integration.remoteTeamId) {
    throw new FrontLitApiError("FrontLit school integration is not ready yet");
  }

  const teamApiKey = decryptIntegrationSecret(integration.encryptedTeamKey);
  const apiConfig = {
    server: integration.server || config.server,
    provisioningSecret: null,
  };
  const pages = await operations.listPages(teamApiKey, { config: apiConfig });
  let remote = source.pageId
    ? pages.find((page) => page.id === source.pageId)
    : undefined;
  remote ??= pages.find((page) => page.slug === source.slug);
  remote ??= pages.find((page) => page.name === `${source.name} sales page`);
  if (!remote) {
    remote = await operations.createPage(
      { name: `${source.name} sales page` },
      teamApiKey,
      { config: apiConfig },
    );
  }

  await operations.updatePage(
    remote.id,
    {
      name: `${source.name} sales page`,
      slug: source.slug,
      layout: salesPageLayout({
        resourceType: source.resourceType,
        resourceId: source.publicId,
        name: source.name,
        description: source.description,
        productKind: source.kind,
      }),
      title: source.name,
      description: source.description,
      robotsAllowed: true,
    },
    teamApiKey,
    { config: apiConfig },
  );
  await operations.publishPage(remote.id, teamApiKey, { config: apiConfig });

  const now = clock.now();
  if (source.resourceType === "product") {
    await db
      .update(schema.products)
      .set({ salesPageId: remote.id, updatedAt: now })
      .where(eq(schema.products.id, source.id));
  } else {
    await db
      .update(schema.communities)
      .set({ salesPageId: remote.id, updatedAt: now })
      .where(eq(schema.communities.id, source.id));
  }
}
