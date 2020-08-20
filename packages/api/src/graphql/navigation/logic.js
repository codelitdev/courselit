/**
 * Business logic for managing site navigation.
 */
const { checkIfAuthenticated } = require("../../lib/graphql.js");
const { responses } = require("../../config/strings.js");
const Link = require("../../models/Link.js");
const strings = require("../../config/strings.js");

// TODO: write test for the entire feature

exports.getPublicNavigation = async () => {
  return await Link.find({}, "text destination category newTab");
};

exports.getNavigation = async (ctx) => {
  checkIfAuthenticated(ctx);

  if (!ctx.user.isAdmin) throw new Error(responses.is_not_admin);

  return await Link.find();
};

exports.saveLink = async (linkData, ctx) => {
  checkIfAuthenticated(ctx);
  let link;

  // check if the user is an admin
  if (!ctx.user.isAdmin) throw new Error(responses.is_not_admin);

  if (linkData.id) {
    // update the existing record
    link = await Link.findById(linkData.id);

    if (!link) {
      throw new Error(strings.responses.item_not_found);
    }

    link.text = linkData.text;
    link.destination = linkData.destination;
    link.category = linkData.category;
    link.newTab = linkData.newTab;

    await link.save();
  } else {
    // create a new record
    link = Link.create({
      text: linkData.text,
      destination: linkData.destination,
      category: linkData.category,
      newTab: linkData.newTab,
    });
  }

  return link;
};

exports.deleteLink = async (id, ctx) => {
  checkIfAuthenticated(ctx);

  // check if the user is an admin
  if (!ctx.user.isAdmin) throw new Error(responses.is_not_admin);

  const link = await Link.findById(id);
  if (link) {
    await link.remove();
  }

  return true;
};
