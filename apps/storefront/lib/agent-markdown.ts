import {
  courseLitBlocksMarkdown,
  richTextMarkdown,
} from "@courselit/page-blocks/markdown";
import type { PageData, WidgetInstance } from "@frontlit/page-builder/models";
import { layoutToMarkdown } from "@frontlit/page-builder/schema";
import { buildLlmsTxt, markdownDocument, markdownUrl } from "@frontlit/site-seo";
import {
  getPageBySlug,
  getPublicArticleBySlug,
  getPublicCommunity,
  getPublicCommunityPlans,
  getPublicProductDetail,
  getPublicProductPlans,
  getSettings,
  listPublicArticles,
  listPublicHomeOffers,
  listPublicProducts,
  type PublicSettings,
  type PublicSitemap,
} from "./courselit-public";
import { communityPlansIncludingProduct } from "./community-plans";
import { salesPageBlock } from "./sales-page-blocks";
import { siteLogoUrl, siteTitle } from "./site-branding";

/**
 * Markdown versions of the storefront's public pages for AI agents
 * (`<path>.md` or `Accept: text/markdown`, negotiated in proxy.ts), plus
 * `/llms.txt`. Keyed by path alone, so it caches like the HTML pages.
 */

const date = (value: string | null | undefined) => (value ? value.slice(0, 10) : "");
const quote = (value: string | null | undefined) =>
  value?.trim() ? `> ${value.trim()}` : "";

export function notFoundMarkdown(path: string): string {
  return markdownDocument(
    "Page not found",
    `Nothing is published at \`${path}\`.`,
    "- [llms.txt](/llms.txt): an index of this site's pages, courses and posts\n- [sitemap.xml](/sitemap.xml): every public URL",
  );
}

function pageBody(layout: WidgetInstance[], pageData: PageData): string {
  return layoutToMarkdown(layout, { blocks: courseLitBlocksMarkdown(pageData) });
}

function basePageData(settings: PublicSettings | null): PageData {
  return {
    pageType: "site",
    siteTitle: settings?.title ?? null,
    siteSubtitle: settings?.subtitle ?? null,
    siteLogoUrl: siteLogoUrl(settings),
    siteLogoAlt: siteTitle(settings),
  };
}

async function homeMarkdown(schoolId: string, settings: PublicSettings | null) {
  const [page, offers] = await Promise.all([
    getPageBySlug(schoolId, ""),
    listPublicHomeOffers(schoolId),
  ]);
  return markdownDocument(
    siteTitle(settings),
    quote(page?.description || settings?.subtitle),
    pageBody(page?.layout ?? [], {
      ...basePageData(settings),
      courseLitHome: { offers },
    }),
  );
}

async function blogMarkdown(schoolId: string, slug: string | undefined) {
  if (!slug) {
    const { items } = await listPublicArticles(schoolId);
    return markdownDocument(
      "Blog",
      items
        .map(
          (post) =>
            `- [${post.title || post.slug}](${markdownUrl(`/blog/${encodeURIComponent(post.slug)}`)})${post.publishedAt ? ` (${date(post.publishedAt)})` : ""}${post.excerpt ? `: ${post.excerpt}` : ""}`,
        )
        .join("\n"),
    );
  }
  const post = await getPublicArticleBySlug(schoolId, slug);
  if (!post) return null;
  return markdownDocument(
    post.title || post.slug,
    [
      post.publishedAt ? `Published ${date(post.publishedAt)}` : "",
      post.author?.name ? `by ${post.author.name}` : "",
    ]
      .filter(Boolean)
      .join(" "),
    quote(post.excerpt),
    richTextMarkdown(post.content),
  );
}

async function productsMarkdown(schoolId: string) {
  const products = await listPublicProducts(schoolId);
  return markdownDocument(
    "Products",
    products
      .map((product) => {
        const summary = richTextMarkdown(product.description).split("\n")[0] ?? "";
        const title = product.title ?? product.slug ?? product.id;
        return `- [${title}](${markdownUrl(`/p/${encodeURIComponent(product.slug || product.id)}`)})${summary ? `: ${summary}` : ""}`;
      })
      .join("\n"),
  );
}

/** A product's or community's sales page; its default blocks when the
 * school hasn't built one. */
