"use server";

import { repositories } from "@courselit/orm-models";
import { responses } from "@/config/strings";
import { makeModelTextSearchable, checkIfAuthenticated } from "@/lib/graphql";
import constants from "@/config/constants";
import GQLContext from "@/models/GQLContext";
import { initMandatoryPages } from "../pages/logic";
import { checkPermission, generateUniqueId } from "@courselit/utils";
import UserSegmentModel from "@models/UserSegment";
import { default as LegacyUserModel } from "@models/User";
import {
    InternalCourse,
    InternalUser,
    UserSegment,
} from "@courselit/common-logic";
import { Course, UIConstants, User } from "@courselit/common-models";
import mongoose from "mongoose";
import {
    Constants,
    Media,
    Membership,
    MembershipEntityType,
    MembershipStatus,
    PaymentPlan,
    Progress,
    UserFilterWithAggregator,
    type Event,
    Domain,
} from "@courselit/common-models";
import { recordActivity } from "@/lib/record-activity";
import { triggerSequences } from "@/lib/trigger-sequences";
import { getCourseOrThrow } from "../courses/logic";
import pug from "pug";
import courseEnrollTemplate from "@/templates/course-enroll";
import { generateEmailFrom } from "@/lib/utils";
import MembershipModel from "@models/Membership";
import CommunityModel from "@models/Community";
import CourseModel from "@models/Course";
import { addMailJob } from "@/services/queue";
import { getPaymentMethodFromSettings } from "@/payments-new";
import { checkForInvalidPermissions } from "@/lib/check-invalid-permissions";
import { activateMembership } from "@/app/api/payment/helpers";
import {
    createInternalPaymentPlan,
    getInternalPaymentPlan,
} from "../paymentplans/logic";
import {
    convertFiltersToDBConditions,
    InternalMembership,
} from "@courselit/common-logic";
import { getPlanPrice } from "@courselit/utils";
import CertificateModel from "@models/Certificate";
import CertificateTemplateModel, {
    CertificateTemplate,
} from "@models/CertificateTemplate";
import {
    validateUserDeletion,
    migrateBusinessEntities,
    cleanupPersonalData,
} from "./helpers";
const { permissions } = UIConstants;

const removeAdminFieldsFromUserObject = (user: any) => ({
    id: user._id,
    name: user.name,
    userId: user.userId,
    bio: user.bio,
    email: user.email,
    avatar: user.avatar,
});

export const getUser = async (
    userId: string | null = null,
    ctx: GQLContext,
) => {
    let user: any = ctx.user;

    if (userId) {
        user = await repositories.user.findByUserId(
            userId,
            ctx.subdomain.id.toString(),
        );
    }

    if (!user) {
        throw new Error(responses.item_not_found);
    }

    if (
        ctx.user &&
        (user.userId === ctx.user.userId ||
            checkPermission(ctx.user.permissions, [permissions.manageUsers]))
    ) {
        return user;
    } else {
        return removeAdminFieldsFromUserObject(user);
    }
};

const validateUserProperties = (user) => {
    checkForInvalidPermissions(user.permissions);
};

interface UserData {
    id: string;
    name?: string;
    active?: boolean;
    bio?: string;
    permissions?: string[];
    subscribedToUpdates?: boolean;
    tags?: string[];
    avatar?: Media;
}

export const updateUser = async (userData: UserData, ctx: GQLContext) => {
    checkIfAuthenticated(ctx);
    const { id } = userData;
    const keys = Object.keys(userData);

    const hasPermissionToManageUser = checkPermission(ctx.user.permissions, [
        permissions.manageUsers,
    ]);
    const isModifyingSelf = id === ctx.user.userId;
    const restrictedKeys = ["permissions", "active"];

    if (
        (isModifyingSelf && keys.some((key) => restrictedKeys.includes(key))) ||
        (!isModifyingSelf && !hasPermissionToManageUser)
    ) {
        throw new Error(responses.action_not_allowed);
    }

    const user = await repositories.user.findByUserId(
        id,
        ctx.subdomain.id.toString(),
    );
    if (!user) throw new Error(responses.item_not_found);

    const updates: any = {};
    for (const key of keys.filter((key) => key !== "id")) {
        if (key === "tags") {
            addTags(userData["tags"]!, ctx);
        }

        updates[key] = userData[key];
    }

    // Validate merged object (simulating what the user would look like)
    const pendingUser = { ...user, ...updates };
    validateUserProperties(pendingUser);

    const updatedUser = await repositories.user.update(user.id, updates);
    return updatedUser;
};

