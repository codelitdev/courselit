import { hasOwnCopyright, schoolCopyright } from "@courselit/page-blocks/copyright";
import { loadDataSlots } from "@frontlit/page-builder/data-slots";
import type { PageData, WidgetInstance } from "@frontlit/page-builder/models";
import { notFound } from "next/navigation";
import { PublicBlogFeed } from "@/components/public-blog-feed";
import { PublicCommunitiesCatalog } from "@/components/public-communities-catalog";
import { PublicProductsCatalog } from "@/components/public-products-catalog";
import { SitePageRenderer, SitePageSection } from "@/components/site-page-renderer";
import {
  getPageBySlug,
  getPublicCommunity,
  getPublicCommunityPlans,
  getPublicProductDetail,
  getPublicProductPlans,
  getSettings,
  listPublicHomeOffers,
  listPublicArticles,
} from "@/lib/courselit-public";

export type PublicSystemRoute =
  | "blog"
  | "products"
  | "communities"
  | "community"
  | "product"
  | "lesson"
  | "checkout"
  | "login";

export function publicSystemRouteForSlug(
  pageSlug: string,
): PublicSystemRoute | undefined {
  return pageSlug === "blog" ||
    pageSlug === "products" ||
    pageSlug === "communities"
    ? pageSlug
    : undefined;
}

export async function loadPublicPage(pageSlug: string, schoolId: string) {
  const page = await getPageBySlug(schoolId, pageSlug);
  return { schoolId, pageSlug, page };
}

