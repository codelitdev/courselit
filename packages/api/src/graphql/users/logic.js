/**
 * Business logic for managing users.
 */
const User = require("../../models/User.js");
const Course = require("../../models/Course.js");
const strings = require("../../config/strings.js");
const {
  checkIfAuthenticated,
  checkAdminOrSelf,
  makeModelTextSearchable,
} = require("../../lib/graphql.js");
const constants = require("../../config/constants.js");
const ObjectId = require("mongoose").Types.ObjectId;

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
    user = await User.findOne({ email, domain: ctx.domain._id });
  } else {
    // userId can be either a Mongodb ObjectID or userId from User schema
    if (ObjectId.isValid(userId)) {
      user = await User.findOne({ _id: userId, domain: ctx.domain._id });
    } else {
      user = await User.findOne({ userId, domain: ctx.domain._id });
    }
  }

  if (!user) {
    throw new Error(strings.responses.item_not_found);
  }

  user.userId = user.userId || -1; // Set -1 for empty userIds; Backward compatibility;

  const loggedUserEmail = ctx.user && ctx.user.email;
  const loggedUserId = ctx.user && ctx.user.userId;
  const isAdmin = ctx.user && ctx.user.isAdmin;

  const result =
    loggedUserEmail === email || loggedUserId === userId || isAdmin
      ? user
      : removeAdminFieldsFromUserObject(user);

  return result;
};

exports.updateUser = async (userData, ctx) => {
  checkIfAuthenticated(ctx);
  const { id } = userData;

  let user = await User.findOne({ _id: id, domain: ctx.domain._id });
  if (!user) throw new Error(strings.responses.item_not_found);
  checkAdminOrSelf(id, ctx);

  for (const key of Object.keys(userData)) {
    if (key === "id") {
      continue;
    }
    if (~["isCreator", "isAdmin", "active"].indexOf(key)) {
      if (ctx.user.isAdmin) {
        if (ctx.user.id === id && ~["active", "isAdmin"].indexOf(key)) {
          throw new Error(strings.responses.action_not_allowed);
        }

        user[key] = userData[key];
      }
      continue;
    }
    user[key] = userData[key];
  }

  if (!user.name) {
    throw new Error(strings.responses.user_name_cant_be_null);
  }

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
  const query = { domain: ctx.domain._id };
  if (searchData.searchText) query.$text = { $search: searchData.searchText };

  const searchUsers = makeModelTextSearchable(User);

  const users = await searchUsers(
    { offset: searchData.offset, query, graphQLContext: ctx },
    { itemsPerPage: constants.itemsPerPage }
  );

  if (ctx.user.isAdmin) {
    return users;
  } else {
    return users.map((x) => removeAdminFieldsFromUserObject(x));
  }
};

exports.getUsersSummary = async (ctx) => {
  checkIfAuthenticated(ctx);
  if (!ctx.user.isAdmin) {
    throw new Error(strings.responses.action_not_allowed);
  }

  return {
    count: await User.countDocuments({ domain: ctx.domain._id }),
    verified: await User.countDocuments({
      verified: true,
      domain: ctx.domain._id,
    }),
    admins: await User.countDocuments({
      isAdmin: true,
      domain: ctx.domain._id,
    }),
    creators: await User.countDocuments({
      isCreator: true,
      domain: ctx.domain._id,
    }),
  };
};
