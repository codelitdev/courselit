import { useState, useContext } from "react";
import { FetchBuilder } from "@courselit/utils";
import type {
    MembershipEntityType,
    PaymentPlan,
} from "@courselit/common-models";
import { AddressContext } from "@components/contexts";

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
    const address = useContext(AddressContext);

    const onPlanSubmitted = async (plan: any) => {
        const query = `
            mutation CreatePlan(
                $name: String!
                $type: PaymentPlanType!
                $entityId: String!
                $entityType: MembershipEntityType!
                $oneTimeAmount: Int
                $emiAmount: Int
                $emiTotalInstallments: Int
                $subscriptionMonthlyAmount: Int
                $subscriptionYearlyAmount: Int
                $description: String
                $includedProducts: [String]
            ) {
                plan: createPlan(
                    name: $name
                    type: $type
                    entityId: $entityId
                    entityType: $entityType
                    oneTimeAmount: $oneTimeAmount
                    emiAmount: $emiAmount
                    emiTotalInstallments: $emiTotalInstallments
                    subscriptionMonthlyAmount: $subscriptionMonthlyAmount
                    subscriptionYearlyAmount: $subscriptionYearlyAmount
                    description: $description
                    includedProducts: $includedProducts
                ) {
                    planId
                    name
                    type
                    oneTimeAmount
                    emiAmount
                    emiTotalInstallments
                    subscriptionMonthlyAmount
                    subscriptionYearlyAmount
                    description
                    includedProducts
                }
            }
        `;

        const fetchRequest = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload({
                query,
                variables: {
                    ...plan,
                    entityId: id,
                    entityType: entityType.toUpperCase(),
                },
            })
            .setIsGraphQLEndpoint(true)
            .build();
        const response = await fetchRequest.exec();
        if (response.plan) {
            setPaymentPlans([...paymentPlans, response.plan]);
        }
        return response.plan;
    };

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

        const fetchRequest = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload({
                query,
                variables: {
                    planId,
                },
            })
            .setIsGraphQLEndpoint(true)
            .build();
        const response = await fetchRequest.exec();
        if (response.plan) {
            setPaymentPlans(paymentPlans.filter((p) => p.planId !== planId));
        }
        return response.plan;
    };

    const onDefaultPlanChanged = async (planId: string) => {
        const query = `
            mutation ChangeDefaultPlan($planId: String!, $entityId: String!, $entityType: MembershipEntityType!) {
                plan: changeDefaultPlan(planId: $planId, entityId: $entityId, entityType: $entityType) {
                    planId
                }
            }
        `;

        const fetchRequest = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload({
                query,
                variables: {
                    planId,
                    entityId: id,
                    entityType: entityType.toUpperCase(),
                },
            })
            .setIsGraphQLEndpoint(true)
            .build();
        const response = await fetchRequest.exec();
        if (response.plan) {
            setDefaultPaymentPlan(response.plan.planId);
        }
        return response.plan;
    };

    const onPlanUpdated = async (plan: any) => {
        const query = `
            mutation UpdatePlan(
                $planId: String!
                $name: String
                $type: PaymentPlanType
                $oneTimeAmount: Int
                $emiAmount: Int
                $emiTotalInstallments: Int
                $subscriptionMonthlyAmount: Int
                $subscriptionYearlyAmount: Int
                $description: String
                $includedProducts: [String]
            ) {
                plan: updatePlan(
                    planId: $planId
                    name: $name
                    type: $type
                    oneTimeAmount: $oneTimeAmount
                    emiAmount: $emiAmount
                    emiTotalInstallments: $emiTotalInstallments
                    subscriptionMonthlyAmount: $subscriptionMonthlyAmount
                    subscriptionYearlyAmount: $subscriptionYearlyAmount
                    description: $description
                    includedProducts: $includedProducts
                ) {
                    planId
                    name
                    type
                    oneTimeAmount
                    emiAmount
                    emiTotalInstallments
                    subscriptionMonthlyAmount
                    subscriptionYearlyAmount
                    description
                    includedProducts
                }
            }
        `;

        const fetchRequest = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload({
                query,
                variables: {
                    planId: plan.planId,
                    ...plan,
                },
            })
            .setIsGraphQLEndpoint(true)
            .build();
        const response = await fetchRequest.exec();
        if (response.plan) {
            setPaymentPlans([...paymentPlans, response.plan]);
        }
        return response.plan;
    };

    return {
        paymentPlans,
        setPaymentPlans,
        defaultPaymentPlan,
        setDefaultPaymentPlan,
        onPlanSubmitted,
        onPlanArchived,
        onDefaultPlanChanged,
        onPlanUpdated,
    };
}