export const inviteCustomer = async (
    email: string,
    tags: string[],
    id: string,
    ctx: GQLContext,
) => {
    checkIfAuthenticated(ctx);
    if (!checkPermission(ctx.user.permissions, [permissions.manageUsers])) {
        throw new Error(responses.action_not_allowed);
    }

    const course = await getCourseOrThrow(undefined, ctx, id);
    if (!course.published) {
        throw new Error(responses.cannot_invite_to_unpublished_product);
    }

    const sanitizedEmail = (email as string).toLowerCase();
    let user = await repositories.user.findByEmail(
        sanitizedEmail,
        ctx.subdomain.id.toString(),
    );
    if (!user) {
        user = await createUser({
            domain: ctx.subdomain!,
            email: sanitizedEmail,
            subscribedToUpdates: true,
        });
    }

    if (tags.length) {
        user = await updateUser(
            { id: user.userId, tags: [...(user.tags || []), ...tags] },
            ctx,
        );
    }

    const paymentPlan = await getInternalPaymentPlan(ctx);
    const membership = await getMembership({
        domainId: ctx.subdomain.id,
        userId: user!.userId,
        entityType: Constants.MembershipEntityType.COURSE,
        entityId: course.courseId,
        planId: paymentPlan.planId,
    });

    if (membership.status === Constants.MembershipStatus.ACTIVE) {
        return user;
    }

    await activateMembership(ctx.subdomain!, membership, paymentPlan);

    try {
        const emailBody = pug.render(courseEnrollTemplate, {
            courseName: course.title,
            loginLink: `${ctx.address}/login`,
            hideCourseLitBranding:
                ctx.subdomain.settings?.hideCourseLitBranding,
        });

        await addMailJob({
            to: [user!.email],
            subject: `You have been invited to ${course.title}`,
            body: emailBody,
            from: generateEmailFrom({
                name: ctx.subdomain?.settings?.title || ctx.subdomain.name,
                email: process.env.EMAIL_FROM || ctx.subdomain.email,
            }),
        });
    } catch (error) {
        // eslint-disable-next-line no-console
        console.log("error", error);
    }

    return user;
};

export const deleteUser = async (
    userId: string,
    ctx: GQLContext,
): Promise<boolean> => {
    checkIfAuthenticated(ctx);

    if (!checkPermission(ctx.user.permissions, [permissions.manageUsers])) {
        throw new Error(responses.action_not_allowed);
    }

    const userToDelete = await repositories.user.findByUserId(
        userId,
        ctx.subdomain.id.toString(),
    );

    if (!userToDelete) {
        throw new Error(responses.user_not_found);
    }

    if (userToDelete.userId === ctx.user.userId) {
        throw new Error(responses.action_not_allowed);
    }

    const deleterUser =
        (await repositories.user.findByUserId(
            ctx.user.userId,
            ctx.subdomain.id.toString(),
        )) || (ctx.user as unknown as User);

    await validateUserDeletion(userToDelete, ctx);

    await migrateBusinessEntities(userToDelete, deleterUser, ctx);

    await cleanupPersonalData(userToDelete, ctx);

    return true;
};

interface GetUsersParams {
    page?: number;
    limit?: number;
    filters?: string;
    ctx: GQLContext;
}

export const getUsers = async ({
    page = 1,
    limit = constants.itemsPerPage,
    filters,
    ctx,
}: GetUsersParams) => {
    checkIfAuthenticated(ctx);
    if (!checkPermission(ctx.user.permissions, [permissions.manageUsers])) {
        throw new Error(responses.action_not_allowed);
    }

    const searchUsers = makeModelTextSearchable(LegacyUserModel);
    const query = await buildQueryFromSearchData(
        new mongoose.Types.ObjectId(ctx.subdomain.id),
        filters,
    );
    const users = await searchUsers(
        {
            offset: page,
            query,
            graphQLContext: ctx,
        },
        {
            itemsPerPage: limit,
            sortByColumn: "createdAt",
            sortOrder: -1,
        },
    );

    return users.map(async (user) => ({
        ...user,
        content: await getUserContentInternal(ctx, user),
    }));
};

