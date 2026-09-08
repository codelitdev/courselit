"use client";

import { useParams, useSearchParams } from "next/navigation";
import { LessonAuthoring } from "@/components/products/lesson-authoring";

export default function LessonPage() {
  const params = useParams<{ productId: string; sectionId: string }>();
  const searchParams = useSearchParams();
  return (
    <LessonAuthoring
      productId={params.productId}
      sectionId={params.sectionId}
      lessonId={searchParams.get("id")}
    />
  );
}
