/**
 * Business logic for managing courses.
 */
import { repositories, Criteria } from "@courselit/orm-models";
import { InternalCourse } from "@courselit/common-logic";
import { responses } from "@/config/strings";
import {
    checkIfAuthenticated,
    validateOffset,
    checkOwnershipWithoutModel,
} from "@/lib/graphql";
import constants from "@/config/constants";
import {
    getPaginatedCoursesForAdmin,
    setupBlog,
    setupCourse,
    validateCourse,
} from "./helpers";
import GQLContext from "@/models/GQLContext";
import Filter from "./models/filter";
import mongoose from "mongoose";
import {
    Constants,
    Group,
    Membership,
    MembershipStatus,
    Progress,
    PaymentPlan,
    Course,
    Lesson,
    Email,
} from "@courselit/common-models";
import { deleteAllLessons } from "../lessons/logic";
import { deleteMedia } from "@/services/medialit";
import { getPrevNextCursor } from "../lessons/helpers";
import { checkPermission } from "@courselit/utils";
import { error } from "@/services/logger";
import { getPlans } from "../paymentplans/logic";

import { getActivities } from "../activities/logic";
import { ActivityType } from "@courselit/common-models/dist/constants";
import { verifyMandatoryTags } from "../mails/helpers";
import { InternalCertificateTemplate as CertificateTemplate } from "@courselit/orm-models/dist/models/certificate-template";

import getDeletedMediaIds, {
    extractMediaIDs,
} from "@/lib/get-deleted-media-ids";
import { deletePageInternal } from "../pages/logic";

const { open, itemsPerPage, blogPostSnippetLength, permissions } = constants;

export const getCourseOrThrow = async (
    id: mongoose.Types.ObjectId | undefined,
    ctx: GQLContext,
    courseId?: string,
): Promise<InternalCourse> => {
    checkIfAuthenticated(ctx);

    const cb = Criteria.create<Course>();
    cb.where("domain" as keyof Course, "eq", ctx.subdomain._id);
    if (courseId) {
        cb.where("courseId", "eq", courseId);
    } else if (id) {
        cb.where("_id" as keyof Course, "eq", id.toString());
    }

    const course = await repositories.course.findOne(cb);

    if (!course) {
        throw new Error(responses.item_not_found);
    }

    const internalCourse = course as unknown as InternalCourse;

    if (!checkPermission(ctx.user.permissions, [permissions.manageAnyCourse])) {
        if (!checkOwnershipWithoutModel(internalCourse, ctx)) {
            throw new Error(responses.item_not_found);
        } else {
            if (
                !checkPermission(ctx.user.permissions, [
                    permissions.manageCourse,
                ])
            ) {
                throw new Error(responses.action_not_allowed);
            }
        }
    }

    return internalCourse;
};

async function formatCourse(courseId: string, ctx: GQLContext) {
    const courseResult = await repositories.course.findByCourseId(
        courseId,
        ctx.subdomain.id,
    );
    const course = courseResult as unknown as InternalCourse;

    const paymentPlans = await getPlans({
        entityId: course!.courseId,
        entityType: Constants.MembershipEntityType.COURSE,
        ctx,
    });

    if (
        course.type === Constants.CourseType.COURSE ||
        course.type === Constants.CourseType.DOWNLOAD
    ) {
        const { nextLesson } = await getPrevNextCursor(
            course.courseId,
            ctx.subdomain._id,
        );
        (course as any).firstLesson = nextLesson;
    }

    const result = {
        ...course,
        groups: course!.groups?.map((group: any) => ({
            ...group,
            id: group._id.toString(),
        })),
        paymentPlans,
    };
    return result;
}

export const getCourse = async (
    id: string,
    ctx: GQLContext,
    asGuest: boolean = false,
) => {
    const course = (await repositories.course.findByCourseId(
        id,
        ctx.subdomain.id,
    )) as unknown as InternalCourse | null;

    if (!course) {
        throw new Error(responses.item_not_found);
    }

    if (ctx.user && !asGuest) {
        const isOwner =
            checkPermission(ctx.user.permissions, [
                permissions.manageAnyCourse,
            ]) || checkOwnershipWithoutModel(course, ctx);

        if (isOwner) {
            return await formatCourse(course.courseId, ctx);
        }
    }

    if (course.published) {
        return await formatCourse(course.courseId, ctx);
    } else {
        return null;
    }
};

