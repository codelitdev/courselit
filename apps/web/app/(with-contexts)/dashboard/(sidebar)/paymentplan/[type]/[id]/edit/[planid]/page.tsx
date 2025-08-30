"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Constants } from "@courselit/common-models";
import DashboardContent from "@/components/admin/dashboard-content";
import {
    PaymentPlanForm,
    PaymentPlanFormSkeleton,
} from "@/components/admin/payments/payment-plan-form";
import { Skeleton } from "@/components/ui/skeleton";
import {
    COMMUNITY_SETTINGS,
    EDIT_PAYMENT_PLAN_HEADER,
    EDIT_PAYMENT_PLAN_DESCRIPTION,
} from "@/ui-config/strings";
import { usePaymentPlan } from "@/hooks/use-paymentplan";
import { useEntityValidation } from "../../use-entity-validation";
import { truncate } from "@courselit/utils";

const {
    MembershipEntityType: membershipEntityType,
    PaymentPlanType: paymentPlanType,
} = Constants;

export default function EditPaymentPlanPage() {
    const params = useParams();
    const router = useRouter();
    const type = params?.type as "community" | "product";
    const entityType = type === "community" 
        ? membershipEntityType.COMMUNITY 
        : membershipEntityType.COURSE;
    const entityId = params?.id as string;
    const planId = params?.planid as string;
    const { product, community } = useEntityValidation(entityType, entityId);

    const breadcrumbs = [
        {
            label:
                entityType === membershipEntityType.COMMUNITY
                    ? truncate(community?.name || "...", 10)
                    : truncate(product?.title || "...", 10),
            href: `/dashboard/${type}/${entityId}`,
        },
        {
            label: COMMUNITY_SETTINGS,
            href: `/dashboard/${type}/${entityId}/manage`,
        },
        { label: EDIT_PAYMENT_PLAN_HEADER, href: "#" },
    ];
    const { paymentPlan, loaded: paymentPlanLoaded } = usePaymentPlan(
        planId,
        entityId,
        entityType,
    );

    useEffect(() => {
        if (paymentPlanLoaded && !paymentPlan) {
            router.push(
                `/dashboard/${entityType === membershipEntityType.COMMUNITY ? "community" : "product"}/${entityId}/manage`,
            );
        }
    }, [paymentPlanLoaded, paymentPlan, router, entityId, entityType]);

    if (!paymentPlanLoaded) {
        return (
            <DashboardContent breadcrumbs={breadcrumbs}>
                <div className="space-y-2">
                    <div className="flex flex-col lg:flex-row gap-4 lg:items-center justify-between mb-8">
                        <div>
                            <h1 className="text-4xl font-semibold">
                                {EDIT_PAYMENT_PLAN_HEADER}
                            </h1>
                            <Skeleton className="h-5 w-64 mt-2" />
                        </div>
                    </div>
                </div>
                <PaymentPlanFormSkeleton />
            </DashboardContent>
        );
    }

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <div className="space-y-2">
                <div className="flex flex-col lg:flex-row gap-4 lg:items-center justify-between mb-8">
                    <div>
                        <h1 className="text-4xl font-semibold">
                            {EDIT_PAYMENT_PLAN_HEADER}
                        </h1>
                        <p className="text-muted-foreground">
                            {EDIT_PAYMENT_PLAN_DESCRIPTION} &quot;
                            {paymentPlan?.name || ""}&quot;
                        </p>
                    </div>
                </div>
            </div>
            <PaymentPlanForm
                initialData={
                    paymentPlan
                        ? {
                              planId: paymentPlan.planId,
                              name: paymentPlan.name,
                              description: paymentPlan.description,
                              type: paymentPlan.type,
                              oneTimeAmount: paymentPlan.oneTimeAmount,
                              emiAmount: paymentPlan.emiAmount,
                              emiTotalInstallments:
                                  paymentPlan.emiTotalInstallments,
                              subscriptionMonthlyAmount:
                                  paymentPlan.subscriptionMonthlyAmount,
                              subscriptionYearlyAmount:
                                  paymentPlan.subscriptionYearlyAmount,
                              includedProducts: paymentPlan.includedProducts,
                              subscriptionType:
                                  paymentPlan.type ===
                                  paymentPlanType.SUBSCRIPTION
                                      ? paymentPlan.subscriptionYearlyAmount
                                          ? "yearly"
                                          : "monthly"
                                      : "monthly",
                          }
                        : undefined
                }
                entityId={entityId}
                entityType={entityType}
            />
        </DashboardContent>
    );
}
