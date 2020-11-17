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

// exports.updateName = async (name, ctx) => {
//   checkIfAuthenticated(ctx)
//   ctx.user.name = name
//   await ctx.user.save()
//   return ctx.user
// }

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

// exports.initiatePurchase = async (purchaseData = {}, ctx) => {
//   const response = {
//     status: constants.transactionInitiated
//   }

//   checkIfAuthenticated(ctx)
//   const someOneElse = purchaseData.purchasingFor
//   const myself = ctx.user.id

//   if (someOneElse && !ctx.user.isAdmin) {
//     throw new Error(strings.responses.only_admins_can_purchase)
//   }

//   const purchasingFor = someOneElse || myself
//   const buyer = await checkIfItemExists(User, purchasingFor)
//   const course = await checkIfItemExists(Course, purchaseData.courseId)

//   if (buyer.purchases.includes(course.id)) {
//     throw new Error(strings.responses.course_already_purchased)
//   }

//   if (course.cost === 0) {
//     await finalizePurchase(course, user)
//     return response
//   }

//   const siteinfo = (await SiteInfo.find())[0]
//   console.log(siteinfo)
// }

// const finalizePurchase = async (course, user) => {
//   user.purchases.push(course.id)
//   await user.save()
//   return user
// }

// exports.purchaseMade = async (purchaseData = {}, ctx) => {
//   checkIfAuthenticated(ctx)
//   const { purchasedBy } = purchaseData
//   let user = await checkIfItemExists(User, purchasedBy)
//   checkAdminOrSelf(purchasedBy, ctx)

//   await Purchase.create({
//     courseId: purchaseData.courseId,
//     purchasedOn: purchaseData.purchasedOn,
//     purchasedBy: purchaseData.purchasedBy,
//     paymentMethod: purchaseData.paymentMethod,
//     paymentId: purchaseData.paymentId,
//     amount: purchaseData.amount,
//     discount: purchaseData.discount
//   })

//   user.purchases.push(purchaseData.courseId)
//   user = await user.save()
//   return user
// }