export const createCourse = async (
    courseData: { title: string; type: Filter },
    ctx: GQLContext,
) => {
    checkIfAuthenticated(ctx);
    if (
        !checkPermission(ctx.user.permissions, [
            permissions.manageAnyCourse,
            permissions.manageCourse,
        ])
    ) {
        throw new Error(responses.action_not_allowed);
    }

    if (courseData.type === "blog") {
        return await setupBlog({
            title: courseData.title,
            ctx,
        });
    } else {
        return await setupCourse({
            title: courseData.title,
            type: courseData.type,
            ctx,
        });
    }
};

export const updateCourse = async (
    courseData: Partial<InternalCourse & { id: string }>,
    ctx: GQLContext,
) => {
    let course = await getCourseOrThrow(undefined, ctx, courseData.id);
    const mediaIdsMarkedForDeletion: string[] = [];

    if (Object.prototype.hasOwnProperty.call(courseData, "description")) {
        const nextDescription = (courseData.description ?? "") as string;
        mediaIdsMarkedForDeletion.push(
            ...getDeletedMediaIds(course.description || "", nextDescription),
        );
    }

    for (const key of Object.keys(courseData)) {
        if (key === "id") {
            continue;
        }

        if (
            key === "published" &&
            !checkPermission(ctx.user.permissions, [permissions.publishCourse])
        ) {
            throw new Error(responses.action_not_allowed);
        }

        if (key === "published" && !ctx.user.name) {
            throw new Error(responses.profile_incomplete);
        }

        course[key] = courseData[key];
    }

    course = await validateCourse(course, ctx);
    for (const mediaId of mediaIdsMarkedForDeletion) {
        await deleteMedia(mediaId);
    }

    // course is InternalCourse (cast from Course), so ID is string.
    const updated = await repositories.course.update(
        course.id.toString(),
        course as unknown as Course,
    );
    course = updated as unknown as InternalCourse;

    if (course.pageId) {
        await repositories.page.update(course.pageId, { name: course.title });
    }

    return await formatCourse(course.courseId, ctx);
};

export const deleteCourse = async (id: string, ctx: GQLContext) => {
    const course = await getCourseOrThrow(undefined, ctx, id);

    // Certificate Templates
    const certTemplateCriteria = Criteria.create<CertificateTemplate>();
    certTemplateCriteria.where(
        "domain" as keyof CertificateTemplate,
        "eq",
        ctx.subdomain._id,
    );
    certTemplateCriteria.where("courseId", "eq", course.courseId);

    // We need to fetch to delete media
    const certificateTemplate =
        await repositories.certificateTemplate.findOne(certTemplateCriteria);

    if (certificateTemplate?.signatureImage?.mediaId) {
        await deleteMedia(certificateTemplate.signatureImage.mediaId);
    }
    if (certificateTemplate?.logo?.mediaId) {
        await deleteMedia(certificateTemplate.logo.mediaId);
    }
    await repositories.certificateTemplate.deleteMany(certTemplateCriteria);

    // Certificates
    const certCriteria = Criteria.create<any>();
    certCriteria.where("domain", "eq", ctx.subdomain._id);
    certCriteria.where("courseId", "eq", course.courseId);
    await repositories.certificate.deleteMany(certCriteria);

    // Membership
    const memCriteria = Criteria.create<Membership>();
    memCriteria.where("domain", "eq", ctx.subdomain._id);
    memCriteria.where("entityId", "eq", course.courseId);
    memCriteria.where(
        "entityType",
        "eq",
        Constants.MembershipEntityType.COURSE,
    );
    await repositories.membership.deleteMany(memCriteria);

    // Payment Plans
    const planCriteria = Criteria.create<PaymentPlan>();
    planCriteria.where("domain", "eq", ctx.subdomain._id);
    planCriteria.where("entityId", "eq", course.courseId);
    planCriteria.where(
        "entityType",
        "eq",
        Constants.MembershipEntityType.COURSE,
    );
    await repositories.paymentPlan.deleteMany(planCriteria);

    await repositories.paymentPlan.removeProductFromPlans(
        course.courseId,
        ctx.subdomain.id.toString(),
    );

    // Activities - Split $or into two delete calls
    const actCriteria1 = Criteria.create<any>();
    actCriteria1.where("domain", "eq", ctx.subdomain._id);
    actCriteria1.where("entityId", "eq", course.courseId);
    await repositories.activity.deleteMany(actCriteria1);

    const actCriteria2 = Criteria.create<any>();
    actCriteria2.where("domain", "eq", ctx.subdomain._id);
    actCriteria2.where("metadata.courseId", "eq", course.courseId);
    await repositories.activity.deleteMany(actCriteria2);

    await deleteAllLessons(course.courseId, ctx);
    if (course.featuredImage) {
        try {
            await deleteMedia(course.featuredImage.mediaId);
        } catch (err: any) {
            error(err.message, {
                stack: err.stack,
            });
        }
    }
    if (course.description) {
        const extractedMediaIds = extractMediaIDs(course.description || "");
        for (const mediaId of Array.from(extractedMediaIds)) {
            await deleteMedia(mediaId);
        }
    }

    // Remove purchase from users
    await repositories.user.removePurchaseFromUsers(
        course.courseId,
        ctx.subdomain.id.toString(),
    );

    await deletePageInternal(ctx, course.pageId!);

    // Delete Course
    const courseCriteria = Criteria.create<Course>();
    courseCriteria.where("domain" as keyof Course, "eq", ctx.subdomain._id);
    courseCriteria.where("courseId", "eq", course.courseId);
    await repositories.course.deleteMany(courseCriteria);
    return true;
};

