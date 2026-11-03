"use client";

import type { WidgetProps } from "@frontlit/page-builder/models";
import { NavLink } from "@frontlit/page-builder/components";
import {
  Badge,
  Caption,
  Header2,
  Header4,
  PageCard,
  PageCardContent,
  PageCardImage,
  Section,
} from "@frontlit/page-builder/primitives";
import { ImageIcon } from "lucide-react";
import {
  homeData,
  offerHref,
  offerKindLabel,
  offerPriceLabel,
  sectionTheme,
} from "../shared/utils";
import type { HomeOffersSettings } from "./settings";

/** Hidden entirely when the school has no published offer. */
export default function HomeOffersWidget({
  settings,
  state: { theme },
  pageData,
  editing,
}: WidgetProps<HomeOffersSettings>) {
  const resolvedTheme = sectionTheme(theme.theme, settings);
  const offers = homeData(pageData)?.offers ?? [];

  if (offers.length === 0) {
    return editing ? (
      <Section theme={resolvedTheme} id={settings.cssId} background={settings.background}>
        <Caption theme={resolvedTheme}>
          Offers: your published courses, downloads and community appear here.
        </Caption>
      </Section>
    ) : null;
  }

  const onlyCommunity = offers.every((offer) => offer.kind === "community");
  const heading = onlyCommunity ? "Community" : "Offers";

  return (
    <Section theme={resolvedTheme} id={settings.cssId} background={settings.background}>
      <div className="flex w-full flex-col gap-6">
        <Header2 theme={resolvedTheme}>{heading}</Header2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {offers.map((offer) => (
            <NavLink key={`${offer.kind}-${offer.id}`} href={offerHref(offer)} className="block h-full no-underline">
              <PageCard theme={resolvedTheme} isLink className="h-full overflow-hidden">
                {offer.featuredImage ? (
                  <PageCardImage
                    theme={resolvedTheme}
                    src={offer.featuredImage.thumbnailUrl ?? offer.featuredImage.url}
                    alt={offer.featuredImage.alt || offer.title}
                    className="aspect-[16/9] w-full object-cover"
                  />
                ) : (
                  <PageCard
                    theme={resolvedTheme}
                    className="flex aspect-[16/9] w-full items-center justify-center rounded-none border-0 shadow-none"
                  >
                    <Caption theme={resolvedTheme}>
                      <ImageIcon className="size-8" aria-hidden="true" />
                    </Caption>
                  </PageCard>
                )}
                <PageCardContent theme={resolvedTheme} className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <Header4 theme={resolvedTheme}>{offer.title}</Header4>
                    <Badge theme={resolvedTheme} variant="secondary">
                      {offerPriceLabel(offer)}
                    </Badge>
                  </div>
                  <Caption theme={resolvedTheme}>{offerKindLabel(offer)}</Caption>
                </PageCardContent>
              </PageCard>
            </NavLink>
          ))}
        </div>
      </div>
    </Section>
  );
}
