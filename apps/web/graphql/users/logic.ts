import UserModel, { User } from "../../models/User";
import Course from "../../models/Course";
import { responses } from "../../config/strings";
import {
    makeModelTextSearchable,
    checkIfAuthenticated,
} from "../../lib/graphql";
import constants from "../../config/constants";
import GQLContext from "../../models/GQLContext";
const { permissions } = constants;
import { Progress } from "../../models/Progress";
import { initMandatoryPages } from "../pages/logic";
import { Domain } from "../../models/Domain";
import {
    checkPermission,
    convertFiltersToDBConditions,
} from "@courselit/utils";
import UserSegmentModel, { UserSegment } from "../../models/UserSegment";
import mongoose from "mongoose";
import { Constants, UserFilterWithAggregator } from "@courselit/common-models";
import { recordActivity } from "../../lib/record-activity";
import { triggerSequences } from "../../lib/trigger-sequences";

const removeAdminFieldsFromUserObject = ({
    id,
    name,
    userId,
    bio,
    email,
}: {
    id: string;
    name: string;
    userId: string;
    bio: string;
    email: string;
}) => ({
    id,
    name,
    userId,
    bio,
    email,
});

export const getUser = async (email = null, userId = null, ctx: GQLContext) => {
    const { user: loggedInUser } = ctx;
    const loggedUserEmail = loggedInUser && loggedInUser.email;
    const loggedUserId = loggedInUser && loggedInUser.userId;

    if (!email && !userId && !loggedInUser) {
        throw new Error(responses.invalid_user_id);
    }

    if (!email && !userId && loggedInUser) {
        email = loggedUserEmail;
    }

    let user;
    if (email) {
        user = await UserModel.findOne({ email, domain: ctx.subdomain._id });
    } else {
        user = await UserModel.findOne({ userId, domain: ctx.subdomain._id });
    }

    if (!user) {
        throw new Error(responses.item_not_found);
    }

    user.userId = user.userId || -1; // Set -1 for empty userIds; Backward compatibility;

    return loggedInUser &&
        (loggedUserEmail === email ||
            loggedUserId === userId ||
            checkPermission(loggedInUser.permissions, [
                permissions.manageUsers,
            ]))
        ? user
        : removeAdminFieldsFromUserObject(user);
};

const validateUserProperties = (user) => {
    checkForInvalidPermissions(user);
};

const checkForInvalidPermissions = (user) => {
    const invalidPerms = user.permissions.filter(
        (x) => !Object.values(permissions).includes(x),
    );
    if (invalidPerms.length) {
        throw new Error(responses.invalid_permission);
    }
};

export const updateUser = async (userData: any, ctx: GQLContext) => {
    checkIfAuthenticated(ctx);
    const { id } = userData;

    const hasPermissionToManageUser = checkPermission(ctx.user.permissions, [
        permissions.manageUsers,
    ]);
    if (!hasPermissionToManageUser) {
        if (id !== ctx.user.id) {
            throw new Error(responses.action_not_allowed);
        }
    }

    let user = await UserModel.findOne({ _id: id, domain: ctx.subdomain._id });
    if (!user) throw new Error(responses.item_not_found);

    for (const key of Object.keys(userData)) {
        if (key === "id") {
            continue;
        }

        if (!["subscribedToUpdates"].includes(key) && id === ctx.user.id) {
            throw new Error(responses.action_not_allowed);
        }

        if (key === "tags") {
            addTags(userData["tags"], ctx);
        }

        user[key] = userData[key];
    }

    validateUserProperties(user);

    user = await user.save();

    if (userData.name) {
        await updateCoursesForCreatorName(user.userId || user.id, user.name);
    }

    return user;
};

const updateCoursesForCreatorName = async (creatorId, creatorName) => {
    await Course.updateMany(
        {
            creatorId,
        },
        {
            creatorName,
        },
    );
};

type UserGroupType = "team" | "customer" | "subscriber";

interface SearchData {
    offset?: number;
    filters?: string;
}

interface GetUsersParams {
    searchData: SearchData;
    ctx: GQLContext;
    noPagination: boolean;
    hasMailPermissions: boolean;
}

export const getUsers = async ({
    searchData = {},
    ctx,
    noPagination = false,
    hasMailPermissions = false,
}: GetUsersParams) => {
    checkIfAuthenticated(ctx);
    if (
        !hasMailPermissions &&
        !checkPermission(ctx.user.permissions, [permissions.manageUsers])
    ) {
        throw new Error(responses.action_not_allowed);
    }

    const searchUsers = makeModelTextSearchable(UserModel);
    const query = buildQueryFromSearchData(ctx.subdomain._id, searchData);
    const users = await searchUsers(
        {
            offset: noPagination ? 1 : searchData.offset,
            query,
            graphQLContext: ctx,
        },
        {
            itemsPerPage: noPagination
                ? Infinity
                : searchData.rowsPerPage || constants.itemsPerPage,
            sortByColumn: "createdAt",
            sortOrder: -1,
        },
    );

    return users;
};

