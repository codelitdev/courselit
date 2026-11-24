import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PublicBlogArticle } from "@/components/public-blog-article";
import { PublicSitePage } from "@/components/public-site-page";
import { JsonLd } from "@/components/json-ld";
import {
  getPublicArticleBySlug,
  getSettings,
  listPublicArticles,
} from "@/lib/courselit-public";
import { articleJsonLd } from "@/lib/structured-data";

const RSS_ALTERNATE = { types: { "application/rss+xml": "/blog/rss.xml" } };

interface Props {
  params: Promise<{ schoolId: string; slug: string }>;
}

async function loadBlogArticle(slug: string, schoolId: string) {
  const bySlug = await getPublicArticleBySlug(schoolId, slug);
  if (bySlug) return bySlug;
  const articles = await listPublicArticles(schoolId);
  return articles.items.find((article) => article.blogId === slug) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { schoolId, slug } = await params;
  const article = await loadBlogArticle(slug, schoolId);
  return article
    ? { title: article.title ?? article.slug, alternates: RSS_ALTERNATE }
    : { title: "Post not found" };
}

export default async function PublicBlogArticlePage({ params }: Props) {
  const { schoolId, slug } = await params;
  const article = await loadBlogArticle(slug, schoolId);
  if (!article) notFound();
  if (article.blogId === slug) {
    redirect(`/blog/${encodeURIComponent(article.slug)}`);
  }

  const settings = await getSettings(schoolId);
  return (
    <>
      <JsonLd data={articleJsonLd(settings, article)} />
      <PublicSitePage
        pageSlug={`blog/${article.slug}`}
        systemRoute="blog"
        systemContent={<PublicBlogArticle article={article} />}
        schoolId={schoolId}
      />
    </>
  );
}
