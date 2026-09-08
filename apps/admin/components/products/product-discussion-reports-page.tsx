"use client";

import { useParams } from "next/navigation";
import { AuthGate } from "@/components/auth-gate";
import { useSetBreadcrumb } from "@/components/layout/breadcrumb-context";
import { PageHeader } from "@/components/layout/page-header";
import { ProductDiscussionReports } from "@/components/products/product-discussion-reports";

export function ProductDiscussionReportsPage() {
  const params = useParams<{ productId: string }>();
  const productId = params.productId;
  const productHref = `/products/${encodeURIComponent(productId)}`;

  useSetBreadcrumb([
    { label: "Products", href: "/products" },
    { label: "Product", href: productHref },
    { label: "Settings", href: `${productHref}/manage` },
    { label: "Discussions" },
    { label: "Reported content" },
  ]);

  return (
    <AuthGate>
      <main className="page-shell">
        <PageHeader
          title="Reported content"
          description="Review reported learner discussions for this product."
        />
        <ProductDiscussionReports productId={productId} />
      </main>
    </AuthGate>
  );
}