export const getUsersCount = async (ctx: GQLContext, filters?: string) => {
    checkIfAuthenticated(ctx);
    if (!checkPermission(ctx.user.permissions, [permissions.manageUsers])) {
        throw new Error(responses.action_not_allowed);
    }

    const query = await buildQueryFromSearchData(
        new mongoose.Types.ObjectId(ctx.subdomain.id),
        filters,
    );
    return await LegacyUserModel.countDocuments(query);
};

const buildQueryFromSearchData = async (
    domain: mongoose.Types.ObjectId,
    inputFilters?: string,
): Promise<Record<string, unknown>> => {
    let filters = {};
    if (inputFilters) {
        const filtersWithAggregator: UserFilterWithAggregator =
            JSON.parse(inputFilters);
        filters = await convertFiltersToDBConditions({
            domain,
            filter: filtersWithAggregator,
        });
    }
    return { domain, ...filters };
};

export const recordProgress = async ({
    lessonId,
    courseId,
    user,
}: {
    lessonId: string;
    courseId: string;
    user: User;
}) => {
    const enrolledItemIndex = user.purchases.findIndex(
        (progress: Progress) => progress.courseId === courseId,
    );

    if (enrolledItemIndex === -1) {
        throw new Error(responses.not_enrolled);
    }

    if (
        user.purchases[enrolledItemIndex].completedLessons.indexOf(lessonId) ===
        -1
    ) {
        user.purchases[enrolledItemIndex].completedLessons.push(lessonId);
        const userIdForUpdate =
            (user as any)._id?.toString() || user.id || user.userId;
        await repositories.user.update(userIdForUpdate, {
            purchases: user.purchases,
        });
    }
};

export async function createUser({
    domain,
    name,
    email,
    lead,
    superAdmin = false,
    subscribedToUpdates = true,
    permissions = [],
}: {
    domain: Domain;
    name?: string;
    email: string;
    lead?:
        | typeof constants.leadWebsite
        | typeof constants.leadNewsletter
        | typeof constants.leadApi
        | typeof constants.leadDownload;
    superAdmin?: boolean;
    subscribedToUpdates?: boolean;
    permissions?: string[];
}): Promise<User> {
    if (permissions.length) {
        checkForInvalidPermissions(permissions);
    }

    const upsertResult = await repositories.user.upsertUser(
        { email, domainId: domain.id },
        {
            domain: domain.id,
            // Note: Repository upsertUser sets on insert.
            name,
            email: email.toLowerCase(),
            active: true,
            purchases: [],
            permissions: superAdmin
                ? [
                      constants.permissions.manageCourse,
                      constants.permissions.manageAnyCourse,
                      constants.permissions.publishCourse,
                      constants.permissions.manageMedia,
                      constants.permissions.manageSite,
                      constants.permissions.manageSettings,
                      constants.permissions.manageUsers,
                      constants.permissions.manageCommunity,
                  ]
                : [
                      constants.permissions.enrollInCourse,
                      constants.permissions.manageMedia,
                      ...permissions,
                  ],
            lead: lead || constants.leadWebsite,
            subscribedToUpdates,
        },
    );

    const createdUser = upsertResult.user;
    const isNewUser = upsertResult.isNew;

    if (isNewUser) {
        if (superAdmin) {
            await initMandatoryPages(domain as any, createdUser);
            await createInternalPaymentPlan(domain as any, createdUser.userId);
        }

        await recordActivityAndTriggerSequences(
            { ...createdUser, domain: domain.id } as User,
            domain,
        );
    }

    return createdUser;
}

export async function updateUserAfterCreationViaAuth(
    id: string,
    domain: Domain,
) {
    const updatedUser = await repositories.user.update(
        id, // Assuming id here is _id as in original findOneAndUpdate query {_id: new ObjectId(id)}
        {
            domain: domain.id,
            userId: generateUniqueId(),
            active: true,
            purchases: [],
            permissions: [
                constants.permissions.enrollInCourse,
                constants.permissions.manageMedia,
            ],
            lead: constants.leadWebsite,
            subscribedToUpdates: true,
            tags: [],
            unsubscribeToken: generateUniqueId(),
        } as any,
    );

    // update returns null if not found
    if (updatedUser) {
        await recordActivityAndTriggerSequences(
            { ...updatedUser, domain: domain.id } as User,
            domain,
        );
    }
}

