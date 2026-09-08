"use client";

import { useParams } from "next/navigation";
import { SectionAuthoring } from "@/components/products/section-authoring";

export default function NewSectionPage() {
  const params = useParams<{ productId: string }>();
  return <SectionAuthoring productId={params.productId} mode="new" />;
}
