import { PaymentPlan, Constants, Course } from "@courselit/common-models";
import { responses } from "@config/strings";
import { getPaymentMethodFromSettings } from "@/payments-new";
import GQLContext from "@models/GQLContext";
import PaymentPlanModel, {
    InternalPaymentPlan,
} from "@courselit/orm-models/dao/payment-plan";
import CourseModel from "@courselit/orm-models/dao/course";

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

    if (
        paymentPlan.entityType === Constants.MembershipEntityType.COURSE &&
        paymentPlan.includedProducts &&
        paymentPlan.includedProducts.length > 0
    ) {
        throw new Error("Included products are not allowed for course");
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
    const existingPlans = (await PaymentPlanModel.query({
        domain: currentPlan.domain,
        entityId: currentPlan.entityId,
        entityType: currentPlan.entityType,
        archived: false,
    })) as unknown as PaymentPlan[];

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

export const checkIncludedProducts = async (
    domain: InternalPaymentPlan["domain"],
    paymentPlan: Partial<InternalPaymentPlan>,
) => {
    if (
        !paymentPlan.includedProducts ||
        paymentPlan.includedProducts?.length === 0
    )
        return;

    const products = (await CourseModel.query(
        {
            domain,
            courseId: { $in: paymentPlan.includedProducts },
            type: {
                $in: [
                    Constants.CourseType.COURSE,
                    Constants.CourseType.DOWNLOAD,
                ],
            },
        },
        {
            courseId: 1,
        },
    )) as unknown as Course[];

    let nonExistingProducts: string[] = [];
    for (const product of paymentPlan.includedProducts) {
        if (!products.some((p) => p.courseId === product)) {
            nonExistingProducts.push(product);
        }
    }
    if (nonExistingProducts.length > 0) {
        throw new Error(
            `Products ${nonExistingProducts.join(", ")} do not exist`,
        );
    }
};
