"use client";

import { useParams } from "next/navigation";
import { PageLessonEditor } from "@/components/products/page-lesson-editor";

export default function EditLessonRoute() {
  const params = useParams<{ productId: string; lessonId: string }>();
  return <PageLessonEditor productId={params.productId} lessonId={params.lessonId} />;
}
