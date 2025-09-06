"use client";

import { RadioGroupItem } from "@/components/ui/radio-group";
import { FormControl, FormItem, FormLabel } from "@/components/ui/form";
import {
    Badge,
    Header3,
    PageCard,
    PageCardContent,
    PageCardHeader,
    Text2,
} from "@courselit/page-primitives";
import { Text1 } from "@courselit/page-primitives";
import { Star, Package } from "lucide-react";
import { PaymentPlan, Course, Constants } from "@courselit/common-models";
import { getPlanPrice } from "@ui-lib/utils";

const { PaymentPlanType: paymentPlanType } = Constants;

export interface PaymentPlanCardProps {
    plan: PaymentPlan;
    isSelected: boolean;
    isRecommended: boolean;
    isLoggedIn: boolean;
    currencySymbol: string;
    includedProducts: Course[];
    theme: any;
}

function getIncludedProductsDescription(
    plan: PaymentPlan,
    includedProducts: Course[],
): Course[] {
    if (!plan) {
        return [];
    }

    if (plan.includedProducts && plan.includedProducts.length > 0) {
        const includedProductsList = includedProducts.filter((product) =>
            plan.includedProducts?.includes(product.courseId),
        );
        return includedProductsList;
    }

    return [];
}

export function PaymentPlanCard({
    plan,
    isSelected,
    isRecommended,
    isLoggedIn,
    currencySymbol,
    includedProducts,
    theme,
}: PaymentPlanCardProps) {
    const planPrice = getPlanPrice(plan);
    const planIncludedProducts = getIncludedProductsDescription(
        plan,
        includedProducts,
    );

    return (
        <FormItem className="flex items-start space-x-3 space-y-0">
            <FormControl>
                <RadioGroupItem
                    value={plan.planId}
                    disabled={!isLoggedIn}
                    className="mt-1"
                />
            </FormControl>
            <div className="flex-1">
                <FormLabel className="cursor-pointer">
                    <PageCard
                        theme={theme.theme}
                        className={`transition-all ${
                            isSelected
                                ? "border-primary ring-2 ring-primary/20"
                                : isLoggedIn
                                  ? "hover:border-muted-foreground/50"
                                  : ""
                        } ${!isLoggedIn ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                        <PageCardContent theme={theme.theme}>
                            <PageCardHeader theme={theme.theme}>
                                <div className="flex items-center gap-2">
                                    {plan.name}
                                    {isRecommended && (
                                        <Badge
                                            theme={theme.theme}
                                            variant="default"
                                            className="flex items-center gap-1"
                                        >
                                            <Star className="w-3 h-3" />
                                            Recommended
                                        </Badge>
                                    )}
                                    {/* {isRecommended && (
                                        <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                                            <Star className="w-3 h-3" />
                                            Recommended
                                        </div>
                                    )} */}
                                </div>
                            </PageCardHeader>
                            {/* <div className="mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="text-lg font-semibold">
                                        {plan.name}
                                    </div>
                                    {isRecommended && (
                                        <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                                            <Star className="w-3 h-3" />
                                            Recommended
                                        </div>
                                    )}
                                </div>
                            </div> */}

                            <div className="mb-4">
                                <div className="flex items-baseline gap-1">
                                    <Header3 theme={theme.theme}>
                                        {currencySymbol}
                                        {planPrice.amount.toFixed(2)}
                                    </Header3>
                                    {planPrice.period && (
                                        <Text2
                                            theme={theme.theme}
                                            className="text-muted-foreground text-sm"
                                        >
                                            {planPrice.period}
                                        </Text2>
                                    )}
                                </div>
                                {plan.type === paymentPlanType.ONE_TIME && (
                                    <Text2
                                        theme={theme.theme}
                                        className="text-muted-foreground text-sm"
                                    >
                                        one-time
                                    </Text2>
                                )}
                            </div>

                            <div className="space-y-3">
                                {planIncludedProducts.length > 0 && (
                                    <div className="flex items-center gap-2 text-sm text-foreground">
                                        <Package className="w-4 h-4 text-muted-foreground" />
                                        <Text2 theme={theme.theme}>
                                            {planIncludedProducts.length}{" "}
                                            products included
                                        </Text2>
                                    </div>
                                )}

                                {planIncludedProducts.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {planIncludedProducts.map((product) => (
                                            <Badge
                                                key={product.title}
                                                theme={theme.theme}
                                                variant="secondary"
                                            >
                                                {product.title}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {plan.description && (
                                <div className="mt-4">
                                    <Text1
                                        theme={theme.theme}
                                        className="text-sm text-muted-foreground whitespace-pre-wrap"
                                    >
                                        {plan.description}
                                    </Text1>
                                </div>
                            )}
                        </PageCardContent>
                    </PageCard>
                </FormLabel>
            </div>
        </FormItem>
    );
}
