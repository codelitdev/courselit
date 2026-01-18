import { Constants, MembershipEntityType } from ".";
const { PaymentPlanType: PaymentPlanTypeConst } = Constants;

export type PaymentPlanType =
    (typeof PaymentPlanTypeConst)[keyof typeof PaymentPlanTypeConst];

export interface PaymentPlan {
    domain: string;
    name: string;
    planId: string;
    type: PaymentPlanType;
    entityId: string;
    entityType: MembershipEntityType;
    oneTimeAmount?: number;
    emiAmount?: number;
    emiTotalInstallments?: number;
    subscriptionMonthlyAmount?: number;
    subscriptionYearlyAmount?: number;
    includedProducts?: string[];
    description?: string;
}
