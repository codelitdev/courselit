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
import { CourseLitLogo } from "@/components/layout/courselit-logo";
import {
  LearnerAvatar,
  LearnerAvatarFallback,
  LearnerAvatarImage,
  LearnerCardImage as PageCardImage,
} from "@/components/themed-page-builder";
import type { PublicArticle } from "@/lib/courselit-public";
import { useSchoolBrand, useSchoolThemeStyle } from "@/lib/school-theme-context";

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
  const { title: schoolTitle } = useSchoolBrand();
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
            <Link key={post.documentId} href={`/blog/${post.slug}`}>
              <PageCard
                theme={theme}
                isLink
                className="h-full transition-transform hover:-translate-y-1"
              >
                <PageCardImage
                  theme={theme}
                  src={featuredImageUrl(post) ?? "/courselit_backdrop_square.webp"}
                  alt={
                    post.featuredImage?.alt ??
                    (featuredImageUrl(post) ? (post.title ?? post.slug) : "CourseLit")
                  }
                  className="aspect-video object-cover"
                  style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
                />
                <PageCardContent theme={theme} className="flex h-full flex-col gap-3">
                  <Header4 theme={theme}>{post.title ?? post.slug}</Header4>
                  {post.excerpt ? <Text2 theme={theme}>{post.excerpt}</Text2> : null}
                  <div className="flex items-center gap-2">
                    <LearnerAvatar className="size-8">
                      {post.author?.imageUrl ? (
                        <LearnerAvatarImage
                          src={post.author.imageUrl}
                          alt={post.author.name || "Author"}
                        />
                      ) : (
                        <LearnerAvatarFallback>
                          <CourseLitLogo className="size-5" />
                        </LearnerAvatarFallback>
                      )}
                    </LearnerAvatar>
                    <Subheader1 theme={theme} component="span">
                      {post.author?.name.trim() || schoolTitle?.trim() || "CourseLit"}
                    </Subheader1>
                  </div>
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
