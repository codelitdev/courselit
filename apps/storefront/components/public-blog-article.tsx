"use client";

import { Caption, Header1, Subheader1, Text2 } from "@frontlit/page-builder/primitives";
import { TextRenderer } from "@frontlit/text-editor";
import { CourseLitLogo } from "@/components/layout/courselit-logo";
import { TableOfContents } from "@/components/table-of-contents";
import {
  LearnerAvatar,
  LearnerAvatarFallback,
  LearnerAvatarImage,
  LearnerBadge,
  LearnerCardImage,
} from "@/components/themed-page-builder";
import type { PublicArticle } from "@/lib/courselit-public";
import { useSchoolBrand, useSchoolThemeStyle } from "@/lib/school-theme-context";

export function PublicBlogArticle({ article }: { article: PublicArticle }) {
  const theme = useSchoolThemeStyle();
  const { title: schoolTitle } = useSchoolBrand();
  const featuredImage = article.featuredImage;
  const imageUrl = featuredImage?.url ?? null;
  const imageAlt = featuredImage?.alt ?? article.title ?? article.slug;
  const title = article.title ?? article.slug;
  const author = article.author;
  const authorName = author?.name.trim() || schoolTitle?.trim() || "CourseLit";
  const createdAt = article.createdAt ?? article.publishedAt;
  const tags = Array.isArray(article.meta?.tags)
    ? [
        ...new Set(
          article.meta.tags
            .filter((tag): tag is string => typeof tag === "string")
            .map((tag) => tag.trim())
            .filter(Boolean),
        ),
      ]
    : [];

  const formatDate = (date: string) =>
    new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }).format(new Date(date));

  return (
    <article className="mx-auto flex w-full max-w-[640px] flex-col gap-6">
      <Header1 theme={theme}>{title}</Header1>
      {article.excerpt ? (
        <Subheader1 theme={theme}>{article.excerpt}</Subheader1>
      ) : null}
      <div className="mb-2 flex items-center gap-3">
        <LearnerAvatar className="size-10">
          {author?.imageUrl ? (
            <LearnerAvatarImage src={author.imageUrl} alt={authorName} />
          ) : (
            <LearnerAvatarFallback>
              <CourseLitLogo className="size-6" />
            </LearnerAvatarFallback>
          )}
        </LearnerAvatar>
        <div className="flex min-w-0 flex-col gap-1">
          <Text2 theme={theme}>{authorName}</Text2>
          {createdAt || article.updatedAt ? (
            <Caption theme={theme} className="text-muted-foreground">
              {createdAt ? (
                <time dateTime={createdAt}>{formatDate(createdAt)}</time>
              ) : null}
              {createdAt && article.updatedAt ? (
                <span aria-hidden="true"> · </span>
              ) : null}
              {article.updatedAt ? (
                <>
                  Updated{" "}
                  <time dateTime={article.updatedAt}>
                    {formatDate(article.updatedAt)}
                  </time>
                </>
              ) : null}
            </Caption>
          ) : null}
        </div>
      </div>
      {imageUrl ? (
        <LearnerCardImage
          theme={theme}
          src={imageUrl}
          alt={imageAlt}
          className="aspect-video w-full border object-cover"
        />
      ) : null}
      {article.content ? (
        <div className="flex flex-col gap-4">
          <TableOfContents json={article.content} />
          <TextRenderer json={article.content} theme={theme} />
        </div>
      ) : null}
      {tags.length > 0 ? (
        <ul aria-label="Article tags" className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <li key={tag}>
              <LearnerBadge variant="secondary">{tag}</LearnerBadge>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
