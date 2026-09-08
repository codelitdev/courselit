import { loadDataSlots } from "@frontlit/page-builder/data-slots";
import type { WidgetInstance } from "@frontlit/page-builder/models";
import { notFound } from "next/navigation";
import { PublicBlogFeed } from "@/components/public-blog-feed";
import { PublicCommunitiesCatalog } from "@/components/public-communities-catalog";
import { PublicProductsCatalog } from "@/components/public-products-catalog";
import { SitePageRenderer, SitePageSection } from "@/components/site-page-renderer";
import { getPageBySlug, getSettings, listPublicArticles } from "@/lib/courselit-public";
import { requestHost } from "@/lib/request-host";

export type PublicSystemRoute =
  | "blog"
  | "products"
  | "communities"
  | "community"
  | "product"
  | "checkout";

export function publicSystemRouteForSlug(
  pageSlug: string,
): PublicSystemRoute | undefined {
  return pageSlug === "blog" || pageSlug === "products" || pageSlug === "communities"
    ? pageSlug
    : undefined;
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
}: {
  pageSlug: string;
  salesPageSlug?: string;
  allowEmpty?: boolean;
  fallbackToHomepage?: boolean;
  /** Dynamic CourseLit routes reuse the homepage's shared blocks instead of
   * requiring a persisted FrontLit page. */
  systemRoute?: PublicSystemRoute;
  systemContent?: React.ReactNode;
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
  const siteLogoAlt =
    typeof settings?.logo?.alt === "string"
      ? settings.logo.alt
      : typeof settings?.logo?.caption === "string"
        ? settings.logo.caption
        : null;

  const pageData = {
    pageType: "site",
    pageSlug,
  } as const;
  const layout: WidgetInstance[] =
    systemRoute && !isSalesPage
      ? (resolvedPage?.layout ?? []).filter(
          (instance) => instance.name === "header" || instance.name === "footer",
        )
      : isSalesPage && !page
        ? (resolvedPage?.layout ?? []).filter(
            (instance) => instance.name === "header" || instance.name === "footer",
          )
        : (resolvedPage?.layout ?? []);

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
          layout,
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
      layout={layout}
      themeId={settings?.themeId ?? null}
      themeStyle={settings?.theme ?? null}
      siteLogoUrl={siteLogoUrl}
      siteLogoAlt={siteLogoAlt}
      pageData={resolvedPageData}
      dataSlots={dataSlots}
    >
      {systemRoute && (!isSalesPage || !page) ? (
        <SitePageSection>{systemContent}</SitePageSection>
      ) : undefined}
    </SitePageRenderer>
  );
}