export async function PublicSitePage({
  pageSlug,
  salesPageSlug,
  allowEmpty = false,
  fallbackToHomepage = false,
  systemRoute,
  systemContent: providedSystemContent,
  salesResource,
  schoolId,
}: {
  pageSlug: string;
  salesPageSlug?: string;
  allowEmpty?: boolean;
  fallbackToHomepage?: boolean;
  /** Dynamic CourseLit routes reuse the homepage's shared blocks instead of
   * requiring a persisted website page. */
  systemRoute?: PublicSystemRoute;
  systemContent?: React.ReactNode;
  salesResource?:
    | { resourceType: "product"; resourceId: string }
    | { resourceType: "community"; resourceId: string };
  schoolId: string;
}) {
  const isSalesPage = Boolean(salesPageSlug);
  const { page } = await loadPublicPage(
    salesPageSlug ?? (systemRoute ? "" : pageSlug),
    schoolId,
  );
  const settings = await getSettings(schoolId);
  const fallbackPage =
    !page && fallbackToHomepage ? await getPageBySlug(schoolId, "") : null;
  const resolvedPage = page ?? fallbackPage;
  if (!resolvedPage && !allowEmpty) notFound();

  // No logo means no logo: never fall back to the CourseLit mark.
  const siteLogoUrl =
    typeof settings?.logo?.url === "string" && settings.logo.url.trim()
      ? settings.logo.url.trim()
      : null;
  const siteLogoAlt = settings?.logo?.alt || settings?.title?.trim() || null;
  const isHome = !pageSlug && !systemRoute && !isSalesPage;
  const [homeOffers, termsPage, privacyPage, articles] = await Promise.all([
    isHome ? listPublicHomeOffers(schoolId) : Promise.resolve([]),
    getPageBySlug(schoolId, "terms"),
    getPageBySlug(schoolId, "privacy"),
    listPublicArticles(schoolId),
  ]);
  const hasOffers = isHome
    ? homeOffers.length > 0
    : (await listPublicHomeOffers(schoolId)).length > 0;

  const salesProduct =
    salesResource?.resourceType === "product"
      ? await getPublicProductDetail(schoolId, salesResource.resourceId)
      : null;
  const salesCommunity =
    salesResource?.resourceType === "community"
      ? await getPublicCommunity(schoolId, salesResource.resourceId)
      : null;
  const salesPlans =
    salesProduct && salesResource?.resourceType === "product"
      ? await getPublicProductPlans(schoolId, salesResource.resourceId)
      : salesCommunity && salesResource?.resourceType === "community"
        ? await getPublicCommunityPlans(schoolId, salesResource.resourceId)
        : [];
  const siteCommunity =
    salesCommunity ??
    (salesProduct?.includedWithCommunity
      ? await getPublicCommunity(schoolId, "community")
      : pageSlug && systemRoute !== "products" && systemRoute !== "blog"
        ? await getPublicCommunity(schoolId, "community")
        : null);
  const siteCommunityPlans = siteCommunity
    ? await getPublicCommunityPlans(schoolId, siteCommunity.id)
    : [];

  const pageData: PageData = {
    pageType: "site",
    pageSlug,
    schoolId,
    siteTitle: settings?.title ?? null,
    siteSubtitle: settings?.subtitle ?? null,
    siteLogoUrl,
    siteLogoAlt,
    ...(isHome ? { courseLitHome: { offers: homeOffers } } : {}),
    ...(salesProduct && salesResource?.resourceType === "product"
      ? {
          courseLitSalesData: {
            resourceType: "product" as const,
            product: {
              ...salesProduct,
              plans: salesPlans,
              includedWithCommunity: salesProduct.includedWithCommunity,
              community:
                salesProduct.includedWithCommunity && siteCommunity
                  ? { id: siteCommunity.id, plans: siteCommunityPlans }
                  : null,
            },
          },
        }
      : {}),
    ...((salesCommunity && salesResource?.resourceType === "community") ||
    (!salesProduct && siteCommunity)
      ? {
          courseLitSalesData: {
            resourceType: "community" as const,
            community: {
              ...(salesCommunity ?? siteCommunity)!,
              plans:
                salesCommunity && salesResource?.resourceType === "community"
                  ? salesPlans
                  : siteCommunityPlans,
            },
          },
        }
      : {}),
  };
  const chromeLayout: WidgetInstance[] =
    systemRoute && !isSalesPage
      ? (resolvedPage?.layout ?? []).filter(
          (instance) => instance.name === "header" || instance.name === "footer",
        )
      : isSalesPage && !page
        ? (resolvedPage?.layout ?? []).filter(
            (instance) => instance.name === "header" || instance.name === "footer",
          )
        : (resolvedPage?.layout ?? []);
  const baseLayout: WidgetInstance[] = chromeLayout;
  const publishedLegal: Record<string, boolean> = {
    "/terms": Boolean(termsPage),
    "/privacy": Boolean(privacyPage),
  };
  const year = new Date().getFullYear();
  const schoolName = settings?.title?.trim() || "";
  const renderLayout = baseLayout.map((rawInstance) => {
    let instance = rawInstance;
    if (instance.name === "footer") {
      const columns = (
        (instance.settings?.columns as
          | Array<{ links: Array<{ href: string }> }>
          | undefined) ?? []
      )
        .map((column) => ({
          ...column,
          links: column.links.filter(
            (link) => publishedLegal[link.href] ?? (link.href !== "/blog" || articles.total > 0),
          ),
        }))
        .filter((column) => column.links.length > 0);
      instance = {
        ...instance,
        settings: {
          ...instance.settings,
          columns,
          ...(!hasOwnCopyright(instance.settings?.copyrightText) &&
          schoolCopyright(schoolName, year)
            ? { copyrightText: schoolCopyright(schoolName, year) }
            : {}),
        },
      };
    } else if (instance.name === "header") {
      const links = (
        (instance.settings?.links as Array<{ href: string }> | undefined) ?? []
      ).filter((link) =>
        link.href === "/products"
          ? hasOffers
          : link.href === "/blog"
            ? articles.total > 0
            : true,
      );
      instance = { ...instance, settings: { ...instance.settings, links } };
    }
    const isLegacySalesSlot =
      instance.name === "data-slot" &&
      instance.settings?.slot === "courselit.sales-page-content";
    const isLegacySalesBanner = [
      "banner",
      "courselit-banner",
      "courselit-product-banner",
      "courselit-community-banner",
    ].includes(instance.name);
    if (salesResource && (isLegacySalesSlot || isLegacySalesBanner)) {
      const legacyTextPosition = instance.settings?.alignment;
      const legacyTextAlignment = instance.settings?.textAlignment;
      return {
        ...instance,
        name:
          salesResource.resourceType === "community"
            ? "courselit-community"
            : "courselit-product",
        settings: {
          ...instance.settings,
          textPosition:
            typeof legacyTextPosition === "string" &&
            ["left", "right", "top", "bottom"].includes(legacyTextPosition)
              ? legacyTextPosition
              : "left",
          textAlignment:
            typeof legacyTextAlignment === "string" &&
            ["left", "center", "right"].includes(legacyTextAlignment)
              ? legacyTextAlignment
              : "left",
        },
      };
    }
    return instance;
  });
  let systemContent = providedSystemContent ?? null;
  if (providedSystemContent === undefined && systemRoute === "blog") {
    systemContent = (
      <PublicBlogFeed
        items={articles.items}
        siteTitle={settings?.title}
        siteSubtitle={settings?.subtitle}
      />
    );
  } else if (providedSystemContent === undefined && systemRoute === "products") {
    systemContent = <PublicProductsCatalog />;
  } else if (providedSystemContent === undefined && systemRoute === "communities") {
    systemContent = <PublicCommunitiesCatalog />;
  }

  const dataSlots = isSalesPage
    ? { "courselit.sales-page-content": systemContent }
    : systemRoute
      ? undefined
      : await loadDataSlots(
          baseLayout,
          {
            "frontlit.content-feed": async ({ instance }) => {
              if (instance.settings?.source !== "articles") return null;
              return (
                <PublicBlogFeed
                  items={articles.items}
                  siteTitle={settings?.title}
                  siteSubtitle={settings?.subtitle}
                />
              );
            },
          },
          pageData,
        );

  return (
    <SitePageRenderer
      layout={renderLayout}
      themeId={settings?.themeId ?? null}
      themeStyle={settings?.theme ?? null}
      pageData={pageData}
      dataSlots={dataSlots}
    >
      {systemRoute && (!isSalesPage || !page) ? (
        <SitePageSection>{systemContent}</SitePageSection>
      ) : undefined}
    </SitePageRenderer>
  );
}
