import { Constants } from ".";
const { PaymentPlanType: PaymentPlanTypeConst } = Constants;

export type PaymentPlanType =
    (typeof PaymentPlanTypeConst)[keyof typeof PaymentPlanTypeConst];

export interface PaymentPlan {
    name: string;
    planId: string;
    type: PaymentPlanType;
    oneTimeAmount?: number;
    emiAmount?: number;
    emiTotalInstallments?: number;
    subscriptionMonthlyAmount?: number;
    subscriptionYearlyAmount?: number;
}
