"use client";

import type { ThemeStyle } from "@frontlit/page-builder/models";
import type { MediaRef } from "@courselit/api-contract";
import { Caption, Header1, Text2 } from "@frontlit/page-builder/primitives";
import { type TextEditorContent, TextRenderer } from "@frontlit/text-editor";
import Link from "next/link";
import { useEffect, useState } from "react";
import { LearnerCard, LearnerCardImage } from "@/components/themed-page-builder";
import { learnerHeaders } from "@/lib/school";
import { useSchoolThemeStyle } from "@/lib/school-theme-context";
import {
  ProductCurriculumBlock,
  type ProductPlan,
  ProductPurchaseBlock,
} from "./product-page-blocks";

type PublicProduct = {
  id: string;
  slug: string;
  kind: "course" | "download";
  title: string;
  description: string;
  enrolled: boolean;
  featuredImage: MediaRef | null;
  sections: Array<{ id: string; title: string }>;
  lessons: Array<{
    id: string;
    title: string;
    status: string;
    sectionId: string | null;
    requiresEnrollment: boolean;
  }>;
};

function ProductDescription({ value, theme }: { value: string; theme: ThemeStyle }) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as TextEditorContent;
    if (parsed.type === "doc" && Array.isArray(parsed.content)) {
      return <TextRenderer json={parsed} theme={theme} className="lesson-rich-text" />;
    }
  } catch {
    // Descriptions created before rich-text support are plain strings.
  }
  return <Text2 theme={theme}>{value}</Text2>;
}

export function PublicProductDetail({ productId }: { productId: string }) {
  const theme = useSchoolThemeStyle();
  const [product, setProduct] = useState<PublicProduct | null>(null);
  const [plans, setPlans] = useState<ProductPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyPlanId, setBusyPlanId] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void Promise.all([
      fetch(`/api/v1/products/${encodeURIComponent(productId)}`, {
        credentials: "include",
        cache: "no-store",
        headers: learnerHeaders(),
      }),
      fetch(`/api/v1/storefront/products/${encodeURIComponent(productId)}/plans`, {
        credentials: "include",
        cache: "no-store",
        headers: learnerHeaders(),
      }),
    ])
      .then(async ([productResponse, plansResponse]) => {
        if (!active) return;
        if (!productResponse.ok) {
          setError("This product is not available.");
          return;
        }
        setProduct((await productResponse.json()) as PublicProduct);
        if (plansResponse.ok) {
          const body = (await plansResponse.json()) as { items?: ProductPlan[] };
          setPlans(body.items ?? []);
          setSelectedPlanId(null);
        }
      })
      .catch(() => {
        if (active) setError("Unable to load this product.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [productId]);

  async function choosePlan(plan: ProductPlan) {
    setError(null);
    setBusyPlanId(plan.id);
    try {
      const response = await fetch("/api/v1/storefront/checkout-sessions", {
        method: "POST",
        credentials: "include",
        headers: learnerHeaders({
          "content-type": "application/json",
        }),
        body: JSON.stringify({ productId, planId: plan.id }),
      });
      if (!response.ok) throw new Error("Unable to start checkout.");
      const body = (await response.json()) as { id?: string };
      if (!body.id) throw new Error("Unable to create checkout session.");
      window.location.assign(`/checkout?session=${encodeURIComponent(body.id)}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to continue.");
    } finally {
      setBusyPlanId(null);
    }
  }

  if (loading) return <Text2 theme={theme}>Loading product…</Text2>;
  if (error || !product) {
    return <Text2 theme={theme}>{error ?? "This product is not available."}</Text2>;
  }

  return (
    <div className="flex flex-col gap-16">
      <section id="checkout" className="scroll-mt-24">
        <div className="grid items-center gap-10 md:grid-cols-2">
          {product.featuredImage ? (
            <LearnerCardImage
              theme={theme}
              src={product.featuredImage.thumbnailUrl ?? product.featuredImage.url}
              alt={product.featuredImage.alt || product.title}
              className="aspect-[4/3] w-full border object-cover"
            />
          ) : (
            <LearnerCard className="hidden aspect-[4/3] border-dashed bg-muted/30 p-0 md:block">
              <span aria-hidden />
            </LearnerCard>
          )}
          <div className="flex flex-col items-start gap-4">
            <Caption theme={theme}>
              {product.kind === "course" ? "Course" : "Digital download"}
            </Caption>
            <Header1 theme={theme}>{product.title}</Header1>
            <ProductDescription value={product.description} theme={theme} />
            <ProductPurchaseBlock
              plans={plans}
              theme={theme}
              busyPlanId={busyPlanId}
              selectedPlanId={selectedPlanId}
              onSelectPlan={setSelectedPlanId}
              onChoosePlan={(plan) => void choosePlan(plan)}
              continueHref={
                product.enrolled
                  ? `/course/${encodeURIComponent(product.slug)}/${encodeURIComponent(product.id)}`
                  : undefined
              }
            />
          </div>
        </div>
      </section>

      {product.kind === "course" ? (
        <ProductCurriculumBlock product={product} theme={theme} />
      ) : null}
      <Link href="/products" className="w-fit">
        <Text2 theme={theme} className="hover:underline">
          ← All products
        </Text2>
      </Link>
    </div>
  );
}
