import type { Metadata } from "next";
import { PublicSitePage } from "@/components/public-site-page";

export const metadata: Metadata = {
  title: "Products",
};

/**
 * The catalog is a system-owned public surface. It is composed inside the
 * school's homepage header/footer and active theme; it is not a persisted
 * FrontLit page.
 */
export default function PublicProductsPage() {
  return <PublicSitePage pageSlug="products" allowEmpty systemRoute="products" />;
}