async function salesMarkdown(
  schoolId: string,
  slug: string,
  settings: PublicSettings | null,
): Promise<string | null> {
  const product = await getPublicProductDetail(schoolId, slug);
  if (product) {
    const [page, plans, siteCommunity] = await Promise.all([
      getPageBySlug(schoolId, product.slug),
      getPublicProductPlans(schoolId, product.id),
      getPublicCommunity(schoolId, "community"),
    ]);
    // Like the page: community plans that unlock this product are offered too.
    const communityPlans = siteCommunity
      ? communityPlansIncludingProduct(
          product.id,
          await getPublicCommunityPlans(schoolId, siteCommunity.id),
        )
      : [];
    const layout = page?.layout.length
      ? page.layout.map((block) => salesPageBlock(block, "product"))
      : [
          { name: "courselit-product", settings: {} },
          { name: "courselit-product-curriculum", settings: {} },
        ];
    return markdownDocument(
      product.title,
      pageBody(layout as WidgetInstance[], {
        ...basePageData(settings),
        courseLitSalesData: {
          resourceType: "product",
          product: {
            ...product,
            plans,
            community: communityPlans.length
              ? { id: siteCommunity!.id, plans: communityPlans }
              : null,
          },
        },
      }),
    );
  }
  const community = await getPublicCommunity(schoolId, slug);
  if (!community) return null;
  const [page, plans] = await Promise.all([
    getPageBySlug(schoolId, community.slug),
    getPublicCommunityPlans(schoolId, community.id),
  ]);
  const layout = page?.layout.length
    ? page.layout.map((block) => salesPageBlock(block, "community"))
    : [{ name: "courselit-community", settings: {} }];
  return markdownDocument(
    community.name,
    pageBody(layout as WidgetInstance[], {
      ...basePageData(settings),
      courseLitSalesData: {
        resourceType: "community",
        community: { ...community, plans },
      },
    }),
  );
}

/** The Markdown for a public path, or null when nothing is published there. */
export async function renderMarkdown(
  schoolId: string,
  path: string,
): Promise<string | null> {
  const segments = path.split("/").filter(Boolean).map(decodeURIComponent);
  const [first = "", ...rest] = segments;
  const settings = await getSettings(schoolId);
  if (segments.length === 0) return homeMarkdown(schoolId, settings);
  if (first === "blog" && rest.length <= 1) return blogMarkdown(schoolId, rest[0]);
  if (first === "products" && rest.length === 0) return productsMarkdown(schoolId);
  if (first === "p" && rest.length === 1)
    return salesMarkdown(schoolId, rest[0]!, settings);

  const slug = segments.join("/");
  if (segments.length === 1) {
    const sales = await salesMarkdown(schoolId, slug, settings);
    if (sales) return sales;
  }
  const page = await getPageBySlug(schoolId, slug);
  if (!page) return null;
  return markdownDocument(
    page.title || page.name,
    quote(page.description),
    pageBody(page.layout, basePageData(settings)),
  );
}

/** `/llms.txt` (llmstxt.org): the school's title, tagline and links to the
 * Markdown of every public page, from the same read as the sitemap. */
export function schoolLlmsTxt(
  settings: PublicSettings | null,
  sitemap: PublicSitemap | null,
) {
  const origin = settings?.siteOrigin?.replace(/\/$/, "") ?? "";
  const link = (title: string, path: string) => ({
    title,
    url: `${origin}${markdownUrl(path)}`,
  });
  const slugPath = (slug: string) =>
    `/${slug.split("/").map(encodeURIComponent).join("/")}`;
  return buildLlmsTxt({
    title: siteTitle(settings),
    summary: settings?.subtitle?.trim() || null,
    instructions:
      "Every page here has a Markdown version: add `.md` to its URL, or send `Accept: text/markdown`. Prices and plans are on each course's page.",
    sections: [
      {
        title: "Pages",
        links: (sitemap?.pages ?? []).map((page) =>
          page.slug
            ? link(page.title, slugPath(page.slug))
            : link(siteTitle(settings), "/"),
        ),
      },
      {
        title: "Courses and downloads",
        links: (sitemap?.products ?? []).map((product) =>
          link(product.title, `/p/${encodeURIComponent(product.slug)}`),
        ),
      },
      {
        title: "Communities",
        links: (sitemap?.communities ?? []).map((community) =>
          link(community.title, `/p/${encodeURIComponent(community.slug)}`),
        ),
      },
      {
        title: "Blog",
        links: (sitemap?.blogPosts ?? []).map((post) =>
          link(post.title, `/blog/${encodeURIComponent(post.slug)}`),
        ),
      },
    ],
  });
}
