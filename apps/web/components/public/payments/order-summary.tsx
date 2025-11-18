"use client";

import Image from "next/image";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ShoppingCart, ChevronUp } from "lucide-react";
import { PageCard, PageCardContent } from "@courselit/page-primitives";
import { Text1, Header3, Header4 } from "@courselit/page-primitives";
import { PaymentPlan, Constants } from "@courselit/common-models";
import { getPlanPrice } from "@ui-lib/utils";
import { CHECKOUT_PAGE_ORDER_SUMMARY } from "@ui-config/strings";

const { PaymentPlanType: paymentPlanType } = Constants;

function getPlanDescription(plan: PaymentPlan, currencySymbol: string): string {
    if (!plan) {
        return "N/A";
    }

    switch (plan.type) {
        case paymentPlanType.FREE:
            return "Free plan";
        case paymentPlanType.ONE_TIME:
            return `One-time payment of ${currencySymbol}${plan.oneTimeAmount?.toFixed(2)}`;
        case paymentPlanType.SUBSCRIPTION:
            if (plan.subscriptionYearlyAmount) {
                return `Billed annually at ${currencySymbol}${plan.subscriptionYearlyAmount.toFixed(2)}`;
            }
            return `${currencySymbol}${plan.subscriptionMonthlyAmount?.toFixed(2)} per month`;
        case paymentPlanType.EMI:
            return `${currencySymbol}${plan.emiAmount?.toFixed(2)} per month for ${plan.emiTotalInstallments} months`;
        default:
            return "N/A";
    }
}

export interface Product {
    id: string;
    name: string;
    type: string;
    defaultPaymentPlanId: string;
    slug?: string;
    featuredImage?: string;
    description?: string;
    autoAcceptMembers?: boolean;
    joiningReasonText?: string;
}

export interface OrderSummaryProps {
    product: Product;
    selectedPlan: PaymentPlan | null;
    paymentPlans: PaymentPlan[];
    currencySymbol: string;
    theme: any;
    isOrderSummaryOpen: boolean;
    setIsOrderSummaryOpen: (open: boolean) => void;
}