export const getCoursesAsAdmin = async ({
    offset,
    context,
    searchText,
    filterBy,
}: {
    offset: number;
    context: GQLContext;
    searchText?: string;
    filterBy?: Filter[];
}) => {
    checkIfAuthenticated(context);
    validateOffset(offset);
    const user = context.user;

    if (
        !checkPermission(user.permissions, [
            permissions.manageCourse,
            permissions.manageAnyCourse,
        ])
    ) {
        throw new Error(responses.action_not_allowed);
    }

    const criteria = Criteria.create<Course>();
    criteria.where("domain" as keyof Course, "eq", context.subdomain._id);

    if (!checkPermission(user.permissions, [permissions.manageAnyCourse])) {
        criteria.where("creatorId", "eq", user.userId);
    }

    if (filterBy) {
        criteria.where("type", "in", filterBy);
    } else {
        criteria.where("type", "in", [constants.download, constants.course]);
    }

    if (searchText) {
        criteria.where("$text" as any, "eq", { $search: searchText });
    }

    const courses = await getPaginatedCoursesForAdmin({
        criteria,
        page: offset,
    });

    return courses.map(async (course) => ({
        ...course,
        customers: await (async () => {
            const cb = Criteria.create<Membership>();
            cb.where("entityId", "eq", course.courseId);
            cb.where("entityType", "eq", Constants.MembershipEntityType.COURSE);
            cb.where("domain", "eq", context.subdomain._id);
            return await repositories.membership.count(cb);
        })(),
        sales: (
            await getActivities({
                entityId: course.courseId,
                type: ActivityType.PURCHASED,
                duration: "lifetime",
                ctx: context,
            })
        ).count,
    }));
};

export const getCourses = async ({
    offset,
    ctx,
    tag,
    filterBy,
    ids,
}: {
    ctx: GQLContext;
    offset?: number;
    ids?: string[];
    tag?: string;
    filterBy?: Filter[];
}) => {
    const cb = Criteria.create<Course>();
    cb.where("published", "eq", true);
    cb.where(
        "privacy" as keyof Course,
        "eq",
        Constants.ProductAccessType.PUBLIC,
    );
    cb.where("domain" as keyof Course, "eq", ctx.subdomain._id);

    if (ids) {
        cb.where("courseId", "in", ids);
    } else {
        validateOffset(offset);
        if (tag) {
            cb.where("tags", "eq", tag);
        }
        if (filterBy) {
            cb.where("type", "in", filterBy);
        }
        cb.orderBy("updatedAt", "desc");
        cb.skip((offset! - 1) * itemsPerPage);
        cb.take(itemsPerPage);
    }

    // We fetch full objects. Projection is not natively supported in repo yet, but overhead is acceptable.
    const courses = await repositories.course.findMany(cb);

    return courses.map(async (x) => ({
        id: x.id,
        title: x.title,
        cost: x.cost,
        description: x.description,
        type: x.type,
        updatedAt: x.updatedAt,
        slug: x.slug,
        featuredImage: x.featuredImage,
        courseId: x.courseId,
        tags: x.tags,
        groups: x.isBlog ? undefined : x.groups,
        pageId: x.isBlog ? undefined : x.pageId,
    }));
};

