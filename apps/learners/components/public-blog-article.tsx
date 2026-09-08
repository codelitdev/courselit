"use client";

import { TextRenderer } from "@frontlit/text-editor";
import { Caption, Header1, Text2 } from "@frontlit/page-builder/primitives";
import Link from "next/link";
import type { PublicArticle } from "@/lib/courselit-public";
import { useSchoolThemeStyle } from "@/lib/school-theme-context";

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function PublicBlogArticle({ article }: { article: PublicArticle }) {
  const theme = useSchoolThemeStyle();
  const featuredImage = article.featuredImage;
  const imageUrl = featuredImage
    ? (stringValue(featuredImage.url) ?? stringValue(featuredImage.file))
    : null;
  const imageAlt = featuredImage
    ? (stringValue(featuredImage.alt) ??
      stringValue(featuredImage.caption) ??
      article.title ??
      article.slug)
    : (article.title ?? article.slug);

  return (
    <article className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Link href="/blog" className="w-fit">
        <Text2 theme={theme} className="hover:underline">
          ← Blog
        </Text2>
      </Link>
      <Header1 theme={theme}>{article.title ?? article.slug}</Header1>
      {article.publishedAt || article.updatedAt ? (
        <Caption theme={theme}>
          <time dateTime={article.publishedAt ?? article.updatedAt ?? undefined}>
            {new Date(article.publishedAt ?? article.updatedAt!).toLocaleDateString(
              undefined,
              {
                year: "numeric",
                month: "long",
                day: "numeric",
              },
            )}
          </time>
        </Caption>
      ) : null}
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={imageAlt}
          className="w-full rounded-lg border object-cover"
        />
      ) : null}
      {article.content ? <TextRenderer json={article.content} theme={theme} /> : null}
    </article>
  );
}
