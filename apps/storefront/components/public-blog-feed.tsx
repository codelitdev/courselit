"use client";

import {
  Caption,
  Header1,
  Header4,
  PageCard,
  PageCardContent,
  Subheader1,
  Text2,
} from "@frontlit/page-builder/primitives";
import Link from "next/link";
import { LearnerCardImage as PageCardImage } from "@/components/themed-page-builder";
import type { PublicArticle } from "@/lib/courselit-public";
import { useSchoolThemeStyle } from "@/lib/school-theme-context";

function featuredImageUrl(article: PublicArticle): string | null {
  return article.featuredImage?.thumbnailUrl ?? article.featuredImage?.url ?? null;
}

export function PublicBlogFeed({
  items,
  siteTitle,
  siteSubtitle,
}: {
  items: PublicArticle[];
  siteTitle?: string | null;
  siteSubtitle?: string | null;
}) {
  const theme = useSchoolThemeStyle();
  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-4">
        <Header1 theme={theme}>{siteTitle ? `${siteTitle} Blog` : "Blog"}</Header1>
        {siteSubtitle ? (
          <Subheader1 theme={theme} component="span">
            {siteSubtitle}
          </Subheader1>
        ) : null}
      </header>
      {items.length === 0 ? (
        <Text2 theme={theme}>No articles published yet.</Text2>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((post) => (
            <Link key={post.documentId} href={`/blog/${post.documentId}`}>
              <PageCard
                theme={theme}
                isLink
                className="h-full transition-transform hover:-translate-y-1"
              >
                {featuredImageUrl(post) ? (
                  <PageCardImage
                    theme={theme}
                    src={featuredImageUrl(post)!}
                    alt={post.featuredImage?.alt ?? post.title ?? post.slug}
                    className="aspect-video object-cover"
                  />
                ) : null}
                <PageCardContent theme={theme} className="flex h-full flex-col gap-3">
                  <Header4 theme={theme}>{post.title ?? post.slug}</Header4>
                  {post.excerpt ? <Text2 theme={theme}>{post.excerpt}</Text2> : null}
                  {post.publishedAt ? (
                    <Caption theme={theme}>
                      <time dateTime={post.publishedAt}>
                        {new Date(post.publishedAt).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </time>
                    </Caption>
                  ) : null}
                </PageCardContent>
              </PageCard>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