async function recordActivityAndTriggerSequences(user: User, domain: Domain) {
    await recordActivity({
        domain: domain.id,
        userId: user.userId,
        type: Constants.ActivityType.USER_CREATED,
    });

    if (user.subscribedToUpdates) {
        await triggerSequences({
            user: user,
            event: Constants.EventType.SUBSCRIBER_ADDED,
        });

        await recordActivity({
            domain: domain!.id,
            userId: user.userId,
            type: Constants.ActivityType.NEWSLETTER_SUBSCRIBED,
        });
    }
}

export async function getSegments(ctx: GQLContext): Promise<UserSegment[]> {
    checkIfAuthenticated(ctx);
    if (!checkPermission(ctx.user.permissions, [permissions.manageUsers])) {
        throw new Error(responses.action_not_allowed);
    }

    const segments = await UserSegmentModel.find({
        domain: ctx.subdomain.id,
        userId: ctx.user.userId,
    });

    return segments;
}

export async function createSegment(
    segmentData: { name: string; filter: string },
    ctx: GQLContext,
): Promise<UserSegment[]> {
    checkIfAuthenticated(ctx);
    if (!checkPermission(ctx.user.permissions, [permissions.manageUsers])) {
        throw new Error(responses.action_not_allowed);
    }

    const filter: UserFilterWithAggregator = JSON.parse(segmentData.filter);

    await UserSegmentModel.create({
        domain: ctx.subdomain.id,
        userId: ctx.user.userId,
        name: segmentData.name,
        filter,
    });

    const segments = await UserSegmentModel.find({
        domain: ctx.subdomain.id,
        userId: ctx.user.userId,
    });

    return segments;
}

export async function deleteSegment(
    segmentId: string,
    ctx: GQLContext,
): Promise<UserSegment[]> {
    checkIfAuthenticated(ctx);
    if (!checkPermission(ctx.user.permissions, [permissions.manageUsers])) {
        throw new Error(responses.action_not_allowed);
    }

    await UserSegmentModel.deleteOne({
        domain: ctx.subdomain.id,
        userId: ctx.user.userId,
        segmentId,
    });

    const segments = await UserSegmentModel.find({
        domain: ctx.subdomain.id,
        userId: ctx.user.userId,
    });

    return segments;
}

export const getTags = async (ctx: GQLContext) => {
    checkIfAuthenticated(ctx);

    if (!checkPermission(ctx.user.permissions, [permissions.manageUsers])) {
        throw new Error(responses.action_not_allowed);
    }

    if (!ctx.subdomain.tags) {
        ctx.subdomain.tags = [];
        await (ctx.subdomain as any).save();
    }

    return ctx.subdomain.tags;
};

export const getTagsWithDetails = async (ctx: GQLContext) => {
    checkIfAuthenticated(ctx);

    if (!checkPermission(ctx.user.permissions, [permissions.manageUsers])) {
        throw new Error(responses.action_not_allowed);
    }

    const tagsWithUsersCount = await repositories.user.getTagsWithDetails(
        ctx.subdomain.id.toString(),
        ctx.subdomain.tags,
    );

    return tagsWithUsersCount;
};

export const addTags = async (tags: string[], ctx: GQLContext) => {
    checkIfAuthenticated(ctx);

    if (!checkPermission(ctx.user.permissions, [permissions.manageUsers])) {
        throw new Error(responses.action_not_allowed);
    }

    for (let tag of tags) {
        if (!ctx.subdomain.tags.includes(tag)) {
            ctx.subdomain.tags.push(tag);
        }
    }
    await (ctx.subdomain as any).save();

    return ctx.subdomain.tags;
};

export const deleteTag = async (tag: string, ctx: GQLContext) => {
    checkIfAuthenticated(ctx);

    if (!checkPermission(ctx.user.permissions, [permissions.manageUsers])) {
        throw new Error(responses.action_not_allowed);
    }

    await repositories.user.removeTagFromUsers(
        tag,
        ctx.subdomain.id.toString(),
    );
    const tagIndex = ctx.subdomain.tags.indexOf(tag);
    ctx.subdomain.tags.splice(tagIndex, 1);

    await (ctx.subdomain as any).save();

    return getTagsWithDetails(ctx);
};

export const untagUsers = async (tag: string, ctx: GQLContext) => {
    checkIfAuthenticated(ctx);

    if (!checkPermission(ctx.user.permissions, [permissions.manageUsers])) {
        throw new Error(responses.action_not_allowed);
    }

    await repositories.user.removeTagFromUsers(
        tag,
        ctx.subdomain.id.toString(),
    );

    return getTagsWithDetails(ctx);
};

