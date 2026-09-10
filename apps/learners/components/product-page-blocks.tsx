import type { ThemeStyle } from "@frontlit/page-builder/models";
import {
  Badge,
  Button,
  Header1,
  Header4,
  PageCard,
  Text2,
} from "@frontlit/page-builder/primitives";
import { ChevronDown, Link2 } from "lucide-react";
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
  isDefault?: boolean;
};

type ProductCurriculum = {
  id: string;
  slug?: string;
  kind: "course" | "download";
  sections: Array<{ id: string; title: string }>;
  lessons: Array<{
    id: string;
    title: string;
    status: string;
    sectionId?: string | null;
    requiresEnrollment?: boolean;
  }>;
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

/** CourseLit-owned curriculum block injected into a product sales page. */
export function ProductCurriculumBlock({
  product,
  theme,
}: {
  product: ProductCurriculum;
  theme: ThemeStyle;
}) {
  const unsectioned = product.lessons.filter((lesson) => !lesson.sectionId);
  const groups = [
    ...product.sections.map((section) => ({
      ...section,
      lessons: product.lessons.filter((lesson) => lesson.sectionId === section.id),
    })),
    ...(unsectioned.length > 0
      ? [{ id: "unsectioned", title: "Additional content", lessons: unsectioned }]
      : []),
  ];

  return (
    <section id="curriculum" className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <Header1 theme={theme} className="text-center">
        Content
      </Header1>
      {groups.length > 0 ? (
        <PageCard theme={theme} className="overflow-hidden p-0">
          {groups.map((group, index) => (
            <details
              key={group.id}
              open={index === 0}
              className="group border-b last:border-b-0"
            >
              <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-4 transition-colors hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
                <Text2
                  theme={theme}
                  component="span"
                  className="min-w-0 flex-1 font-medium"
                >
                  {group.title}
                </Text2>
                <Badge theme={theme} variant="outline">
                  {group.lessons.length}{" "}
                  {group.lessons.length === 1 ? "lesson" : "lessons"}
                </Badge>
                <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <div className="border-t border-border px-2 py-2">
                {group.lessons.length > 0 ? (
                  group.lessons.map((lesson) => {
                    const previewable = lesson.requiresEnrollment === false;
                    const href = `/course/${encodeURIComponent(product.slug || product.id)}/${encodeURIComponent(product.id)}/${encodeURIComponent(lesson.id)}`;
                    const content = (
                      <Text2
                        key={lesson.id}
                        theme={theme}
                        component="span"
                        className="flex min-w-0 flex-1 items-center gap-2"
                      >
                        <Link2 className="size-3.5 shrink-0 text-muted-foreground" />
                        <Text2 theme={theme} component="span" className="truncate">
                          {lesson.title}
                        </Text2>
                      </Text2>
                    );
                    return previewable ? (
                      <Link
                        key={lesson.id}
                        href={href}
                        className="flex items-center gap-3 rounded px-2 py-2 text-sm transition-colors hover:bg-muted"
                      >
                        {content}
                        <Badge theme={theme} variant="outline" className="shrink-0">
                          Preview
                        </Badge>
                      </Link>
                    ) : (
                      <div
                        key={lesson.id}
                        className="flex items-center gap-3 px-2 py-2 text-sm"
                      >
                        {content}
                      </div>
                    );
                  })
                ) : (
                  <Text2 theme={theme} className="px-2 py-2 text-muted-foreground">
                    No lessons in this section yet.
                  </Text2>
                )}
              </div>
            </details>
          ))}
        </PageCard>
      ) : (
        <Text2 theme={theme} className="text-center text-muted-foreground">
          {product.kind === "course"
            ? "The curriculum will appear here soon."
            : "The downloadable files will appear here soon."}
        </Text2>
      )}
    </section>
  );
}

/** Purchase controls used by the product sales-page banner. */
export function ProductPurchaseBlock({
  plans,
  theme,
  busyPlanId,
  onChoosePlan,
  selectedPlanId,
  onSelectPlan,
  continueHref,
}: {
  plans: ProductPlan[];
  theme: ThemeStyle;
  busyPlanId: string | null;
  onChoosePlan: (plan: ProductPlan) => void;
  selectedPlanId: string | null;
  onSelectPlan: (planId: string) => void;
  continueHref?: string;
}) {
  const selectedPlan =
    plans.find((plan) => plan.id === selectedPlanId) ??
    plans.find((plan) => plan.isDefault) ??
    plans[0];

  if (!selectedPlan) {
    return <Text2 theme={theme}>This product is not available for checkout yet.</Text2>;
  }

  return (
    <div className="flex flex-col items-start gap-4">
      {plans.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {plans.map((plan) => (
            <Button
              key={plan.id}
              type="button"
              theme={theme}
              variant={selectedPlan.id === plan.id ? "secondary" : "outline"}
              size="sm"
              onClick={() => onSelectPlan(plan.id)}
            >
              {plan.name}
            </Button>
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-4">
        <Header4 theme={theme}>{formatProductPlanPrice(selectedPlan)}</Header4>
        <Button
          theme={theme}
          type="button"
          disabled={busyPlanId !== null}
          onClick={() => onChoosePlan(selectedPlan)}
        >
          {busyPlanId === selectedPlan.id
            ? "Please wait…"
            : selectedPlan.type === "free"
              ? "Start learning for free"
              : "Buy now"}
        </Button>
      </div>
      {selectedPlan.description ? (
        <Text2 theme={theme} className="max-w-md text-muted-foreground">
          {selectedPlan.description}
        </Text2>
      ) : null}
      {continueHref ? (
        <Link href={continueHref}>
          <Text2 theme={theme} className="font-medium hover:underline">
            Continue learning
          </Text2>
        </Link>
      ) : null}
    </div>
  );
}
