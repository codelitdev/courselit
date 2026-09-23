"use client";

import { useParams } from "next/navigation";
import { ProductCustomers } from "@/components/products/product-customers";

export default function ProductCustomersPage() {
  const params = useParams<{ productId: string }>();
  return <ProductCustomers productId={params.productId} />;
}
