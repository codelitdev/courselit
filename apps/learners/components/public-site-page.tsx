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
  listPublicArticles,
} from "@/lib/courselit-public";
import { requestHost } from "@/lib/request-host";

export type PublicSystemRoute =
  | "blog"
  | "products"
  | "communities"
  | "community"
  | "join"
  | "product"
  | "lesson"
  | "checkout"
  | "login";

export function publicSystemRouteForSlug(
  pageSlug: string,
): PublicSystemRoute | undefined {
  return pageSlug === "blog" ||
    pageSlug === "products" ||
    pageSlug === "communities" ||
    pageSlug === "join"
    ? pageSlug
    : undefined;
}

function defaultChromeWidget(name: "header" | "footer"): WidgetInstance {
  return {
    widgetId: `join-${name}`,
    name,
    deletable: false,
    moveable: false,
    shared: true,
    settings: {},
  };
}

function composeJoinLayout(chrome: WidgetInstance[]): WidgetInstance[] {
  const header =
    chrome.find((instance) => instance.name === "header") ?? defaultChromeWidget("header");
  const footer =
    chrome.find((instance) => instance.name === "footer") ?? defaultChromeWidget("footer");
  return [
    header,
    {
      widgetId: "join-community",
      name: "courselit-community",
      deletable: false,
      moveable: false,
      shared: false,
      settings: { textPosition: "left", textAlignment: "left" },
    },
    footer,
  ];
}

export async function loadPublicPage(pageSlug: string) {
  const host = await requestHost();
  const page = await getPageBySlug(host, pageSlug);
  return { host, pageSlug, page };
}

export async function PublicSitePage({
  pageSlug,
  salesPageSlug,
  allowEmpty = false,
  fallbackToHomepage = false,
  systemRoute,
  systemContent: providedSystemContent,
  salesResource,
}: {
  pageSlug: string;
  salesPageSlug?: string;
  allowEmpty?: boolean;
  fallbackToHomepage?: boolean;
  /** Dynamic CourseLit routes reuse the homepage's shared blocks instead of
   * requiring a persisted FrontLit page. */
  systemRoute?: PublicSystemRoute;
  systemContent?: React.ReactNode;
  salesResource?:
    | { resourceType: "product"; resourceId: string }
    | { resourceType: "community"; resourceId: string };
}) {
  const isSalesPage = Boolean(salesPageSlug);
  const { host, page } = await loadPublicPage(
    salesPageSlug ?? (systemRoute ? "" : pageSlug),
  );
  const settings = await getSettings(host);
  const fallbackPage =
    !page && fallbackToHomepage ? await getPageBySlug(host, "") : null;
  const resolvedPage = page ?? fallbackPage;
  if (!resolvedPage && !allowEmpty) notFound();

  const siteLogoUrl =
    typeof settings?.logo?.url === "string" ? settings.logo.url : null;
  const siteLogoAlt = settings?.logo?.alt ?? null;

  const salesProduct =
    salesResource?.resourceType === "product"
      ? await getPublicProductDetail(host, salesResource.resourceId)
      : null;
  const salesCommunity =
    salesResource?.resourceType === "community"
      ? await getPublicCommunity(host, salesResource.resourceId)
      : null;
  const salesPlans =
    salesProduct && salesResource?.resourceType === "product"
      ? await getPublicProductPlans(host, salesResource.resourceId)
      : salesCommunity && salesResource?.resourceType === "community"
        ? await getPublicCommunityPlans(host, salesResource.resourceId)
        : [];
  const siteCommunity =
    salesCommunity ??
    (salesProduct?.includedWithCommunity ||
    systemRoute === "join" ||
    pageSlug === "join"
      ? await getPublicCommunity(host, "community")
      : pageSlug && systemRoute !== "products" && systemRoute !== "blog"
        ? await getPublicCommunity(host, "community")
        : null);
  if (systemRoute === "join" && !siteCommunity) notFound();
  const siteCommunityPlans = siteCommunity
    ? await getPublicCommunityPlans(host, siteCommunity.id)
    : [];

  const pageData: PageData = {
    pageType: "site",
    pageSlug,
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
  const siteName =
    settings?.title?.trim() && settings.title.trim().toLowerCase() !== "frontlit"
      ? settings.title.trim()
      : "CourseLit";
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
  const baseLayout: WidgetInstance[] =
    systemRoute === "join" ? composeJoinLayout(chromeLayout) : chromeLayout;
  const renderLayout = baseLayout.map((instance) => {
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
  const brandedLayout = renderLayout.map((instance) => {
    if (instance.name !== "header" && instance.name !== "footer") return instance;
    const currentSettings = instance.settings ?? {};
    const logoText = currentSettings.logoText;
    const copyrightText = currentSettings.copyrightText;
    const tagline = currentSettings.tagline;
    return {
      ...instance,
      settings: {
        ...currentSettings,
        ...(typeof logoText !== "string" || logoText.trim().toLowerCase() === "frontlit"
          ? { logoText: siteName }
          : {}),
        ...(instance.name === "footer" &&
        typeof copyrightText === "string" &&
        copyrightText.toLowerCase().includes("frontlit")
          ? { copyrightText: copyrightText.replace(/frontlit/gi, siteName) }
          : instance.name === "footer" && typeof copyrightText !== "string"
            ? { copyrightText: `© ${siteName}. All rights reserved.` }
            : {}),
        ...(instance.name === "footer" &&
        (typeof tagline !== "string" || tagline.toLowerCase().includes("frontlit"))
          ? { tagline: "Build, publish, and grow your audience from one dashboard." }
          : {}),
      },
    };
  });

  let systemContent = providedSystemContent ?? null;
  if (providedSystemContent === undefined && systemRoute === "blog") {
    const articles = await listPublicArticles(host);
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
              const articles = await listPublicArticles(host);
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

  const resolvedPageData = { ...pageData };

  return (
    <SitePageRenderer
      layout={brandedLayout}
      themeId={settings?.themeId ?? null}
      themeStyle={settings?.theme ?? null}
      siteLogoUrl={siteLogoUrl}
      siteLogoAlt={siteLogoAlt}
      pageData={resolvedPageData}
      dataSlots={dataSlots}
    >
      {systemRoute && systemRoute !== "join" && (!isSalesPage || !page) ? (
        <SitePageSection>{systemContent}</SitePageSection>
      ) : undefined}
    </SitePageRenderer>
  );
}
