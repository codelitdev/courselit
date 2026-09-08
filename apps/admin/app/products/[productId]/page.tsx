"use client";

import { useParams } from "next/navigation";
import { ProductWorkspace } from "@/components/products/product-workspace";

export default function ProductPage() {
  const params = useParams<{ productId: string }>();
  return <ProductWorkspace productId={params.productId} view="overview" />;
}
