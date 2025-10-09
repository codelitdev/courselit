import { useState } from "react";
import type {
    MembershipEntityType,
    PaymentPlan,
} from "@courselit/common-models";
import { useGraphQLFetch } from "./use-graphql-fetch";
import { useToast } from "@courselit/components-library";
import { TOAST_TITLE_ERROR } from "@ui-config/strings";

interface UsePaymentPlanOperationsProps {
    id: string;
    entityType: MembershipEntityType;
}

export function usePaymentPlanOperations({
    id,
    entityType,
}: UsePaymentPlanOperationsProps) {
    const [paymentPlans, setPaymentPlans] = useState<PaymentPlan[]>([]);
    const [defaultPaymentPlan, setDefaultPaymentPlan] = useState<string>();
    const [loading, setLoading] = useState(false);
    const fetch = useGraphQLFetch();
    const { toast } = useToast();

    const onPlanArchived = async (planId: string) => {
        const query = `
            mutation ArchivePlan($planId: String!) {
                plan: archivePlan(planId: $planId) {
                    planId
                    name
                    type
                    oneTimeAmount
                    emiAmount
                    emiTotalInstallments
                    subscriptionMonthlyAmount
                    subscriptionYearlyAmount
                    description
                }   
            }
        `;

        const fetchRequest = fetch
            .setPayload({
                query,
                variables: {
                    planId,
                },
            })
            .build();
        setLoading(true);
        try {
            const response = await fetchRequest.exec();
            if (response.plan) {
                setPaymentPlans(
                    paymentPlans.filter((p) => p.planId !== planId),
                );
            }
            return response.plan;
        } catch (error) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: "Failed to archive payment plan",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const onDefaultPlanChanged = async (planId: string) => {
        const query = `
            mutation ChangeDefaultPlan(
                $planId: String!, 
                $entityId: String!, 
                $entityType: MembershipEntityType!
            ) {
                plan: changeDefaultPlan(
                    planId: $planId, 
                    entityId: $entityId, 
                    entityType: $entityType
                ) {
                    planId
                }
            }
        `;

        const fetchRequest = fetch
            .setPayload({
                query,
                variables: {
                    planId,
                    entityId: id,
                    entityType: entityType.toUpperCase(),
                },
            })
            .build();
        setLoading(true);
        try {
            const response = await fetchRequest.exec();
            if (response.plan) {
                setDefaultPaymentPlan(response.plan.planId);
            }
            return response.plan;
        } catch (error) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: "Failed to change default payment plan",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return {
        paymentPlans,
        setPaymentPlans,
        defaultPaymentPlan,
        setDefaultPaymentPlan,
        onPlanArchived,
        onDefaultPlanChanged,
        loading,
    };
}
