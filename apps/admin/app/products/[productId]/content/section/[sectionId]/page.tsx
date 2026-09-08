"use client";

import { useParams } from "next/navigation";
import { SectionAuthoring } from "@/components/products/section-authoring";

export default function EditSectionPage() {
  const params = useParams<{ productId: string; sectionId: string }>();
  return (
    <SectionAuthoring
      productId={params.productId}
      sectionId={params.sectionId}
      mode="edit"
    />
  );
}
