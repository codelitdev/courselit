import { checkIfAuthenticated } from "@/lib/graphql";
import { responses } from "@config/strings";
import {
    MembershipEntityType,
    PaymentPlan,
    Constants,
    Community,
    PaymentPlanType,
} from "@courselit/common-models";
import CourseModel, { Course } from "@models/Course";
import CommunityModel, { InternalCommunity } from "@models/Community";
import constants from "@config/constants";
import { checkPermission } from "@courselit/utils";
import PaymentPlanModel from "@models/PaymentPlan";
import { getPaymentMethodFromSettings } from "@/payments-new";
import { Domain } from "@models/Domain";
const { MembershipEntityType: membershipEntityType } = Constants;
const { permissions } = constants;

async function fetchEntity(
    entityType: MembershipEntityType,
    entityId: string,
    ctx: any,
): Promise<Course | InternalCommunity | null> {
    if (entityType === membershipEntityType.COURSE) {
        return (await CourseModel.findOne({
            domain: ctx.subdomain._id,
            courseId: entityId,
        })) as Course;
    } else if (entityType === membershipEntityType.COMMUNITY) {
        return (await CommunityModel.findOne({
            domain: ctx.subdomain._id,
            communityId: entityId,
            deleted: false,
        })) as InternalCommunity;
    }
    return null;
}

function checkEntityPermission(entityType: MembershipEntityType, ctx: any) {
    if (entityType === membershipEntityType.COURSE) {
        if (
            !checkPermission(ctx.user.permissions, [permissions.manageCourse])
        ) {
            throw new Error(responses.action_not_allowed);
        }
    } else if (entityType === membershipEntityType.COMMUNITY) {
        if (
            !checkPermission(ctx.user.permissions, [
                permissions.manageCommunity,
            ])
        ) {
            throw new Error(responses.action_not_allowed);
        }
    }
}

export async function getPlans({
    planIds,
    ctx,
}: {
    planIds: string[];
    ctx: any;
}): Promise<PaymentPlan[]> {
    return PaymentPlanModel.find<PaymentPlan>({
        domain: ctx.subdomain._id,
        planId: { $in: planIds },
        archived: false,
        internal: false,
    }).lean();
}

export async function createPlan({
    name,
    type,
    oneTimeAmount,
    emiAmount,
    emiTotalInstallments,
    subscriptionMonthlyAmount,
    subscriptionYearlyAmount,
    entityId,
    entityType,
    ctx,
}: {
    name: string;
    type: PaymentPlanType;
    oneTimeAmount?: number;
    emiAmount?: number;
    emiTotalInstallments?: number;
    subscriptionMonthlyAmount?: number;
    subscriptionYearlyAmount?: number;
    entityId: string;
    entityType: MembershipEntityType;
    ctx: any;
}): Promise<PaymentPlan> {
    checkIfAuthenticated(ctx);

    if (type === Constants.PaymentPlanType.ONE_TIME && !oneTimeAmount) {
        throw new Error(
            "One-time amount is required for one-time payment plan",
        );
    }
    if (
        type === Constants.PaymentPlanType.EMI &&
        (!emiAmount || !emiTotalInstallments)
    ) {
        throw new Error(
            "EMI amounts and total installments are required for EMI payment plan",
        );
    }
    if (
        type === Constants.PaymentPlanType.SUBSCRIPTION &&
        ((!subscriptionMonthlyAmount && !subscriptionYearlyAmount) ||
            (subscriptionMonthlyAmount && subscriptionYearlyAmount))
    ) {
        throw new Error(
            "Either monthly or yearly amount is required for subscription payment plan, but not both",
        );
    }

    const entity = await fetchEntity(entityType, entityId, ctx);

    if (!entity) {
        throw new Error(responses.item_not_found);
    }

    checkEntityPermission(entityType, ctx);

    const existingPlansForEntity = await PaymentPlanModel.find<PaymentPlan>({
        domain: ctx.subdomain._id,
        planId: { $in: (entity as Course | Community).paymentPlans },
        archived: false,
    });

    for (const plan of existingPlansForEntity) {
        if (plan.type === type) {
            if (plan.type !== Constants.PaymentPlanType.SUBSCRIPTION) {
                throw new Error(responses.duplicate_payment_plan);
            }
            if (subscriptionMonthlyAmount && plan.subscriptionMonthlyAmount) {
                throw new Error(responses.duplicate_payment_plan);
            }
            if (subscriptionYearlyAmount && plan.subscriptionYearlyAmount) {
                throw new Error(responses.duplicate_payment_plan);
            }
        }
    }

    const paymentMethod = await getPaymentMethodFromSettings(
        ctx.subdomain.settings,
    );
    if (!paymentMethod && type !== Constants.PaymentPlanType.FREE) {
        throw new Error(responses.payment_info_required);
    }

    const paymentPlan = await PaymentPlanModel.create({
        domain: ctx.subdomain._id,
        userId: ctx.user.userId,
        name,
        type,
        oneTimeAmount,
        emiAmount,
        emiTotalInstallments,
        subscriptionMonthlyAmount,
        subscriptionYearlyAmount,
    });

    if (entity.paymentPlans.length === 0) {
        (entity as Course | Community).defaultPaymentPlan = paymentPlan.planId;
    }

    (entity as Course | Community).paymentPlans.push(paymentPlan.planId);
    await (entity as any).save();

    return paymentPlan;
}

export async function archivePaymentPlan({
    planId,
    entityId,
    entityType,
    ctx,
}: {
    planId: string;
    entityId: string;
    entityType: MembershipEntityType;
    ctx: any;
}): Promise<PaymentPlan> {
    checkIfAuthenticated(ctx);

    const entity = await fetchEntity(entityType, entityId, ctx);

    if (!entity) {
        throw new Error(responses.item_not_found);
    }

    checkEntityPermission(entityType, ctx);

    const paymentPlan = await PaymentPlanModel.findOne({
        domain: ctx.subdomain._id,
        planId,
    });

    if (!paymentPlan) {
        throw new Error(responses.item_not_found);
    }

    if (
        (entity as Community | Course).defaultPaymentPlan === paymentPlan.planId
    ) {
        throw new Error(responses.default_payment_plan_cannot_be_archived);
    }

    paymentPlan.archived = true;
    await paymentPlan.save();

    return paymentPlan;
}

export async function changeDefaultPlan({
    planId,
    entityId,
    entityType,
    ctx,
}: {
    planId: string;
    entityId: string;
    entityType: MembershipEntityType;
    ctx: any;
}): Promise<PaymentPlan> {
    checkIfAuthenticated(ctx);

    const entity = await fetchEntity(entityType, entityId, ctx);

    if (!entity) {
        throw new Error(responses.item_not_found);
    }

    checkEntityPermission(entityType, ctx);

    const paymentPlan = await PaymentPlanModel.findOne({
        domain: ctx.subdomain._id,
        planId,
        archived: false,
    });

    if (!paymentPlan) {
        throw new Error(responses.item_not_found);
    }

    (entity as Community | Course).defaultPaymentPlan = paymentPlan.planId;
    await (entity as any).save();

    return paymentPlan;
}

export async function getInternalPaymentPlan(ctx: any) {
    return await PaymentPlanModel.findOne({
        domain: ctx.subdomain._id,
        internal: true,
    });
}

export async function createInternalPaymentPlan(
    domain: Domain,
    userId: string,
) {
    return await PaymentPlanModel.create({
        domain: domain._id,
        name: constants.internalPaymentPlanName,
        type: Constants.PaymentPlanType.FREE,
        internal: true,
        userId: userId,
    });
}