export const getUsersCount = async (
    searchData: SearchData = {},
    ctx: GQLContext,
) => {
    checkIfAuthenticated(ctx);
    if (!checkPermission(ctx.user.permissions, [permissions.manageUsers])) {
        throw new Error(responses.action_not_allowed);
    }

    const query = buildQueryFromSearchData(ctx.subdomain._id, searchData);
    return await UserModel.countDocuments(query);
};

const buildQueryFromSearchData = (
    domain: mongoose.Types.ObjectId,
    searchData: SearchData = {},
): Record<string, unknown> => {
    let filters = {};
    if (searchData.filters) {
        const filtersWithAggregator: UserFilterWithAggregator = JSON.parse(
            searchData.filters,
        );
        filters = convertFiltersToDBConditions(filtersWithAggregator);
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
        await (user as any).save();
    }
};

export async function createUser({
    domain,
    email,
    lead,
    superAdmin = false,
    subscribedToUpdates = true,
}: {
    domain: Domain;
    email: string;
    lead?:
        | typeof constants.leadWebsite
        | typeof constants.leadNewsletter
        | typeof constants.leadApi;
    superAdmin?: boolean;
    subscribedToUpdates?: boolean;
}): Promise<User> {
    const newUser: Partial<User> = {
        domain: domain._id,
        email: email,
        active: true,
        purchases: [],
        permissions: [],
        lead: lead || constants.leadWebsite,
        subscribedToUpdates,
    };
    if (superAdmin) {
        newUser.permissions = [
            constants.permissions.manageCourse,
            constants.permissions.manageAnyCourse,
            constants.permissions.publishCourse,
            // TODO: replace media perms with course perms
            constants.permissions.manageMedia,
            constants.permissions.manageAnyMedia,
            constants.permissions.uploadMedia,
            constants.permissions.viewAnyMedia,
            constants.permissions.manageSite,
            constants.permissions.manageSettings,
            constants.permissions.manageUsers,
        ];
    } else {
        newUser.permissions = [constants.permissions.enrollInCourse];
    }
    newUser.lead = lead;
    const user = await UserModel.create(newUser);

    if (superAdmin) {
        await initMandatoryPages(domain, user);
    }

    await recordActivity({
        domain: domain._id,
        userId: user.userId,
        type: "user_created",
    });

    if (user.subscribedToUpdates) {
        await triggerSequences({
            user,
            event: Constants.eventTypes[3],
        });

        await recordActivity({
            domain: domain!._id,
            userId: user.userId,
            type: "newsletter_subscribed",
        });
    }

    return user;
}

export async function getSegments(ctx: GQLContext): Promise<UserSegment[]> {
    checkIfAuthenticated(ctx);
    if (!checkPermission(ctx.user.permissions, [permissions.manageUsers])) {
        throw new Error(responses.action_not_allowed);
    }

    const segments = await UserSegmentModel.find({
        domain: ctx.subdomain._id,
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
        domain: ctx.subdomain._id,
        userId: ctx.user.userId,
        name: segmentData.name,
        filter,
    });

    const segments = await UserSegmentModel.find({
        domain: ctx.subdomain._id,
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
        domain: ctx.subdomain._id,
        userId: ctx.user.userId,
        segmentId,
    });

    const segments = await UserSegmentModel.find({
        domain: ctx.subdomain._id,
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

    const tagsWithUsersCount = await UserModel.aggregate([
        { $unwind: "$tags" },
        {
            $match: {
                tags: { $in: ctx.subdomain.tags },
                domain: ctx.subdomain._id,
            },
        },
        {
            $group: {
                _id: "$tags",
                count: { $sum: 1 },
            },
        },
        {
            $project: {
                tag: "$_id",
                count: 1,
                _id: 0,
            },
        },
        {
            $unionWith: {
                coll: "domains",
                pipeline: [
                    { $match: { _id: ctx.subdomain._id } },
                    { $unwind: "$tags" },
                    { $project: { tag: "$tags", _id: 0 } },
                ],
            },
        },
        {
            $group: {
                _id: "$tag",
                count: { $sum: "$count" },
            },
        },
        {
            $project: {
                tag: "$_id",
                count: 1,
                _id: 0,
            },
        },
        { $sort: { count: -1 } },
    ]);

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

    await UserModel.updateMany(
        { domain: ctx.subdomain._id },
        { $pull: { tags: tag } },
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

    await UserModel.updateMany(
        { domain: ctx.subdomain._id },
        { $pull: { tags: tag } },
    );

    return getTagsWithDetails(ctx);
};
