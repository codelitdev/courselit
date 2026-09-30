import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PublicBlogArticle } from "@/components/public-blog-article";
import { loadPublicPage, PublicSitePage } from "@/components/public-site-page";
import { getPublicArticleBySlug, listPublicArticles } from "@/lib/courselit-public";

interface Props {
  params: Promise<{ schoolId: string; slug: string }>;
}

async function loadBlogArticle(slug: string, schoolId?: string) {
  const { host } = await loadPublicPage("", schoolId);
  const bySlug = await getPublicArticleBySlug(host, slug);
  if (bySlug) return bySlug;
  const articles = await listPublicArticles(host);
  return articles.items.find((article) => article.documentId === slug) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { schoolId, slug } = await params;
  const article = await loadBlogArticle(slug, schoolId);
  return article
    ? { title: article.title ?? article.slug }
    : { title: "Post not found" };
}

export default async function PublicBlogArticlePage({ params }: Props) {
  const { schoolId, slug } = await params;
  const article = await loadBlogArticle(slug, schoolId);
  if (!article) notFound();
  if (article.documentId === slug) {
    redirect(`/blog/${encodeURIComponent(article.slug)}`);
  }

  return (
    <PublicSitePage
      pageSlug={`blog/${article.slug}`}
      systemRoute="blog"
      systemContent={<PublicBlogArticle article={article} />}
      schoolId={schoolId}
    />
  );
}