export function MobileOrderSummary({
    product,
    selectedPlan,
    paymentPlans,
    currencySymbol,
    theme,
    isOrderSummaryOpen,
    setIsOrderSummaryOpen,
}: OrderSummaryProps) {
    return (
        <div className="md:hidden w-full sticky top-20 z-11 mb-8">
            <PageCard theme={theme.theme}>
                <PageCardContent theme={theme.theme} className="p-0">
                    <div className="w-full">
                        <div
                            className="flex items-center justify-between p-4 border-b w-full"
                            style={{
                                borderBottomColor: theme.theme.colors.border,
                            }}
                        >
                            <div className="flex items-center gap-1">
                                <ShoppingCart className="h-5 w-5" />
                                <Text1
                                    className="p-0 !m-0 h-auto font-normal hover:bg-transparent flex items-center"
                                    onClick={() =>
                                        setIsOrderSummaryOpen(
                                            !isOrderSummaryOpen,
                                        )
                                    }
                                    theme={theme.theme}
                                >
                                    {isOrderSummaryOpen ? "Hide" : "Show"} order
                                    summary
                                    <ChevronUp
                                        className={`h-4 w-4 ml-1 transition-transform duration-200 ${isOrderSummaryOpen ? "" : "rotate-180"}`}
                                    />
                                </Text1>
                            </div>
                            <div className="font-medium flex items-center">
                                {currencySymbol}
                                {getPlanPrice(
                                    selectedPlan || paymentPlans[0],
                                ).amount.toFixed(2)}
                                <span className="text-sm text-muted-foreground ml-1">
                                    {
                                        getPlanPrice(
                                            selectedPlan || paymentPlans[0],
                                        ).period
                                    }
                                </span>
                            </div>
                        </div>
                    </div>

                    <Collapsible
                        open={isOrderSummaryOpen}
                        onOpenChange={setIsOrderSummaryOpen}
                    >
                        <CollapsibleTrigger className="sr-only">
                            Toggle order summary
                        </CollapsibleTrigger>
                        <CollapsibleContent
                            style={{
                                borderBottomColor: theme.theme.colors.border,
                            }}
                        >
                            <div className="p-4 space-y-4">
                                <div className="flex gap-4">
                                    <div className="h-16 w-16 relative rounded-lg overflow-hidden">
                                        <Image
                                            src={
                                                product.featuredImage ||
                                                "/courselit_backdrop_square.webp"
                                            }
                                            alt={product.name}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                    <div>
                                        <Header3 theme={theme.theme}>
                                            {product.name}
                                        </Header3>
                                        {product.description && (
                                            <Text1 theme={theme.theme}>
                                                {product.description}
                                            </Text1>
                                        )}
                                    </div>
                                </div>

                                {selectedPlan && (
                                    <div className="space-y-4">
                                        <div
                                            className="flex justify-between pt-4 border-t"
                                            style={{
                                                borderTopColor:
                                                    theme.theme.colors.border,
                                            }}
                                        >
                                            <Header3 theme={theme.theme}>
                                                Total
                                            </Header3>
                                            <div className="text-right flex items-center">
                                                <Header4 className="font-medium">
                                                    {currencySymbol}
                                                    {getPlanPrice(
                                                        selectedPlan,
                                                    ).amount.toFixed(2)}
                                                </Header4>
                                                <Text1 theme={theme.theme}>
                                                    {
                                                        getPlanPrice(
                                                            selectedPlan,
                                                        ).period
                                                    }
                                                </Text1>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CollapsibleContent>
                    </Collapsible>
                </PageCardContent>
            </PageCard>
        </div>
    );
}

export function DesktopOrderSummary({
    product,
    selectedPlan,
    currencySymbol,
    theme,
}: Omit<
    OrderSummaryProps,
    "paymentPlans" | "isOrderSummaryOpen" | "setIsOrderSummaryOpen"
>) {
    return (
        <div className="hidden md:block sticky top-20 self-start">
            <PageCard theme={theme.theme}>
                <PageCardContent theme={theme.theme} className="space-y-4">
                    <Header3 theme={theme.theme}>
                        {CHECKOUT_PAGE_ORDER_SUMMARY}
                    </Header3>
                    <div className="flex items-start gap-4 pb-4">
                        <div className="h-16 w-16 relative rounded-lg overflow-hidden bg-muted">
                            <Image
                                src={
                                    product.featuredImage ||
                                    "/courselit_backdrop_square.webp"
                                }
                                alt={product.name}
                                fill
                                className="object-cover"
                            />
                        </div>
                        <div>
                            <Header4 theme={theme.theme}>
                                {product.name}
                            </Header4>
                            {product.description && (
                                <Text1 theme={theme.theme}>
                                    {product.description}
                                </Text1>
                            )}
                        </div>
                    </div>
                    {selectedPlan && (
                        <div
                            className="mt-4 pt-4 border-t"
                            style={{
                                borderTopColor: theme.theme.colors.border,
                            }}
                        >
                            <div className="flex justify-between items-center">
                                <Header4 theme={theme.theme}>Total</Header4>
                                <Header4 theme={theme.theme}>
                                    {currencySymbol}
                                    {getPlanPrice(selectedPlan).amount.toFixed(
                                        2,
                                    )}
                                    <span className="text-sm text-muted-foreground ml-1">
                                        {getPlanPrice(selectedPlan).period}
                                    </span>
                                </Header4>
                            </div>
                            <Text1 theme={theme.theme}>
                                {getPlanDescription(
                                    selectedPlan,
                                    currencySymbol,
                                )}
                            </Text1>
                        </div>
                    )}
                </PageCardContent>
            </PageCard>
        </div>
    );
}
