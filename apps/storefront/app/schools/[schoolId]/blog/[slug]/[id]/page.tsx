import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { loadPublicPage } from "@/components/public-site-page";
import { getPublicArticleBySlug } from "@/lib/courselit-public";

interface Props {
  params: Promise<{ schoolId: string; slug: string; id: string }>;
}

async function loadBlogArticle({
  slug,
  id,
  schoolId,
}: {
  slug: string;
  id: string;
  schoolId?: string;
}) {
  const { host } = await loadPublicPage("", schoolId);
  const article = await getPublicArticleBySlug(host, slug);
  return article?.documentId === id ? article : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { schoolId, slug, id } = await params;
  const article = await loadBlogArticle({ slug, id, schoolId });
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
  const { schoolId, slug, id } = await params;
  const article = await loadBlogArticle({ slug, id, schoolId });
  if (!article) notFound();
  if (article.documentId !== id) notFound();
  redirect(`/blog/${encodeURIComponent(article.slug)}`);
}
