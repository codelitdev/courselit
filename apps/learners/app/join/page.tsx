import type { Metadata } from "next";
import { PublicSitePage } from "@/components/public-site-page";

export const metadata: Metadata = {
  title: "Join",
};

/**
 * Community join is a system-owned public surface. It is composed from the
 * school's homepage header/footer plus the Community page block; it is not a
 * persisted FrontLit sales page.
 */
export default function JoinPage() {
  return <PublicSitePage pageSlug="join" allowEmpty systemRoute="join" />;
}
