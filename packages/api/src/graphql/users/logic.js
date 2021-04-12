/**
 * Business logic for managing users.
 */
const User = require("../../models/User.js");
const Course = require("../../models/Course.js");
const strings = require("../../config/strings.js");
const {
  checkIfAuthenticated,
  makeModelTextSearchable,
  checkPermission,
} = require("../../lib/graphql.js");
const constants = require("../../config/constants.js");
const ObjectId = require("mongoose").Types.ObjectId;

const { permissions } = constants;

const removeAdminFieldsFromUserObject = ({ id, name, userId, bio, email }) => ({
  id,
  name,
  userId,
  bio,
  email,
});

exports.getUser = async (email = null, userId = null, ctx) => {
  if (!email && !userId) {
    throw new Error(strings.responses.invalid_user_id);
  }

  let user;
  if (email) {
    user = await User.findOne({ email, domain: ctx.subdomain._id });
  } else {
    // userId can be either a Mongodb ObjectID or userId from User schema
    if (ObjectId.isValid(userId)) {
      user = await User.findOne({ _id: userId, domain: ctx.subdomain._id });
    } else {
      user = await User.findOne({ userId, domain: ctx.subdomain._id });
    }
  }

  if (!user) {
    throw new Error(strings.responses.item_not_found);
  }

  user.userId = user.userId || -1; // Set -1 for empty userIds; Backward compatibility;

  const { user: loggedInUser } = ctx;
  const loggedUserEmail = loggedInUser && loggedInUser.email;
  const loggedUserId = loggedInUser && loggedInUser.userId;

  return loggedInUser &&
    (loggedUserEmail === email ||
      loggedUserId === userId ||
      checkPermission(loggedInUser.permissions, [permissions.manageUsers]))
    ? user
    : removeAdminFieldsFromUserObject(user);
};

const validateUserProperties = (user) => {
  if (!user.name) {
    throw new Error(strings.responses.user_name_cant_be_null);
  }

  for (const permission of user.permissions) {
    if (!Object.values(permissions).includes(permission)) {
      throw new Error(strings.responses.invalid_permission);
    }
  }
};

exports.updateUser = async (userData, ctx) => {
  checkIfAuthenticated(ctx);
  const { id } = userData;

  const hasPermissionToManageUser = checkPermission(ctx.user.permissions, [
    permissions.manageUsers,
  ]);
  if (!hasPermissionToManageUser) {
    if (id !== ctx.user.id) {
      throw new Error(strings.responses.action_not_allowed);
    }
  }

  let user = await User.findOne({ _id: id, domain: ctx.subdomain._id });
  if (!user) throw new Error(strings.responses.item_not_found);

  for (const key of Object.keys(userData)) {
    if (key === "id") {
      continue;
    }

    if (!["bio", "name"].includes(key) && id === ctx.user.id) {
      throw new Error(strings.responses.action_not_allowed);
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

exports.getSiteUsers = async (searchData = {}, ctx) => {
  checkIfAuthenticated(ctx);
  if (!checkPermission(ctx.user.permissions, [permissions.manageUsers])) {
    throw new Error(strings.responses.action_not_allowed);
  }

  const query = { domain: ctx.subdomain._id };
  if (searchData.searchText) query.$text = { $search: searchData.searchText };

  const searchUsers = makeModelTextSearchable(User);

  const users = await searchUsers(
    { offset: searchData.offset, query, graphQLContext: ctx },
    { itemsPerPage: constants.itemsPerPage }
  );

  return users;
};
