import UserModel, { User } from "../../models/User";
import Course from "../../models/Course";
import { responses } from "../../config/strings";
import {
    makeModelTextSearchable,
    checkIfAuthenticated,
} from "../../lib/graphql";
import constants from "../../config/constants";
import GQLContext from "../../models/GQLContext";
const {
    permissions,
    userTypeCustomer,
    userTypeTeam,
    userTypeNewsletterSubscriber,
} = constants;
import { Progress } from "../../models/Progress";
import { initMandatoryPages } from "../pages/logic";
import { Domain } from "../../models/Domain";
import { checkPermission } from "@courselit/utils";

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
        (x) => !Object.values(permissions).includes(x)
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

        if (
            !["bio", "name", "subscribedToUpdates"].includes(key) &&
            id === ctx.user.id
        ) {
            throw new Error(responses.action_not_allowed);
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
        }
    );
};

type UserGroupType = "team" | "customer" | "subscriber";

interface SearchData {
    searchText?: string;
    offset?: number;
    type?: UserGroupType;
    email?: string;
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
        }
    );

    return users;
};

export const getUsersCount = async (
    searchData: SearchData = {},
    ctx: GQLContext
) => {
    checkIfAuthenticated(ctx);
    if (!checkPermission(ctx.user.permissions, [permissions.manageUsers])) {
        throw new Error(responses.action_not_allowed);
    }

    const query = buildQueryFromSearchData(ctx.subdomain._id, searchData);
    return await UserModel.countDocuments(query);
};

const buildQueryFromSearchData = (domain, searchData: SearchData = {}) => {
    const query: Record<string, unknown> = { domain };
    if (searchData.searchText) query.$text = { $search: searchData.searchText };
    if (searchData.type) {
        addFilterToQueryBasedOnUserGroup(query, searchData.type);
    }
    if (searchData.email) {
        query.email = new RegExp(searchData.email);
    }

    return query;
};

const addFilterToQueryBasedOnUserGroup = (
    query: Record<string, unknown>,
    type: UserGroupType
): Record<string, unknown> => {
    if (type === userTypeTeam) {
        const allPerms = Object.values(constants.permissions);
        const indexOfEnrollCoursePermission = allPerms.indexOf(
            constants.permissions.enrollInCourse
        );
        allPerms.splice(indexOfEnrollCoursePermission, 1);
        query.permissions = {
            $in: [...allPerms],
        };
    } else if (type === userTypeCustomer) {
        query.permissions = { $in: [constants.permissions.enrollInCourse] };
    } else if (type === userTypeNewsletterSubscriber) {
        query.subscribedToUpdates = true;
    }

    return query;
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
        (progress: Progress) => progress.courseId === courseId
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
}: {
    domain: Domain;
    email: string;
    lead?: typeof constants.leadWebsite | typeof constants.leadNewsletter;
    superAdmin?: boolean;
}): Promise<User> {
    const newUser: Partial<User> = {
        domain: domain._id,
        email: email,
        active: true,
        purchases: [],
        permissions: [],
        lead: lead || constants.leadWebsite,
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

    return user;
}
