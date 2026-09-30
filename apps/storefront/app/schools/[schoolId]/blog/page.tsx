import type { Metadata } from "next";
import { PublicSitePage } from "@/components/public-site-page";

export const metadata: Metadata = { title: "Blog" };

export default function PublicBlogPage() {
  return <PublicSitePage pageSlug="blog" allowEmpty systemRoute="blog" />;
}
