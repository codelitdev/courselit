import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { loadPublicPage } from "@/components/public-site-page";
import { getPublicArticleBySlug } from "@/lib/courselit-public";

interface Props {
  params: Promise<{ slug: string; id: string }>;
}

async function loadBlogArticle({ slug, id }: { slug: string; id: string }) {
  const { host } = await loadPublicPage("");
  const article = await getPublicArticleBySlug(host, slug);
  return article?.documentId === id ? article : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = await loadBlogArticle(await params);
  if (!article) return { title: "Post not found" };
  const image = article.featuredImage;
  const imageUrl = image?.url ?? null;
  return {
    title: article.title ?? article.slug,
    description: article.excerpt ?? undefined,
    openGraph: imageUrl ? { images: [{ url: imageUrl }] } : undefined,
  };
}

export default async function PublicBlogArticlePage({ params }: Props) {
  const route = await params;
  const article = await loadBlogArticle(route);
  if (!article) notFound();
  if (article.documentId !== route.id) notFound();
  redirect(`/blog/${encodeURIComponent(article.slug)}`);
}
