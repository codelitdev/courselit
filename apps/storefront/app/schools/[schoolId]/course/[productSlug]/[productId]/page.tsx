import { PublicCourseViewer } from "@/components/public-course-viewer";

export default async function CoursePage({
  params,
}: {
  params: Promise<{ schoolId: string; productSlug: string; productId: string }>;
}) {
  const { productSlug, productId } = await params;
  return <PublicCourseViewer productSlug={productSlug} productId={productId} />;
}
