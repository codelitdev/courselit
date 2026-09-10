import { PublicCourseDiscussions } from "@/components/public-course-viewer";

export default async function CourseDiscussionsPage({
  params,
}: {
  params: Promise<{ productSlug: string; productId: string }>;
}) {
  const { productSlug, productId } = await params;
  return <PublicCourseDiscussions productSlug={productSlug} productId={productId} />;
}
