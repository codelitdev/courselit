/**
 * Business logic for managing site navigation.
 */
const {
  checkIfAuthenticated,
  checkPermission,
} = require("../../lib/graphql.js");
const { responses } = require("../../config/strings.js");
const Link = require("../../models/Link.js");
const strings = require("../../config/strings.js");
const { permissions } = require("../../config/constants.js");

exports.getMenu = async (ctx) => {
  return await Link.find(
    {
      domain: ctx.subdomain._id,
    },
    "text destination category newTab"
  );
};

exports.getMenuAsAdmin = async (ctx) => {
  checkIfAuthenticated(ctx);

  if (!checkPermission(ctx.user.permissions, [permissions.manageMenus])) {
    throw new Error(responses.action_not_allowed);
  }

  return await Link.find({ domain: ctx.subdomain._id });
};

exports.saveLink = async (linkData, ctx) => {
  checkIfAuthenticated(ctx);

  if (!checkPermission(ctx.user.permissions, [permissions.manageMenus])) {
    throw new Error(responses.action_not_allowed);
  }

  let link;
  if (linkData.id) {
    // update the existing record
    link = await Link.findOne({ _id: linkData.id, domain: ctx.subdomain._id });

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
      domain: ctx.subdomain._id,
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

  if (!checkPermission(ctx.user.permissions, [permissions.manageMenus])) {
    throw new Error(responses.action_not_allowed);
  }

  const link = await Link.findOne({ _id: id, domain: ctx.subdomain._id });
  if (link) {
    await link.remove();
  }

  return true;
};
