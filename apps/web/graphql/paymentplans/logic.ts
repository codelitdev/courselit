import { checkIfAuthenticated } from "@/lib/graphql";
import { responses } from "@config/strings";
import {
    MembershipEntityType,
    PaymentPlan,
    Constants,
    PaymentPlanType,
} from "@courselit/common-models";
import CourseModel from "@models/Course";
import CommunityModel, { InternalCommunity } from "@models/Community";
import constants from "@config/constants";
import { checkPermission } from "@courselit/utils";
import PaymentPlanModel, { InternalPaymentPlan } from "@models/PaymentPlan";
import { Domain } from "@models/Domain";
import { InternalCourse } from "@courselit/common-logic";
import GQLContext from "@models/GQLContext";
import {
    checkDuplicatePlan,
    checkIncludedProducts,
    validatePaymentPlan,
} from "./helpers";
import mongoose from "mongoose";
import MembershipModel from "@models/Membership";
import { runPostMembershipTasks } from "../users/logic";
import ActivityModel from "@models/Activity";
const { MembershipEntityType: membershipEntityType } = Constants;
const { permissions } = constants;

async function fetchEntity(
    entityType: MembershipEntityType,
    entityId: string,
    ctx: any,
): Promise<InternalCourse | InternalCommunity | null> {
    if (entityType === membershipEntityType.COURSE) {
        return (await CourseModel.findOne({
            domain: ctx.subdomain._id,
            courseId: entityId,
        })) as InternalCourse;
    } else if (entityType === membershipEntityType.COMMUNITY) {
        return (await CommunityModel.findOne({
            domain: ctx.subdomain._id,
            communityId: entityId,
            deleted: false,
        })) as InternalCommunity;
    }
    return null;
}

function checkEntityManagementPermission(
    entityType: MembershipEntityType,
    ctx: any,
) {
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

export async function getPlan({ planId, ctx }: { planId: string; ctx: any }) {
    checkIfAuthenticated(ctx);

    const plan = await PaymentPlanModel.findOne({
        domain: ctx.subdomain._id,
        planId,
        archived: false,
    });

    if (!plan) {
        throw new Error(responses.item_not_found);
    }

    const entity = await fetchEntity(plan.entityType, plan.entityId, ctx);

    if (!entity) {
        throw new Error(responses.item_not_found);
    }

    checkEntityManagementPermission(plan.entityType, ctx);

    return plan;
}

export async function getPlans({
    entityId,
    entityType,
    ctx,
}: {
    entityId: string;
    entityType: MembershipEntityType;
    ctx: any;
}): Promise<PaymentPlan[]> {
    return PaymentPlanModel.find<PaymentPlan>({
        domain: ctx.subdomain._id,
        entityId,
        entityType,
        archived: false,
        internal: false,
    }).lean() as unknown as PaymentPlan[];
}

export async function getPlansForEntity({
    entityId,
    entityType,
    ctx,
}: {
    entityId: string;
    entityType: MembershipEntityType;
    ctx: any;
}): Promise<PaymentPlan[]> {
    checkIfAuthenticated(ctx);

    const entity = await fetchEntity(entityType, entityId, ctx);

    if (!entity) {
        throw new Error(responses.item_not_found);
    }

    checkEntityManagementPermission(entityType, ctx);

    return (await PaymentPlanModel.find<PaymentPlan>({
        domain: ctx.subdomain._id,
        entityId,
        entityType,
        archived: false,
        internal: false,
    }).lean()) as unknown as PaymentPlan[];
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
    description,
    ctx,
    includedProducts,
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
    description?: string;
    ctx: GQLContext;
    includedProducts?: string[];
}): Promise<PaymentPlan> {
    checkIfAuthenticated(ctx);

    const entity = await fetchEntity(entityType, entityId, ctx);
    if (!entity) {
        throw new Error(responses.item_not_found);
    }

    checkEntityManagementPermission(entityType, ctx);

    const paymentPlanPayload: Partial<InternalPaymentPlan> = {
        domain: ctx.subdomain._id,
        userId: ctx.user.userId,
        entityId,
        entityType,
        name,
        type,
        oneTimeAmount,
        emiAmount,
        emiTotalInstallments,
        subscriptionMonthlyAmount,
        subscriptionYearlyAmount,
        description,
        includedProducts,
    };

    await validatePaymentPlan(paymentPlanPayload, ctx.subdomain.settings);
    await checkDuplicatePlan(paymentPlanPayload);
    await checkIncludedProducts(ctx.subdomain._id, paymentPlanPayload);

    const paymentPlan = await PaymentPlanModel.create(paymentPlanPayload);

    if (!entity.defaultPaymentPlan) {
        (entity as InternalCourse | InternalCommunity).defaultPaymentPlan =
            paymentPlan.planId;
    }
    await (entity as any).save();

    return paymentPlan;
}

