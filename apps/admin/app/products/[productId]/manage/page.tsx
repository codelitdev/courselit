"use client";

import { useParams } from "next/navigation";
import { ProductWorkspace } from "@/components/products/product-workspace";

export default function ProductManagePage() {
  const params = useParams<{ productId: string }>();
  return <ProductWorkspace productId={params.productId} view="manage" />;
}