export const getUserContent = async (
    ctx: GQLContext,
    userId?: string,
): Promise<any> => {
    checkIfAuthenticated(ctx);

    let id = ctx.user.userId;
    if (userId) {
        if (!checkPermission(ctx.user.permissions, [permissions.manageUsers])) {
            throw new Error(responses.action_not_allowed);
        }
        id = userId;
    }

    const user = await repositories.user.findByUserId(
        id,
        ctx.subdomain.id.toString(),
    );

    if (!user) {
        throw new Error(responses.item_not_found);
    }

    return await getUserContentInternal(ctx, user);
};

async function getUserContentInternal(ctx: GQLContext, user: User) {
    const memberships = await MembershipModel.find<Membership>({
        domain: ctx.subdomain.id,
        userId: user.userId,
        status: Constants.MembershipStatus.ACTIVE,
    });

    const content: Record<string, unknown>[] = [];

    for (const membership of memberships) {
        if (membership.entityType === Constants.MembershipEntityType.COURSE) {
            const distinctCourse = content.some(
                (item: any) =>
                    item.entityType === Constants.MembershipEntityType.COURSE &&
                    item.entity.id === membership.entityId,
            );

            if (distinctCourse) {
                continue;
            }

            const course = await CourseModel.findOne({
                courseId: membership.entityId,
                domain: ctx.subdomain.id,
            });

            if (course) {
                content.push({
                    entityType: Constants.MembershipEntityType.COURSE,
                    entity: {
                        id: course.courseId,
                        title: course.title,
                        slug: course.slug,
                        type: course.type,
                        totalLessons: course.lessons.length,
                        completedLessonsCount: user.purchases.find(
                            (progress: Progress) =>
                                progress.courseId === course.courseId,
                        )?.completedLessons.length,
                        featuredImage: course.featuredImage,
                        certificateId: user.purchases.find(
                            (progress: Progress) =>
                                progress.courseId === course.courseId,
                        )?.certificateId,
                    },
                });
            }
        }
        if (
            membership.entityType === Constants.MembershipEntityType.COMMUNITY
        ) {
            const community = await CommunityModel.findOne({
                communityId: membership.entityId,
                domain: ctx.subdomain.id,
                deleted: false,
            });

            if (community) {
                content.push({
                    entityType: Constants.MembershipEntityType.COMMUNITY,
                    entity: {
                        id: community.communityId,
                        title: community.name,
                        featuredImage: community.featuredImage,
                    },
                });
            }
        }
    }

    return content;
}

export const getMembershipStatus = async ({
    entityId,
    entityType,
    ctx,
}: {
    entityId: string;
    entityType: MembershipEntityType;
    ctx: GQLContext;
}): Promise<MembershipStatus | null> => {
    checkIfAuthenticated(ctx);

    const membership: Membership | null = await MembershipModel.findOne({
        domain: ctx.subdomain.id,
        entityId,
        entityType,
        userId: ctx.user.userId,
    });

    return membership ? membership.status : null;
};

export const hasActiveSubscription = async (
    member: Membership,
    ctx: GQLContext,
) => {
    if (!member.subscriptionId || !member.subscriptionMethod) {
        return false;
    }

    const paymentMethod = await getPaymentMethodFromSettings(
        ctx.subdomain.settings,
        member.subscriptionMethod,
    );
    const isSubscriptionActive = paymentMethod
        ? await paymentMethod.validateSubscription(member.subscriptionId)
        : false;

    return isSubscriptionActive;
};

export const getMembership = async ({
    domainId,
    userId,
    entityType,
    entityId,
    planId,
}: {
    domainId: string;
    userId: string;
    entityType: MembershipEntityType;
    entityId: string;
    planId: string;
}): Promise<InternalMembership> => {
    const existingMembership =
        await MembershipModel.findOne<InternalMembership>({
            domain: new mongoose.Types.ObjectId(domainId),
            userId,
            entityType,
            entityId,
        });

    let membership: InternalMembership =
        existingMembership ||
        (await MembershipModel.create({
            domain: new mongoose.Types.ObjectId(domainId),
            userId,
            paymentPlanId: planId,
            entityId,
            entityType,
            status: Constants.MembershipStatus.PENDING,
        }));

    return membership;
};

