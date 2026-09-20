import Link from "next/link";
import type { ReactNode } from "react";
import type { MediaRef } from "@courselit/api-contract";
import {
  LearnerBadge,
  LearnerCaption,
  LearnerCard,
  LearnerCardContent,
  LearnerCardImage,
  LearnerHeader4,
} from "@/components/themed-page-builder";

const DEFAULT_CARD_IMAGE = "/courselit_backdrop_square.webp";

type CatalogImage = MediaRef | null;

export function formatCatalogPrice(
  priceMinor: number | null,
  currency: string,
): string {
  if (priceMinor === null) return "Free access";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(priceMinor / 100);
}

export function PublicCatalogCard({
  href,
  title,
  image,
  priceMinor,
  currency,
  meta,
}: {
  href: string;
  title: string;
  image: CatalogImage;
  priceMinor: number | null;
  currency: string;
  meta: ReactNode;
}) {
  return (
    <Link href={href} className="group block h-full">
      <LearnerCard
        isLink
        className="h-full overflow-hidden transition-transform group-hover:-translate-y-1"
      >
        <LearnerCardImage
          src={image?.thumbnailUrl ?? image?.url ?? DEFAULT_CARD_IMAGE}
          alt={image?.alt || title}
          className="aspect-[16/9] w-full object-cover"
        />
        <LearnerCardContent className="flex h-full flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <LearnerHeader4>{title}</LearnerHeader4>
            <LearnerBadge variant="secondary">
              {formatCatalogPrice(priceMinor, currency)}
            </LearnerBadge>
          </div>
          <LearnerCaption>{meta}</LearnerCaption>
        </LearnerCardContent>
      </LearnerCard>
    </Link>
  );
}
