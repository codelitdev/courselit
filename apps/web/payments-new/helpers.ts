import { PaymentPlan, Constants } from "@courselit/common-models";
const { PaymentPlanType: paymentPlanType } = Constants;

export function getUnitAmount(plan: PaymentPlan): number {
    switch (plan.type) {
        case paymentPlanType.ONE_TIME:
            return plan.oneTimeAmount!;
        case paymentPlanType.EMI:
            return plan.emiAmount!;
        case paymentPlanType.SUBSCRIPTION:
            return (
                plan.subscriptionMonthlyAmount || plan.subscriptionYearlyAmount!
            );
        case paymentPlanType.FREE:
            return 0;
        default:
            throw new Error(`Invalid plan type: ${plan.type}`);
    }
}