export async function updatePlan({
    planId,
    name,
    type,
    oneTimeAmount,
    emiAmount,
    emiTotalInstallments,
    subscriptionMonthlyAmount,
    subscriptionYearlyAmount,
    description,
    ctx,
    includedProducts,
}: {
    planId: string;
    name?: string;
    type?: PaymentPlanType;
    oneTimeAmount?: number;
    emiAmount?: number;
    emiTotalInstallments?: number;
    subscriptionMonthlyAmount?: number;
    subscriptionYearlyAmount?: number;
    description?: string;
    ctx: GQLContext;
    includedProducts?: string[];
}): Promise<PaymentPlan> {
    checkIfAuthenticated(ctx);

    const paymentPlan = await PaymentPlanModel.findOne({
        domain: ctx.subdomain._id,
        planId,
        archived: false,
    });

    if (!paymentPlan) {
        throw new Error(responses.item_not_found);
    }

    const entity = await fetchEntity(
        paymentPlan.entityType,
        paymentPlan.entityId,
        ctx,
    );

    if (!entity) {
        throw new Error(responses.item_not_found);
    }

    checkEntityManagementPermission(paymentPlan.entityType, ctx);

    if (name !== undefined) paymentPlan.name = name;
    if (type !== undefined) paymentPlan.type = type;
    if (oneTimeAmount !== undefined) paymentPlan.oneTimeAmount = oneTimeAmount;
    if (emiAmount !== undefined) paymentPlan.emiAmount = emiAmount;
    if (emiTotalInstallments !== undefined)
        paymentPlan.emiTotalInstallments = emiTotalInstallments;
    if (subscriptionMonthlyAmount !== undefined)
        paymentPlan.subscriptionMonthlyAmount = subscriptionMonthlyAmount;
    if (subscriptionYearlyAmount !== undefined)
        paymentPlan.subscriptionYearlyAmount = subscriptionYearlyAmount;
    if (description !== undefined) paymentPlan.description = description;
    if (includedProducts !== undefined)
        paymentPlan.includedProducts = includedProducts;

    await validatePaymentPlan(paymentPlan, ctx.subdomain.settings);
    await checkDuplicatePlan(paymentPlan, true);
    await checkIncludedProducts(ctx.subdomain._id, paymentPlan);

    await paymentPlan.save();

    return paymentPlan;
}

export async function archivePaymentPlan({
    planId,
    ctx,
}: {
    planId: string;
    ctx: any;
}): Promise<PaymentPlan> {
    checkIfAuthenticated(ctx);

    const paymentPlan = await PaymentPlanModel.findOne({
        domain: ctx.subdomain._id,
        planId,
        archived: false,
    });

    if (!paymentPlan) {
        throw new Error(responses.item_not_found);
    }

    const entity = await fetchEntity(
        paymentPlan.entityType,
        paymentPlan.entityId,
        ctx,
    );

    if (!entity) {
        throw new Error(responses.item_not_found);
    }

    checkEntityManagementPermission(paymentPlan.entityType, ctx);

    if (
        (entity as InternalCommunity | InternalCourse).defaultPaymentPlan ===
        paymentPlan.planId
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

    checkEntityManagementPermission(entityType, ctx);

    const paymentPlan = await PaymentPlanModel.findOne({
        domain: ctx.subdomain._id,
        planId,
        archived: false,
    });

    if (!paymentPlan) {
        throw new Error(responses.item_not_found);
    }

    (entity as InternalCommunity | InternalCourse).defaultPaymentPlan =
        paymentPlan.planId;
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
        entityId: "internal",
        entityType: membershipEntityType.COURSE,
    });
}

export async function getIncludedProducts({
    entityId,
    entityType,
    ctx,
}: {
    entityId: string;
    entityType: MembershipEntityType;
    ctx: GQLContext;
}) {
    const paymentPlans = (await PaymentPlanModel.find(
        {
            domain: ctx.subdomain._id,
            entityId,
            entityType,
            archived: false,
        },
        {
            includedProducts: 1,
        },
    ).lean()) as unknown as PaymentPlan[];

    const allIncludedProducts = paymentPlans.flatMap(
        (plan) => plan.includedProducts || [],
    );

    const products = (await CourseModel.find({
        domain: ctx.subdomain._id,
        courseId: { $in: allIncludedProducts },
        published: true,
    }).lean()) as unknown as InternalCourse[];

    return products;
}

export async function addIncludedProductsMemberships({
    domain,
    userId,
    paymentPlan,
    sessionId,
}: {
    domain: mongoose.Types.ObjectId;
    userId: string;
    paymentPlan: PaymentPlan;
    sessionId: string;
}) {
    const courses = await CourseModel.find({
        domain,
        courseId: { $in: paymentPlan.includedProducts },
        published: true,
    });

    for (const course of courses) {
        const membership = await MembershipModel.create({
            domain,
            userId,
            entityId: course.courseId,
            entityType: Constants.MembershipEntityType.COURSE,
            paymentPlanId: paymentPlan.planId,
            status: Constants.MembershipStatus.ACTIVE,
            sessionId,
            isIncludedInPlan: true,
        });

        await runPostMembershipTasks({ domain, membership, paymentPlan });
    }
}

export async function deleteMembershipsActivatedViaPaymentPlan({
    domain,
    userId,
    paymentPlanId,
}: {
    domain: mongoose.Types.ObjectId;
    userId: string;
    paymentPlanId: string;
}) {
    await ActivityModel.deleteMany({
        domain,
        userId,
        type: constants.activityTypes[0],
        "metadata.isIncludedInPlan": true,
        "metadata.paymentPlanId": paymentPlanId,
    });
    await MembershipModel.deleteMany({
        domain,
        userId,
        paymentPlanId: paymentPlanId,
        entityType: Constants.MembershipEntityType.COURSE,
        isIncludedInPlan: true,
    });
}

export async function deleteProductsFromPaymentPlans({
    domain,
    courseId,
}: {
    domain: mongoose.Types.ObjectId;
    courseId: string;
}) {
    await PaymentPlanModel.updateMany(
        { domain, includedProducts: { $in: [courseId] } },
        { $pull: { includedProducts: courseId } },
    );
}