export async function runPostMembershipTasks({
    domain,
    membership,
    paymentPlan,
}: {
    domain: mongoose.Types.ObjectId;
    membership: Membership;
    paymentPlan: PaymentPlan;
}) {
    const user = await repositories.user.findByUserId(
        membership.userId,
        domain.toString(),
    );
    if (!user) {
        return;
    }

    let event: Event | undefined = undefined;
    if (
        paymentPlan.type !== Constants.PaymentPlanType.FREE &&
        !membership.isIncludedInPlan
    ) {
        await recordActivity({
            domain: domain.toString(),
            userId: user.userId,
            type: constants.activityTypes[1],
            entityId: membership.entityId,
            metadata: {
                cost: getPlanPrice(paymentPlan).amount,
                purchaseId: membership.sessionId,
            },
        });
    }
    if (membership.entityType === Constants.MembershipEntityType.COMMUNITY) {
        await recordActivity({
            domain: domain.toString(),
            userId: user.userId,
            type: constants.activityTypes[15],
            entityId: membership.entityId,
        });

        event = Constants.EventType.COMMUNITY_JOINED as unknown as Event;
    }
    if (membership.entityType === Constants.MembershipEntityType.COURSE) {
        const product = await CourseModel.findOne<InternalCourse>({
            courseId: membership.entityId,
        });
        if (product) {
            await addProductToUser({
                user,
                product,
            });
        }
        await recordActivity({
            domain: domain.toString(),
            userId: user.userId,
            type: constants.activityTypes[0],
            entityId: membership.entityId,
            metadata: {
                isIncludedInPlan: true,
                paymentPlanId: paymentPlan.planId,
            },
        });

        event = Constants.EventType.PRODUCT_PURCHASED as unknown as Event;
    }

    if (event) {
        await triggerSequences({ user, event, data: membership.entityId });
    }
}

async function addProductToUser({
    user,
    product,
}: {
    user: User | InternalUser;
    product: InternalCourse;
}) {
    if (
        !user.purchases.some(
            (purchase: Progress) => purchase.courseId === product.courseId,
        )
    ) {
        user.purchases.push({
            courseId: product.courseId,
            completedLessons: [],
            accessibleGroups: [],
        });
        // user object here might be complex. If it has userId, use that.
        // user from arguments is User | InternalUser. Both have userId.
        await repositories.user.update(user.userId, {
            purchases: user.purchases,
        });
    }
}

export const getCertificate = async (
    certificateId: string,
    ctx: GQLContext,
    courseId?: string,
) => {
    if (certificateId === "demo" && !courseId) {
        throw new Error(responses.certificate_demo_course_id_required);
    }

    return await getCertificateInternal(certificateId, ctx.subdomain, courseId);
};

export const getCertificateInternal = async (
    certificateId: string,
    domain: Domain,
    courseId?: string,
) => {
    const certificate =
        certificateId !== "demo"
            ? await CertificateModel.findOne({
                  domain: domain.id,
                  certificateId,
              })
            : {
                  certificateId: "demo",
                  createdAt: new Date(),
              };

    if (!certificate) {
        throw new Error(responses.item_not_found);
    }

    const user =
        certificateId !== "demo"
            ? ((await repositories.user.findByUserId(
                  certificate.userId,
                  domain.id.toString(),
              )) as unknown as User)
            : {
                  name: "John Doe",
                  email: "john.doe@example.com",
                  avatar: null,
              };

    const course = (await CourseModel.findOne({
        domain: domain.id,
        courseId: certificateId !== "demo" ? certificate.courseId : courseId,
    }).lean()) as unknown as Course;

    if (!course) {
        throw new Error(responses.item_not_found);
    }

    const creator = (await repositories.user.findByUserId(
        course.creatorId,
        domain.id.toString(),
    )) as unknown as User;

    const template = (await CertificateTemplateModel.findOne({
        domain: domain.id,
        courseId: course.courseId,
    }).lean()) as unknown as CertificateTemplate;

    return {
        certificateId: certificate.certificateId,
        title: template?.title || "Certificate of Completion",
        subtitle: template?.subtitle || "This certificate is awarded to",
        description: template?.description || "for completing the course.",
        signatureImage: template?.signatureImage || null,
        signatureName: template?.signatureName || creator?.name,
        signatureDesignation: template?.signatureDesignation || null,
        logo: template?.logo || domain.settings?.logo || null,
        productTitle: course?.title,
        userName: user?.name || user?.email,
        createdAt: certificate.createdAt,
        userImage: user?.avatar || null,
        productPageId: course?.pageId || null,
    };
};
