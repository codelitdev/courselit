import type { Metadata } from "next";
import { PublicSitePage } from "@/components/public-site-page";

export const metadata: Metadata = {
  title: "Communities",
};

export default function PublicCommunitiesPage() {
  return <PublicSitePage pageSlug="communities" allowEmpty systemRoute="communities" />;
}