const getProductsQuery = (
    ctx: GQLContext,
    filter?: Filter[],
    tags?: string[],
    ids?: string[],
    publicView: boolean = false,
) => {
    const cb = Criteria.create<Course>();
    cb.where("domain" as keyof Course, "eq", ctx.subdomain._id);

    if (
        !publicView &&
        ctx.user &&
        checkPermission(ctx.user.permissions, [
            permissions.manageAnyCourse,
            permissions.manageCourse,
        ])
    ) {
        if (
            checkPermission(ctx.user.permissions, [permissions.manageAnyCourse])
        ) {
            // do nothing
        } else {
            cb.where("creatorId", "eq", ctx.user.userId);
        }
    } else {
        cb.where("published", "eq", true);
        cb.where(
            "privacy" as keyof Course,
            "eq",
            Constants.ProductAccessType.PUBLIC,
        );
    }

    if (filter) {
        cb.where("type", "in", filter);
    } else {
        cb.where("type", "in", [constants.download, constants.course]);
    }

    if (tags) {
        cb.where("tags", "in", tags);
    }

    if (ids) {
        cb.where("courseId", "in", ids);
    }

    return cb;
};

export const getProducts = async ({
    ctx,
    page = 1,
    limit = 10,
    filterBy,
    tags,
    ids,
    publicView,
    sort = -1,
}: {
    ctx: GQLContext;
    page?: number;
    limit?: number;
    filterBy?: Filter[];
    tags?: string[];
    ids?: string[];
    publicView?: boolean;
    sort?: number;
}): Promise<InternalCourse[]> => {
    const cb = getProductsQuery(ctx, filterBy, tags, ids, publicView);
    cb.skip((page - 1) * limit);
    cb.take(limit);
    if (sort) {
        cb.orderBy("updatedAt", sort === 1 ? "asc" : "desc");
    }

    const { data: courses } = await repositories.course.findPaginated(cb);

    const hasManagePerm =
        ctx.user &&
        checkPermission(ctx.user.permissions, [
            permissions.manageAnyCourse,
            permissions.manageCourse,
        ]);

    const products: any[] = [];

    for (const course of courses) {
        const customers =
            hasManagePerm && course.type !== constants.blog
                ? await (async () => {
                      const cb = Criteria.create<Membership>();
                      cb.where("entityId", "eq", course.courseId);
                      cb.where(
                          "entityType",
                          "eq",
                          Constants.MembershipEntityType.COURSE,
                      );
                      cb.where(
                          "domain" as keyof Membership,
                          "eq",
                          ctx.subdomain._id,
                      );
                      cb.where(
                          "status",
                          "eq",
                          Constants.MembershipStatus.ACTIVE,
                      );
                      return await repositories.membership.count(cb);
                  })()
                : undefined;
        const sales =
            hasManagePerm && course.type !== constants.blog
                ? (
                      await getActivities({
                          entityId: course.courseId,
                          type: ActivityType.PURCHASED,
                          duration: "lifetime",
                          ctx,
                      })
                  ).count
                : undefined;
        const paymentPlans =
            course.type !== constants.blog
                ? await getPlans({
                      entityId: course.courseId,
                      entityType: Constants.MembershipEntityType.COURSE,
                      ctx,
                  })
                : undefined;
        const extendedCourse = {
            ...(course as unknown as InternalCourse),
            groups:
                course.type !== constants.blog
                    ? (course.groups ?? undefined)
                    : undefined,
            pageId: course.type !== constants.blog ? course.pageId : undefined,
            customers,
            sales: sales ?? 0,
            ...(paymentPlans ? { paymentPlans } : {}),
        };

        products.push(extendedCourse);
    }

    return products;
};

export const getProductsCount = async ({
    ctx,
    filterBy,
    tags,
    ids,
    publicView,
}: {
    ctx: GQLContext;
    filterBy?: Filter[];
    tags?: string[];
    ids?: string[];
    publicView?: boolean;
}) => {
    const cb = getProductsQuery(ctx, filterBy, tags, ids, publicView);

    return await repositories.course.count(cb);
};

