"use client";

import type { WidgetProps } from "@frontlit/page-builder/models";
import { NavLink } from "@frontlit/page-builder/components";
import {
  Button,
  Caption,
  Header1,
  PageCardImage,
  Section,
} from "@frontlit/page-builder/primitives";
import { TextRenderer } from "@frontlit/text-editor";
import {
  descriptionContent,
  homeData,
  offerHref,
  sectionTheme,
} from "../shared/utils";
import type { HomeHeroSettings } from "./settings";
import { homeCtaLabel } from "./cta";

/**
 * Real data only: the tagline (or school name) as the headline, the first
 * offer's description and call to action. Renders nothing when the school has
 * neither a tagline nor an offer, so the header carries the page.
 */
export default function HomeHeroWidget({
  settings,
  state: { theme },
  pageData,
  editing,
}: WidgetProps<HomeHeroSettings>) {
  const resolvedTheme = sectionTheme(theme.theme, settings);
  const tagline = pageData.siteSubtitle?.trim() || "";
  const name = pageData.siteTitle?.trim() || "";
  const offer = homeData(pageData)?.offers[0] ?? null;
  const headline = tagline || (offer ? name : "");

  if (!headline) {
    return editing ? (
      <Section theme={resolvedTheme} id={settings.cssId} background={settings.background}>
        <Caption theme={resolvedTheme}>
          Homepage hero: shows your tagline and first offer once you add them.
        </Caption>
      </Section>
    ) : null;
  }

  const description = offer ? descriptionContent(offer.description) : null;
  const image = offer?.featuredImage;

  return (
    <Section theme={resolvedTheme} id={settings.cssId} background={settings.background}>
      <div
        className={`grid w-full items-center gap-8 ${image ? "md:grid-cols-2" : ""}`}
      >
        <div className="flex flex-col items-start gap-4">
          <Header1 theme={resolvedTheme}>{headline}</Header1>
          {description ? (
            <TextRenderer json={description} theme={resolvedTheme} />
          ) : null}
          {offer ? (
            <NavLink href={offerHref(offer)}>
              <Button theme={resolvedTheme}>{homeCtaLabel(offer)}</Button>
            </NavLink>
          ) : null}
        </div>
        {image ? (
          <PageCardImage
            theme={resolvedTheme}
            src={image.url}
            alt={image.alt || offer?.title || ""}
            className="aspect-[16/10] w-full object-cover"
          />
        ) : null}
      </div>
    </Section>
  );
}
