import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicBlogArticle } from "@/components/public-blog-article";
import { loadPublicPage, PublicSitePage } from "@/components/public-site-page";
import { getPublicArticleBySlug, listPublicArticles } from "@/lib/courselit-public";

interface Props {
  params: Promise<{ slug: string }>;
}

async function loadBlogArticle(slug: string) {
  const { host } = await loadPublicPage("");
  const bySlug = await getPublicArticleBySlug(host, slug);
  if (bySlug) return bySlug;
  const articles = await listPublicArticles(host);
  return articles.items.find((article) => article.documentId === slug) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = await loadBlogArticle((await params).slug);
  return article
    ? { title: article.title ?? article.slug }
    : { title: "Post not found" };
}

export default async function PublicBlogArticleByIdPage({ params }: Props) {
  const { slug } = await params;
  const article = await loadBlogArticle(slug);
  if (!article) notFound();
  return (
    <PublicSitePage
      pageSlug={`blog/${slug}`}
      systemRoute="blog"
      systemContent={<PublicBlogArticle article={article} />}
    />
  );
}
