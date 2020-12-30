/**
 * Business logic for managing users.
 */
const User = require("../../models/User.js");
const strings = require("../../config/strings.js");
const {
  checkIfAuthenticated,
  checkAdminOrSelf,
  checkIfItemExists,
  makeModelTextSearchable,
} = require("../../lib/graphql.js");
const constants = require("../../config/constants.js");

const removeAdminFieldsFromUserObject = ({ id, email, name }) => ({
  id,
  email,
  name,
});

exports.getUser = async (email, ctx) => {
  const loggedUserEmail = ctx.user && ctx.user.email;
  const isAdmin = ctx.user && ctx.user.isAdmin;

  const user = await User.findOne({ email });

  if (!user) {
    throw new Error(strings.responses.item_not_found);
  }

  const result =
    loggedUserEmail === email || isAdmin
      ? user
      : removeAdminFieldsFromUserObject(user);

  return result;
};

exports.updateUser = async (userData, ctx) => {
  checkIfAuthenticated(ctx);
  const { id } = userData;
  let user = await checkIfItemExists(User, id);
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
  return user;
};

exports.getSiteUsers = async (searchData = {}, ctx) => {
  const query = {};
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
    count: await User.countDocuments(),
    verified: await User.countDocuments({ verified: true }),
    admins: await User.countDocuments({ isAdmin: true }),
    creators: await User.countDocuments({ isCreator: true }),
  };
};
