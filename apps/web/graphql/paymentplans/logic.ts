import { checkIfAuthenticated } from "@/lib/graphql";
import { responses } from "@config/strings";
import {
    MembershipEntityType,
    PaymentPlan,
    Constants,
    PaymentPlanType,
} from "@courselit/common-models";
import CourseModel from "@courselit/orm-models/dao/course";
import CommunityModel, {
    InternalCommunity,
} from "@courselit/orm-models/dao/community";
import constants from "@config/constants";
import { checkPermission } from "@courselit/utils";
import PaymentPlanModel, {
    InternalPaymentPlan,
} from "@courselit/orm-models/dao/payment-plan";
import { Domain } from "@courselit/orm-models/dao/domain";
import { InternalCourse } from "@courselit/common-logic";
import GQLContext from "@models/GQLContext";
import {
    checkDuplicatePlan,
    checkIncludedProducts,
    validatePaymentPlan,
} from "./helpers";
import MembershipModel from "@courselit/orm-models/dao/membership";
import { runPostMembershipTasks } from "../users/logic";
import ActivityModel from "@courselit/orm-models/dao/activity";
const { MembershipEntityType: membershipEntityType } = Constants;
const { permissions } = constants;

async function fetchEntity(
    entityType: MembershipEntityType,
    entityId: string,
    ctx: any,
): Promise<InternalCourse | InternalCommunity | null> {
    if (entityType === membershipEntityType.COURSE) {
        return (await CourseModel.queryOne({
            domain: ctx.subdomain._id,
            courseId: entityId,
        })) as InternalCourse;
    } else if (entityType === membershipEntityType.COMMUNITY) {
        return (await CommunityModel.queryOne({
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
            !checkPermission(ctx.user.permissions, [
                permissions.manageAnyCourse,
                permissions.manageCourse,
            ])
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

    const plan = await PaymentPlanModel.queryOne({
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
    return (await PaymentPlanModel.query<PaymentPlan>({
        domain: ctx.subdomain._id,
        entityId,
        entityType,
        archived: false,
        internal: false,
    })) as unknown as PaymentPlan[];
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

    return (await PaymentPlanModel.query<PaymentPlan>({
        domain: ctx.subdomain._id,
        entityId,
        entityType,
        archived: false,
        internal: false,
    })) as unknown as PaymentPlan[];
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

    const paymentPlan = await PaymentPlanModel.createOne(paymentPlanPayload);

    if (!entity.defaultPaymentPlan) {
        (entity as InternalCourse | InternalCommunity).defaultPaymentPlan =
            paymentPlan.planId;
    }
    if (entityType === Constants.MembershipEntityType.COMMUNITY) {
        await CommunityModel.saveOne(entity as any);
    } else {
        await CourseModel.saveOne(entity as any);
    }

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

    const paymentPlan = await PaymentPlanModel.queryOne({
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

    await PaymentPlanModel.saveOne(paymentPlan);

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

    const paymentPlan = await PaymentPlanModel.queryOne({
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
    await PaymentPlanModel.saveOne(paymentPlan);

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

    const paymentPlan = await PaymentPlanModel.queryOne({
        domain: ctx.subdomain._id,
        planId,
        archived: false,
    });

    if (!paymentPlan) {
        throw new Error(responses.item_not_found);
    }

    (entity as InternalCommunity | InternalCourse).defaultPaymentPlan =
        paymentPlan.planId;
    if (entityType === Constants.MembershipEntityType.COMMUNITY) {
        await CommunityModel.saveOne(entity as any);
    } else {
        await CourseModel.saveOne(entity as any);
    }

    return paymentPlan;
}

export async function getInternalPaymentPlan(ctx: any) {
    return await PaymentPlanModel.queryOne({
        domain: ctx.subdomain._id,
        internal: true,
    });
}

export async function createInternalPaymentPlan(
    domain: Domain,
    userId: string,
) {
    return await PaymentPlanModel.createOne({
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
    const paymentPlans = (await PaymentPlanModel.query(
        {
            domain: ctx.subdomain._id,
            entityId,
            entityType,
            archived: false,
        },
        {
            includedProducts: 1,
        },
    )) as unknown as PaymentPlan[];

    const allIncludedProducts = paymentPlans.flatMap(
        (plan) => plan.includedProducts || [],
    );

    const products = (await CourseModel.query({
        domain: ctx.subdomain._id,
        courseId: { $in: allIncludedProducts },
        published: true,
    })) as unknown as InternalCourse[];

    return products;
}

export async function addIncludedProductsMemberships({
    domain,
    userId,
    paymentPlan,
    sessionId,
}: {
    domain: Domain["_id"];
    userId: string;
    paymentPlan: PaymentPlan;
    sessionId: string;
}) {
    const courses = await CourseModel.query({
        domain,
        courseId: { $in: paymentPlan.includedProducts },
        published: true,
    });

    for (const course of courses) {
        const membership = await MembershipModel.createOne({
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
    domain: Domain["_id"];
    userId: string;
    paymentPlanId: string;
}) {
    await ActivityModel.removeMany({
        domain,
        userId,
        type: constants.activityTypes[0],
        "metadata.isIncludedInPlan": true,
        "metadata.paymentPlanId": paymentPlanId,
    });
    await MembershipModel.removeMany({
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
    domain: Domain["_id"];
    courseId: string;
}) {
    await PaymentPlanModel.patchMany(
        { domain, includedProducts: { $in: [courseId] } },
        { $pull: { includedProducts: courseId } },
    );
}
