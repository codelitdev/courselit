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
  getSettings,
} from "@/lib/courselit-public";
import { metadataForPublicPage } from "@/lib/public-page-metadata";
import { requestHost } from "@/lib/request-host";

interface Props {
  params: Promise<{ slug?: string[] }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const pageSlug = (slug ?? []).join("/");
  const host = await requestHost();
  const settings = await getSettings(host);
  const siteTitle = settings?.title?.trim() || "CourseLit";
  const siteLogoUrl =
    typeof settings?.logo?.url === "string" && settings.logo.url.trim()
      ? settings.logo.url.trim()
      : "/icon.svg";

  const systemRoute = publicSystemRouteForSlug(pageSlug);
  if (systemRoute) {
    const routeTitle = systemRoute.charAt(0).toUpperCase() + systemRoute.slice(1);
    return {
      title: { absolute: `${routeTitle} | ${siteTitle}` },
      description: settings?.subtitle?.trim() || undefined,
      ...(settings?.canonicalHost
        ? {
            alternates: {
              canonical: `/${pageSlug
                .split("/")
                .filter(Boolean)
                .map(encodeURIComponent)
                .join("/")}`,
            },
          }
        : {}),
      icons: {
        icon: siteLogoUrl,
        shortcut: siteLogoUrl,
        apple: siteLogoUrl,
      },
    };
  }

  if (!pageSlug) {
    const { page } = await loadPublicPage("");
    return metadataForPublicPage(page, siteTitle, settings, true);
  }

  const product = await getPublicProduct(host, pageSlug);
  if (product) {
    const { page } = await loadPublicPage(product.slug);
    return {
      ...metadataForPublicPage(page, product.title, settings, false),
      alternates: {
        canonical: `/p/${encodeURIComponent(product.slug || product.id)}`,
      },
    };
  }

  const community = await getPublicCommunity(host, pageSlug);
  if (community) {
    const { page } = await loadPublicPage(community.slug);
    return {
      ...metadataForPublicPage(page, community.name, settings, false),
      alternates: {
        canonical: `/p/${encodeURIComponent(community.slug || community.id)}`,
      },
    };
  }

  const { page } = await loadPublicPage(pageSlug);
  if (!page) {
    return {
      title: { absolute: `Page not found | ${siteTitle}` },
      icons: {
        icon: siteLogoUrl,
        shortcut: siteLogoUrl,
        apple: siteLogoUrl,
      },
    };
  }
  return metadataForPublicPage(
    page,
    page.title || page.name || siteTitle,
    settings,
    false,
  );
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
        salesPageSlug={product.slug}
        allowEmpty
        fallbackToHomepage
        systemRoute="product"
        systemContent={<PublicProductDetail productId={product.id} />}
        salesResource={{ resourceType: "product", resourceId: product.id }}
      />
    );
  }

  const community = await getPublicCommunity(host, pageSlug);
  if (community) {
    return (
      <PublicSitePage
        pageSlug={pageSlug}
        salesPageSlug={community.slug}
        allowEmpty
        fallbackToHomepage
        systemRoute="community"
        systemContent={<PublicCommunityDetail communityId={community.id} />}
        salesResource={{ resourceType: "community", resourceId: community.id }}
      />
    );
  }

  return <PublicSitePage pageSlug={pageSlug} allowEmpty={false} />;
}
