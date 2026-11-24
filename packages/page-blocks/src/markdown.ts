import type { PageData } from "@frontlit/page-builder/models";
import type { BlockMarkdown } from "@frontlit/page-builder/schema";
import { serializeDocsMarkdown } from "@frontlit/text-editor/docs";
import { BANNER_BLOCK } from "./blocks/banner/constants";
import { COMMUNITY_BLOCK } from "./blocks/community/constants";
import { PRODUCT_CURRICULUM_BLOCK } from "./blocks/curriculum/constants";
import { HOME_HERO_BLOCK } from "./blocks/home-hero/constants";
import { homeCtaLabel } from "./blocks/home-hero/cta";
import { HOME_OFFERS_BLOCK } from "./blocks/home-offers/constants";
import {
  DEFAULT_NEWSLETTER_TITLE,
  NEWSLETTER_SIGNUP_BLOCK,
} from "./blocks/newsletter-signup/constants";
import type { CourseLitPlan } from "./blocks/shared/types";
import {
  descriptionContent,
  homeData,
  offerHref,
  offerKindLabel,
  offerPriceLabel,
  planPrice,
  salesData,
} from "./blocks/shared/utils";

/**
 * Markdown versions of CourseLit's page blocks, for AI agents. Pass them to
 * `layoutToMarkdown(layout, { blocks })`. Like the widgets, they read the
 * school's data from the page data the storefront builds, so a block reads
 * the same in Markdown as on the page.
 */

type Settings = Record<string, unknown>;

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

/** TipTap JSON (or a JSON string of it, or plain text) as Markdown. Content
 * the docs serializer can't read falls back to its plain text. */
export function richTextMarkdown(value: unknown): string {
  const content =
    typeof value === "string" ? descriptionContent(value) : (value as object | null);
  if (!content || typeof content !== "object") return "";
  try {
    return serializeDocsMarkdown(content).trim();
  } catch {
    return plainText(content).trim();
  }
}

function plainText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const {
    text: value,
    content,
    type,
  } = node as {
    text?: string;
    content?: unknown[];
    type?: string;
  };
  if (typeof value === "string") return value;
  const inner = (content ?? []).map(plainText).join("");
  return ["paragraph", "heading", "listItem", "codeBlock", "blockquote"].includes(
    type ?? "",
  )
    ? `${inner}\n\n`
    : inner;
}

function plansMarkdown(plans: CourseLitPlan[], heading = "## Pricing"): string {
  if (plans.length === 0) return "";
  const lines = plans.map((plan) => {
    const detail = text(plan.description);
    return `- **${plan.name}**: ${planPrice(plan)}${detail ? ` (${detail})` : ""}`;
  });
  return [heading, lines.join("\n")].join("\n\n");
}

/** Block serializers for one page, keyed by block name. */
export function courseLitBlocksMarkdown(
  pageData: PageData,
): Record<string, BlockMarkdown> {
  const sales = salesData(pageData);
  const product = sales?.resourceType === "product" ? sales.product : null;
  const community = sales?.resourceType === "community" ? sales.community : null;
  const offers = homeData(pageData)?.offers ?? [];
  const siteTitle = text(pageData.siteTitle);

  return {
    // Builder text blocks hold TipTap JSON in CourseLit.
    "rich-text": (settings: Settings) => [richTextMarkdown(settings.text)],

    [HOME_HERO_BLOCK]: () => {
      const offer = offers[0];
      const headline = text(pageData.siteSubtitle) || (offer ? siteTitle : "");
      if (!headline) return "";
      return [
        `## ${headline}`,
        offer ? richTextMarkdown(offer.description) : "",
        offer ? `[${homeCtaLabel(offer)}](${offerHref(offer)})` : "",
      ];
    },

    [HOME_OFFERS_BLOCK]: () => {
      if (offers.length === 0) return "";
      const heading = offers.every((offer) => offer.kind === "community")
        ? "Community"
        : "Offers";
      return [
        `## ${heading}`,
        offers
          .map((offer) => {
            const summary = richTextMarkdown(offer.description).split("\n")[0] ?? "";
            return `- [${offer.title}](${offerHref(offer)}) (${offerKindLabel(offer)}, ${offerPriceLabel(offer)})${summary ? `: ${summary}` : ""}`;
          })
          .join("\n"),
      ];
    },

    [BANNER_BLOCK]: (settings: Settings) => {
      if (!product) return "";
      const title = text(settings.title) || text(settings.customTitle) || product.title;
      const description =
        settings.description ?? settings.customDescription ?? product.description;
      return [
        `## ${title}`,
        product.kind === "download" ? "Digital download" : "Course",
        richTextMarkdown(description),
        plansMarkdown([...product.plans, ...(product.community?.plans ?? [])]),
      ];
    },

    [COMMUNITY_BLOCK]: (settings: Settings) => {
      if (!community) return "";
      const members = community.membersCount;
      return [
        `## ${text(settings.title) || community.name}`,
        members > 0
          ? `Community · ${members} ${members === 1 ? "member" : "members"}`
          : "Community",
        richTextMarkdown(settings.description ?? community.description),
        plansMarkdown(community.plans),
      ];
    },

    [PRODUCT_CURRICULUM_BLOCK]: (settings: Settings) => {
      if (!product || product.lessons.length === 0) return "";
      const lessonList = (sectionId: string | null) =>
        product.lessons
          .filter((lesson) => lesson.sectionId === sectionId)
          .map((lesson) => `- ${lesson.title}`)
          .join("\n");
      return [
        `## ${text(settings.title) || "Curriculum"}`,
        richTextMarkdown(settings.description),
        ...product.sections.map((section) =>
          [`### ${section.title}`, lessonList(section.id)].filter(Boolean).join("\n\n"),
        ),
        lessonList(null),
      ];
    },

    [NEWSLETTER_SIGNUP_BLOCK]: (settings: Settings) => [
      `## ${
        text(settings.title) ||
        (siteTitle ? `Get updates from ${siteTitle}` : DEFAULT_NEWSLETTER_TITLE)
      }`,
      text(settings.subtitle),
    ],
  };
}
