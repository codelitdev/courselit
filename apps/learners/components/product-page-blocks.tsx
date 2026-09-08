import type { ThemeStyle } from "@frontlit/page-builder/models";
import {
  Badge,
  Button,
  Header2,
  Header4,
  PageCard,
  PageCardContent,
  Text2,
} from "@frontlit/page-builder/primitives";
import Link from "next/link";

export type ProductPlan = {
  id: string;
  name: string;
  description: string;
  type: "free" | "onetime" | "emi" | "subscription";
  currency: string;
  amountMinor: number;
  billingInterval: "month" | "year" | null;
  installmentCount: number | null;
};

type ProductCurriculum = {
  kind: "course" | "download";
  sections: Array<{ id: string; title: string }>;
  lessons: Array<{ id: string; title: string; status: string }>;
};

export function formatProductPlanPrice(plan: ProductPlan): string {
  if (plan.type === "free") return "Free";
  const price = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: plan.currency,
  }).format(plan.amountMinor / 100);
  if (plan.type === "subscription" && plan.billingInterval) {
    return `${price} / ${plan.billingInterval}`;
  }
  if (plan.type === "emi" && plan.installmentCount) {
    return `${price} × ${plan.installmentCount}`;
  }
  return price;
}

/** CourseLit-owned dynamic block for the curriculum injected into a product page. */
export function ProductCurriculumBlock({
  product,
  theme,
}: {
  product: ProductCurriculum;
  theme: ThemeStyle;
}) {
  return (
    <PageCard theme={theme} className="h-fit">
      <PageCardContent theme={theme} className="flex flex-col gap-4">
        <Header2 theme={theme}>What&apos;s included</Header2>
        <Text2 theme={theme}>
          {product.kind === "course"
            ? `${product.lessons.length} lessons across ${product.sections.length} sections.`
            : `${product.lessons.length} downloadable files.`}
        </Text2>
        {product.lessons.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {product.lessons.slice(0, 8).map((lesson) => (
              <li key={lesson.id}>
                <Text2 theme={theme}>{lesson.title}</Text2>
              </li>
            ))}
          </ul>
        ) : null}
      </PageCardContent>
    </PageCard>
  );
}

/** CourseLit-owned dynamic purchase block composed from FrontLit primitives. */
export function ProductPurchaseBlock({
  productId,
  plans,
  theme,
  busyPlanId,
  onChoosePlan,
  enrolled,
}: {
  productId: string;
  plans: ProductPlan[];
  theme: ThemeStyle;
  busyPlanId: string | null;
  onChoosePlan: (plan: ProductPlan) => void;
  enrolled: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Header4 theme={theme}>Choose access</Header4>
      {plans.length === 0 ? (
        <PageCard theme={theme}>
          <PageCardContent theme={theme} className="flex flex-col gap-4">
            <Text2 theme={theme}>This product is not available for checkout yet.</Text2>
          </PageCardContent>
        </PageCard>
      ) : (
        plans.map((plan) => (
          <PageCard key={plan.id} theme={theme}>
            <PageCardContent theme={theme} className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <Header4 theme={theme}>{plan.name}</Header4>
                <Badge theme={theme} variant="secondary">
                  {formatProductPlanPrice(plan)}
                </Badge>
              </div>
              {plan.description ? (
                <Text2 theme={theme}>{plan.description}</Text2>
              ) : null}
              <Button
                theme={theme}
                type="button"
                disabled={busyPlanId !== null}
                onClick={() => onChoosePlan(plan)}
              >
                {busyPlanId === plan.id
                  ? "Please wait…"
                  : plan.type === "free"
                    ? "Get access"
                    : "Buy now"}
              </Button>
            </PageCardContent>
          </PageCard>
        ))
      )}
      {enrolled ? (
        <Button theme={theme} variant="outline" asChild>
          <Link href={`/dashboard/courses/${encodeURIComponent(productId)}`}>
            Continue learning
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
