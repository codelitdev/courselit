import { PublicCourseViewer } from "@/components/public-course-viewer";

export default async function CoursePage({
  params,
}: {
  params: Promise<{ productSlug: string; productId: string }>;
}) {
  const { productSlug, productId } = await params;
  return <PublicCourseViewer productSlug={productSlug} productId={productId} />;
}
