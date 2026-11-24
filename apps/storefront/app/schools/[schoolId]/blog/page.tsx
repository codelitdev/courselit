import type { Metadata } from "next";
import { PublicSitePage } from "@/components/public-site-page";

export const metadata: Metadata = {
  title: "Blog",
  alternates: { types: { "application/rss+xml": "/blog/rss.xml" } },
};

export default async function PublicBlogPage({
  params,
}: {
  params: Promise<{ schoolId: string }>;
}) {
  const { schoolId } = await params;
  return (
    <PublicSitePage
      pageSlug="blog"
      allowEmpty
      systemRoute="blog"
      schoolId={schoolId}
    />
  );
}
