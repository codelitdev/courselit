import { PaymentPlan, Constants } from "@courselit/common-models";
import { responses } from "@config/strings";
import { getPaymentMethodFromSettings } from "@/payments-new";
import GQLContext from "@models/GQLContext";
import PaymentPlanModel, { InternalPaymentPlan } from "@models/PaymentPlan";

export const validatePaymentPlan = async (
    paymentPlan: Partial<PaymentPlan>,
    settings: GQLContext["subdomain"]["settings"],
) => {
    if (!paymentPlan.name || paymentPlan.name.trim() === "") {
        throw new Error("Payment plan name is required");
    }

    if (!paymentPlan.type) {
        throw new Error("Payment plan type is required");
    }

    const paymentMethod = await getPaymentMethodFromSettings(settings);
    if (!paymentMethod && paymentPlan.type !== Constants.PaymentPlanType.FREE) {
        throw new Error(responses.payment_info_required);
    }

    if (
        paymentPlan.type === Constants.PaymentPlanType.ONE_TIME &&
        !paymentPlan.oneTimeAmount
    ) {
        throw new Error(
            "One-time amount is required for one-time payment plan",
        );
    }
    if (
        paymentPlan.type === Constants.PaymentPlanType.EMI &&
        (!paymentPlan.emiAmount || !paymentPlan.emiTotalInstallments)
    ) {
        throw new Error(
            "EMI amounts and total installments are required for EMI payment plan",
        );
    }
    if (
        paymentPlan.type === Constants.PaymentPlanType.SUBSCRIPTION &&
        ((!paymentPlan.subscriptionMonthlyAmount &&
            !paymentPlan.subscriptionYearlyAmount) ||
            (paymentPlan.subscriptionMonthlyAmount &&
                paymentPlan.subscriptionYearlyAmount))
    ) {
        throw new Error(
            "Either monthly or yearly amount is required for subscription payment plan, but not both",
        );
    }
};

export const checkDuplicatePlan = async (
    currentPlan: Partial<InternalPaymentPlan>,
    isUpdate: boolean = false,
) => {
    const existingPlans = (await PaymentPlanModel.find({
        domain: currentPlan.domain,
        entityId: currentPlan.entityId,
        entityType: currentPlan.entityType,
        archived: false,
    }).lean()) as unknown as PaymentPlan[];

    const plansToCheck = isUpdate
        ? existingPlans.filter((plan) => plan.planId !== currentPlan.planId)
        : existingPlans;

    for (const plan of plansToCheck) {
        if (plan.type === currentPlan.type) {
            if (plan.type !== Constants.PaymentPlanType.SUBSCRIPTION) {
                throw new Error(responses.duplicate_payment_plan);
            }
            if (
                currentPlan.subscriptionMonthlyAmount &&
                plan.subscriptionMonthlyAmount
            ) {
                throw new Error(responses.duplicate_payment_plan);
            }
            if (
                currentPlan.subscriptionYearlyAmount &&
                plan.subscriptionYearlyAmount
            ) {
                throw new Error(responses.duplicate_payment_plan);
            }
        }
    }
};