export const addGroup = async ({
    id,
    name,
    collapsed,
    ctx,
}: {
    id: string;
    name: string;
    collapsed: boolean;
    ctx: GQLContext;
}) => {
    const course = await getCourseOrThrow(undefined, ctx, id);
    if (
        course.type === Constants.CourseType.DOWNLOAD &&
        course.groups?.length === 1
    ) {
        throw new Error(responses.download_course_cannot_have_groups);
    }

    const existingName = (group: Group) => group.name === name;

    if (course.groups?.some(existingName)) {
        throw new Error(responses.existing_group);
    }

    if (!course.groups) {
        course.groups = [];
    }

    const maximumRank =
        course.groups.reduce(
            (acc: number, value: { rank: number }) =>
                value.rank > acc ? value.rank : acc,
            0,
        ) ?? 0;

    course.groups.push({
        rank: maximumRank + 1000,
        name,
        // Assuming Group interface compatibility. Mongoose generates _id?
        // We might need to generate an ID for the group if it's new.
        // Mongoose subdocs get _id auto. POJO needs manual ID?
        // Group definition: id, name, rank...
        // If I push generic object, it won't have ID.
        // I should probably generate an ID.
        // using new mongoose.Types.ObjectId().toString()?
        // Or generic UUID.
        // Logic.ts imports mongoose.
        id: new mongoose.Types.ObjectId().toString(),
        // Check Group interface for other props. LessonOrder, etc.
        lessonsOrder: [],
        collapsed: false,
    } as unknown as Group);

    await repositories.course.update(
        course.id.toString(),
        course as unknown as Course,
    );

    return await formatCourse(course.courseId, ctx);
};

export const removeGroup = async (
    id: string,
    courseId: string,
    ctx: GQLContext,
) => {
    const course = await getCourseOrThrow(undefined, ctx, courseId);
    const group = course.groups?.find((group) => group.id === id);

    if (!group) {
        return await formatCourse(course.courseId, ctx);
    }

    if (
        course.type === Constants.CourseType.DOWNLOAD &&
        course.groups?.length === 1
    ) {
        throw new Error(responses.download_course_last_group_cannot_be_removed);
    }

    const countCriteria = Criteria.create<Lesson>();
    countCriteria.where("domain" as keyof Lesson, "eq", ctx.subdomain._id);
    countCriteria.where("courseId", "eq", courseId);
    countCriteria.where("groupId", "eq", group.id);
    const countOfAssociatedLessons =
        await repositories.lesson.count(countCriteria);

    if (countOfAssociatedLessons > 0) {
        throw new Error(responses.group_not_empty);
    }

    course.groups = course.groups!.filter((g) => g.id !== id);
    await repositories.course.update(
        course.id.toString(),
        course as unknown as Course,
    );

    await repositories.user.removeGroupFromPurchases(
        courseId,
        id,
        ctx.subdomain.id,
    );

    return await formatCourse(course.courseId, ctx);
};

export const updateGroup = async ({
    id,
    courseId,
    name,
    rank,
    collapsed,
    lessonsOrder,
    drip,
    ctx,
}) => {
    const course = await getCourseOrThrow(undefined, ctx, courseId);

    // We cast to access InternalCourse props like id (string)
    const group = course.groups?.find((group) => group.id === id);

    if (group) {
        if (name) {
            const existingName = (g: Group) => g.name === name && g.id !== id;

            if (course.groups?.some(existingName)) {
                throw new Error(responses.existing_group);
            }

            group.name = name;
        }

        if (rank) {
            group.rank = rank;
        }

        if (
            lessonsOrder &&
            lessonsOrder.every((lessonId: string) =>
                course.lessons?.includes(lessonId),
            ) &&
            lessonsOrder.every((lessonId: string) =>
                course.groups
                    ?.find((group) => group.id === id)
                    ?.lessonsOrder.includes(lessonId),
            )
        ) {
            group.lessonsOrder = lessonsOrder;
        }

        if (typeof collapsed === "boolean") {
            group.collapsed = collapsed;
        }

        if (drip) {
            if (!group.drip) group.drip = {} as any;

            if (drip.status) {
                group.drip!.status = drip.status;
            }
            if (drip.type) {
                group.drip!.type = drip.type;
            }
            if (drip.type === Constants.dripType[0]) {
                if (drip.delayInMillis) {
                    group.drip!.delayInMillis = drip.delayInMillis * 86400000;
                }
                group.drip!.dateInUTC = drip.dateInUTC;
            }
            if (drip.type === Constants.dripType[1]) {
                group.drip!.delayInMillis = undefined;
                if (drip.dateInUTC) {
                    group.drip!.dateInUTC = drip.dateInUTC;
                }
            }
            if (drip.email) {
                if (!drip.email.content || !drip.email.subject) {
                    throw new Error(responses.invalid_drip_email);
                }
                const parsedContent: Email = JSON.parse(drip.email.content);
                verifyMandatoryTags(parsedContent.content as any);

                group.drip!.email = {
                    content: parsedContent,
                    subject: drip.email.subject,
                    published: true,
                    delayInMillis: 0,
                } as unknown as Email;
            } else {
                group.drip!.email = undefined;
            }
        }

        await repositories.course.update(
            course.id.toString(),
            course as unknown as Course,
        );
    }

    return await formatCourse(course.courseId, ctx);
};

