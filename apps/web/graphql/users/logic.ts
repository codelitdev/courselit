import User from "../../models/User";
import Course from "../../models/Course";
import { responses } from "../../config/strings";
import {
    makeModelTextSearchable,
    checkIfAuthenticated,
    checkPermission,
} from "../../lib/graphql";
import constants from "../../config/constants";
import GQLContext from "../../models/GQLContext";
const { permissions } = constants;

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
        user = await User.findOne({ email, domain: ctx.subdomain._id });
    } else {
        user = await User.findOne({ userId, domain: ctx.subdomain._id });
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
    // if (!user.name) {
    //   throw new Error(responses.user_name_cant_be_null);
    // }

    for (const permission of user.permissions) {
        if (!Object.values(permissions).includes(permission)) {
            throw new Error(responses.invalid_permission);
        }
    }
};

export const updateUser = async (userData, ctx) => {
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

    let user = await User.findOne({ _id: id, domain: ctx.subdomain._id });
    if (!user) throw new Error(responses.item_not_found);

    for (const key of Object.keys(userData)) {
        if (key === "id") {
            continue;
        }

        if (!["bio", "name"].includes(key) && id === ctx.user.id) {
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

type UserGroupType = "team" | "audience";

interface SearchData {
    searchText?: string;
    offset?: number;
    type?: UserGroupType;
}

export const getUsers = async (
    searchData: SearchData = {},
    ctx: GQLContext
) => {
    checkIfAuthenticated(ctx);
    if (!checkPermission(ctx.user.permissions, [permissions.manageUsers])) {
        throw new Error(responses.action_not_allowed);
    }

    const query: Record<string, unknown> = { domain: ctx.subdomain._id };
    if (searchData.searchText) query.$text = { $search: searchData.searchText };
    if (searchData.type) {
        query.permissions = getQueryForFilteringByPermissions(searchData.type);
    }

    const searchUsers = makeModelTextSearchable(User);

    const users = await searchUsers(
        { offset: searchData.offset, query, graphQLContext: ctx },
        { itemsPerPage: constants.itemsPerPage }
    );

    return users;
};

const getQueryForFilteringByPermissions = (
    type: UserGroupType
): {
    $in: string[];
} => {
    if (type === constants.userTypeTeam) {
        const allPerms = Object.values(constants.permissions);
        const indexOfEnrollCoursePermission = allPerms.indexOf(
            constants.permissions.enrollInCourse
        );
        allPerms.splice(indexOfEnrollCoursePermission, 1);
        return {
            $in: [...allPerms],
        };
    } else if (type === constants.userTypeAudience) {
        return { $in: [constants.permissions.enrollInCourse] };
    } else {
        return { $in: Object.values(constants.permissions) };
    }
};
