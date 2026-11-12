"use client";

import { useParams } from "next/navigation";
import { PublicCourseViewer } from "@/components/public-course-viewer";

/** Reads the course and lesson from the URL for the persistent course viewer. */
export function CourseViewerRoute() {
  const params = useParams<{
    productSlug: string;
    productId: string;
    lessonId?: string;
  }>();
  return (
    <PublicCourseViewer
      productSlug={decodeURIComponent(params.productSlug)}
      productId={decodeURIComponent(params.productId)}
      lessonId={params.lessonId ? decodeURIComponent(params.lessonId) : undefined}
    />
  );
}
