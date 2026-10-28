"use client";

import { useParams } from "next/navigation";
import { DripEmailEditor } from "@/components/products/drip-email-editor";

export default function SectionDripEmailRoute() {
  const params = useParams<{ productId: string; sectionId: string }>();
  return <DripEmailEditor productId={params.productId} sectionId={params.sectionId} />;
}
