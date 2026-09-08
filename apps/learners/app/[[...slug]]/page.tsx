import type { Metadata } from "next";
import { PublicCommunityDetail } from "@/components/public-community-detail";
import { PublicProductDetail } from "@/components/public-product-detail";
import {
  loadPublicPage,
  PublicSitePage,
  type PublicSystemRoute,
  publicSystemRouteForSlug,
} from "@/components/public-site-page";
import {
  getPublicCommunity,
  getPublicProduct,
  type PublicPage,
} from "@/lib/courselit-public";
import { requestHost } from "@/lib/request-host";
import { salesPageSlug } from "@/lib/sales-pages";

function metadataImageUrl(image: Record<string, unknown> | null): string | undefined {
  for (const key of ["file", "url", "src"]) {
    const value = image?.[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
}

export function metadataForPublicPage(
  page: PublicPage | null,
  fallbackTitle: string,
): Metadata {
  if (!page) return { title: fallbackTitle };

  const title = page.title || page.name || fallbackTitle;
  const description = page.description ?? undefined;
  const socialImage = metadataImageUrl(page.socialImage);
  const robots =
    page.robotsAllowed === null
      ? undefined
      : { index: page.robotsAllowed !== false, follow: page.robotsAllowed !== false };

  return {
    title,
    description,
    robots,
    openGraph: {
      title,
      description,
      type: "website",
      ...(socialImage ? { images: [{ url: socialImage }] } : {}),
    },
    twitter: socialImage
      ? { card: "summary_large_image", images: [socialImage] }
      : undefined,
  };
}

interface Props {
  params: Promise<{ slug?: string[] }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const pageSlug = (slug ?? []).join("/");
  const systemRoute = publicSystemRouteForSlug(pageSlug);
  if (systemRoute) {
    return { title: systemRoute.charAt(0).toUpperCase() + systemRoute.slice(1) };
  }

  if (!pageSlug) {
    const { page } = await loadPublicPage("");
    return metadataForPublicPage(page, "CourseLit");
  }

  const host = await requestHost();

  const product = await getPublicProduct(host, pageSlug);
  if (product) {
    const { page } = await loadPublicPage(salesPageSlug("product", product.id));
    return {
      ...metadataForPublicPage(page, product.title),
      alternates: { canonical: `/${encodeURIComponent(product.slug || product.id)}` },
    };
  }

  const community = await getPublicCommunity(host, pageSlug);
  if (community) {
    const { page } = await loadPublicPage(salesPageSlug("community", community.id));
    return {
      ...metadataForPublicPage(page, community.name),
      alternates: { canonical: `/${encodeURIComponent(community.slug || community.id)}` },
    };
  }

  const { page } = await loadPublicPage(pageSlug);
  if (!page) {
    return { title: "Page not found" };
  }
  return metadataForPublicPage(page, page.title || page.name || "CourseLit");
}

export default async function PublicSiteCatchAllPage({ params }: Props) {
  const { slug } = await params;
  const pageSlug = (slug ?? []).join("/");
  const systemRoute: PublicSystemRoute | undefined = publicSystemRouteForSlug(pageSlug);

  if (systemRoute || !pageSlug) {
    return (
      <PublicSitePage
        pageSlug={pageSlug}
        allowEmpty={!pageSlug}
        systemRoute={systemRoute}
      />
    );
  }

  const host = await requestHost();

  const product = await getPublicProduct(host, pageSlug);
  if (product) {
    return (
      <PublicSitePage
        pageSlug={pageSlug}
        salesPageSlug={salesPageSlug("product", product.id)}
        allowEmpty
        fallbackToHomepage
        systemRoute="product"
        systemContent={<PublicProductDetail productId={product.id} />}
      />
    );
  }

  const community = await getPublicCommunity(host, pageSlug);
  if (community) {
    return (
      <PublicSitePage
        pageSlug={pageSlug}
        salesPageSlug={salesPageSlug("community", community.id)}
        allowEmpty
        fallbackToHomepage
        systemRoute="community"
        systemContent={<PublicCommunityDetail communityId={community.id} />}
      />
    );
  }

  return (
    <PublicSitePage
      pageSlug={pageSlug}
      allowEmpty={false}
    />
  );
}
