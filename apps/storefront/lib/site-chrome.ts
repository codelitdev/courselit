import type { WidgetInstance } from "@frontlit/page-builder/models";
import type { CourseLitHomeOffer } from "@courselit/page-blocks";

type Link = { id: string; label: string; href: string };
type Column = { id: string; title: string; links: Link[] };

export type SiteChromeInput = {
  siteTitle: string | null;
  offers: CourseLitHomeOffer[];
  hasPosts: boolean;
  legal: { terms: boolean; privacy: boolean };
};

/**
 * Makes the shared header and footer reflect only what the school really has:
 * links to sections with nothing in them are hidden, Terms and Privacy appear
 * once published, and the copyright line names the school.
 */
export function chromeForSchool(
  layout: WidgetInstance[],
  { siteTitle, offers, hasPosts, legal }: SiteChromeInput,
): WidgetInstance[] {
  const hasProducts = offers.some((offer) => offer.kind !== "community");
  const hasCommunity = offers.some((offer) => offer.kind === "community");
  const name = siteTitle?.trim() ?? "";

  return layout.map((instance) => {
    const settings = instance.settings ?? {};
    if (instance.name === "header") {
      const links = ((settings.links as Link[] | undefined) ?? [])
        .map((link) =>
          link.href === "/products" && !hasProducts && hasCommunity
            ? { ...link, label: "Community", href: "/communities" }
            : link,
        )
        .filter(
          (link) =>
            !(link.href === "/products" && !hasProducts) &&
            !(link.href === "/blog" && !hasPosts),
        );
      return { ...instance, settings: { ...settings, links } };
    }
    if (instance.name === "footer") {
      const columns = ((settings.columns as Column[] | undefined) ?? [])
        .map((column) => ({
          ...column,
          links: column.links.filter(
            (link) =>
              !(link.href === "/blog" && !hasPosts) &&
              !(link.href === "/terms" && !legal.terms) &&
              !(link.href === "/privacy" && !legal.privacy),
          ),
        }))
        .filter((column) => column.links.length > 0);
      const copyrightText =
        typeof settings.copyrightText === "string" && settings.copyrightText.trim()
          ? settings.copyrightText
          : name
            ? `© ${new Date().getFullYear()} ${name}`
            : undefined;
      return {
        ...instance,
        settings: {
          ...settings,
          columns,
          ...(copyrightText ? { copyrightText } : {}),
        },
      };
    }
    return instance;
  });
}