export const getMembers = async ({
    ctx,
    courseId,
    page = 1,
    limit = 10,
    status,
}: {
    ctx: GQLContext;
    courseId: string;
    page?: number;
    limit?: number;
    status?: MembershipStatus;
}): Promise<
    (Pick<
        Membership,
        "userId" | "status" | "subscriptionMethod" | "subscriptionId"
    > &
        Partial<
            Pick<
                Progress,
                "completedLessons" | "createdAt" | "updatedAt" | "downloaded"
            >
        >)[]
> => {
    const course = await getCourseOrThrow(undefined, ctx, courseId);

    const cb = Criteria.create<Membership>();
    cb.where("domain" as keyof Membership, "eq", ctx.subdomain._id);
    cb.where("entityId", "eq", course.courseId);
    cb.where("entityType", "eq", Constants.MembershipEntityType.COURSE);
    if (status) {
        cb.where("status", "eq", status);
    }

    const itemsPerPage = limit || constants.itemsPerPage;
    const offset = (page || constants.defaultOffset) - 1;
    cb.skip(offset * itemsPerPage);
    cb.take(itemsPerPage);

    const { data: members } = await repositories.membership.findPaginated(cb);

    return await Promise.all(
        members.map(async (member) => {
            const user = await repositories.user.findByUserId(
                member.userId,
                ctx.subdomain.id,
            );

            const purchase = user?.purchases.find(
                (purchase) => purchase.courseId === courseId,
            );

            return {
                userId: member.userId,
                status: member.status,
                subscriptionMethod: member.subscriptionMethod,
                subscriptionId: member.subscriptionId,
                completedLessons: purchase?.completedLessons,
                createdAt: purchase?.createdAt,
                updatedAt: purchase?.updatedAt,
                downloaded: purchase?.downloaded,
            };
        }),
    );
};

export const getStudents = async ({
    course,
    ctx,
    text,
}: {
    course: Pick<Course, "courseId">;
    ctx: GQLContext;
    text?: string;
}) => {
    return await repositories.user.getStudentsForCourse(
        course.courseId,
        ctx.subdomain.id,
        text,
    );
};

export const getCourseCertificateTemplate = async (
    courseId: string,
    ctx: GQLContext,
) => {
    const course = await getCourseOrThrow(undefined, ctx, courseId);

    const certificateTemplate =
        await repositories.certificateTemplate.findByCourseId(
            course.courseId,
            ctx.subdomain.id,
        );

    return certificateTemplate;
};

export const updateCourseCertificateTemplate = async ({
    courseId,
    ctx,
    title,
    subtitle,
    description,
    signatureImage,
    signatureName,
    signatureDesignation,
    logo,
}: {
    courseId: string;
    ctx: GQLContext;
    title?: string;
    subtitle?: string;
    description?: string;
    signatureImage?: string;
    signatureName?: string;
    signatureDesignation?: string;
    logo?: string;
}) => {
    const course = await getCourseOrThrow(undefined, ctx, courseId);

    const updatedTemplate =
        await repositories.certificateTemplate.upsertForCourse(
            course.courseId,
            ctx.subdomain._id.toString(),
            {
                title,
                subtitle,
                description,
                signatureImage: signatureImage as any,
                signatureName,
                signatureDesignation,
                logo: logo as any,
            },
        );
    return {
        title: updatedTemplate.title,
        subtitle: updatedTemplate.subtitle,
        description: updatedTemplate.description,
        signatureImage: updatedTemplate.signatureImage,
        signatureName: updatedTemplate.signatureName,
        signatureDesignation: updatedTemplate.signatureDesignation,
        logo: updatedTemplate.logo,
    };
};
