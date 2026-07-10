import { Constants, PaymentPlan } from "@courselit/common-models";
import PaymentPlanModel from "@models/PaymentPlan";
import { Domain } from "@models/Domain";

type ProductDocument = {
    courseId: string;
    type: string;
    title: string;
    slug: string;
    description?: string;
    published: boolean;
    privacy: string;
    tags?: string[];
    featuredImage?: unknown;
    pageId?: string;
    defaultPaymentPlan?: string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
};

function toIsoString(value?: Date | string) {
    if (!value) {
        return undefined;
    }
    return value instanceof Date ? value.toISOString() : value;
}

export function serializePaymentPlan(
    paymentPlan: PaymentPlan,
    defaultPaymentPlan?: string,
) {
    return {
        planId: paymentPlan.planId,
        name: paymentPlan.name,
        type: paymentPlan.type,
        entityId: paymentPlan.entityId,
        entityType: paymentPlan.entityType,
        oneTimeAmount: paymentPlan.oneTimeAmount,
        emiAmount: paymentPlan.emiAmount,
        emiTotalInstallments: paymentPlan.emiTotalInstallments,
        subscriptionMonthlyAmount: paymentPlan.subscriptionMonthlyAmount,
        subscriptionYearlyAmount: paymentPlan.subscriptionYearlyAmount,
        description: paymentPlan.description,
        isDefault: paymentPlan.planId === defaultPaymentPlan,
    };
}

export async function fetchPaymentPlans(
    productIds: string[],
    domain: Domain,
): Promise<Map<string, PaymentPlan[]>> {
    if (productIds.length === 0) {
        return new Map();
    }

    const plans = (await PaymentPlanModel.find({
        domain: domain._id,
        entityId: { $in: productIds },
        entityType: Constants.MembershipEntityType.COURSE,
        archived: false,
        internal: false,
    }).lean()) as unknown as PaymentPlan[];

    const plansByEntityId = new Map<string, PaymentPlan[]>();
    for (const plan of plans) {
        const existing = plansByEntityId.get(plan.entityId) ?? [];
        existing.push(plan);
        plansByEntityId.set(plan.entityId, existing);
    }
    return plansByEntityId;
}

export function serializeProduct(
    product: ProductDocument,
    paymentPlans?: PaymentPlan[],
) {
    const supportsPaymentPlans =
        product.type === Constants.CourseType.COURSE ||
        product.type === Constants.CourseType.DOWNLOAD;

    return {
        productId: product.courseId,
        type: product.type,
        title: product.title,
        slug: product.slug,
        description: product.description,
        published: product.published,
        privacy: product.privacy,
        tags: product.tags,
        featuredImage: product.featuredImage,
        pageId: product.pageId,
        defaultPaymentPlan: supportsPaymentPlans
            ? product.defaultPaymentPlan
            : undefined,
        paymentPlans:
            supportsPaymentPlans && paymentPlans
                ? paymentPlans.map((paymentPlan) =>
                      serializePaymentPlan(
                          paymentPlan,
                          product.defaultPaymentPlan,
                      ),
                  )
                : undefined,
        createdAt: toIsoString(product.createdAt),
        updatedAt: toIsoString(product.updatedAt),
    };
}
