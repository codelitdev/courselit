import { PublicCourseViewer } from "@/components/public-course-viewer";

export default async function CourseLessonPage({
  params,
}: {
  params: Promise<{ productSlug: string; productId: string; lessonId: string }>;
}) {
  const { productSlug, productId, lessonId } = await params;
  return (
    <PublicCourseViewer
      productSlug={productSlug}
      productId={productId}
      lessonId={lessonId}
    />
  );
}
