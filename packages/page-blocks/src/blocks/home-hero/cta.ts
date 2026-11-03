import type { CourseLitHomeOffer } from "../shared/types";

export function homeCtaLabel(offer: CourseLitHomeOffer): string {
  return offer.kind === "community"
    ? "Join the community"
    : offer.kind === "download"
      ? "Get the download"
      : "Start learning";
}
