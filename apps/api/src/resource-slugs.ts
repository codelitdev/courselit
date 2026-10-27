import { and, eq, isNull, ne } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import type { AppDb } from "./types.js";

export async function resourceSlugTaken(
  db: AppDb,
  input: {
    schoolId: string;
    slug: string;
    resourceType?: "product" | "community";
    resourceId?: string;
  },
): Promise<boolean> {
  const [products, communities] = await Promise.all([
    input.resourceType === "product"
      ? db
          .select({ id: schema.products.id })
          .from(schema.products)
          .where(
            and(
              eq(schema.products.schoolId, input.schoolId),
              eq(schema.products.slug, input.slug),
              ...(input.resourceId ? [ne(schema.products.id, input.resourceId)] : []),
            ),
          )
          .limit(1)
      : input.resourceType === "community"
        ? db
            .select({ id: schema.communities.id })
            .from(schema.communities)
            .where(
              and(
                eq(schema.communities.schoolId, input.schoolId),
                eq(schema.communities.slug, input.slug),
                ...(input.resourceId ? [ne(schema.communities.id, input.resourceId)] : []),
              ),
            )
            .limit(1)
        : [],
    input.resourceType === "product"
      ? db
          .select({ id: schema.communities.id })
          .from(schema.communities)
          .where(
            and(
              eq(schema.communities.schoolId, input.schoolId),
              eq(schema.communities.slug, input.slug),
            ),
          )
          .limit(1)
      : input.resourceType === "community"
        ? db
            .select({ id: schema.products.id })
            .from(schema.products)
            .where(
              and(
                eq(schema.products.schoolId, input.schoolId),
                eq(schema.products.slug, input.slug),
              ),
            )
            .limit(1)
        : [],
  ]);
  // Ordinary website pages share the storefront's top-level URL space. A
  // resource's own sales page always follows the resource slug.
  const [page] = await db
    .select({ id: schema.websitePages.id })
    .from(schema.websitePages)
    .where(
      and(
        eq(schema.websitePages.schoolId, input.schoolId),
        eq(schema.websitePages.slug, input.slug),
        isNull(schema.websitePages.productId),
        isNull(schema.websitePages.communityId),
      ),
    )
    .limit(1);
  return products.length > 0 || communities.length > 0 || Boolean(page);
}
