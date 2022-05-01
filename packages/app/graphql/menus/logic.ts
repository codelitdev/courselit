import mongoose from "mongoose";
import { checkIfAuthenticated, checkPermission } from "../../lib/graphql";
import type GQLContext from "../../models/GQLContext";
import LinkModel, { Link } from "../../models/Link";
import { responses } from "../../config/strings";
import constants from "../../config/constants";
const { permissions } = constants;

export const getMenu = async (
  ctx: GQLContext
): Promise<Omit<Link, "domain">[]> => {
  const menus = await LinkModel.find<Link>(
    {
      domain: ctx.subdomain._id,
    },
    "text destination category newTab"
  );

  return menus;
};

export const getMenuAsAdmin = async (ctx: GQLContext): Promise<Link[]> => {
  checkIfAuthenticated(ctx);

  if (!checkPermission(ctx.user.permissions, [permissions.manageMenus])) {
    throw new Error(responses.action_not_allowed);
  }

  return await LinkModel.find({ domain: ctx.subdomain._id });
};

export const saveLink = async (
  linkData: Omit<Link, "domain">,
  ctx: GQLContext
) => {
  checkIfAuthenticated(ctx);

  if (!checkPermission(ctx.user.permissions, [permissions.manageMenus])) {
    throw new Error(responses.action_not_allowed);
  }

  let link: Link | null;
  if (linkData.id) {
    // update the existing record
    link = await LinkModel.findOne({
      _id: linkData.id,
      domain: ctx.subdomain._id,
    });

    if (!link) {
      throw new Error(responses.item_not_found);
    }

    link.text = linkData.text;
    link.destination = linkData.destination;
    link.category = linkData.category;
    link.newTab = linkData.newTab;

    await (link as any).save();
  } else {
    // create a new record
    link = await LinkModel.create({
      domain: ctx.subdomain._id,
      text: linkData.text,
      destination: linkData.destination,
      category: linkData.category,
      newTab: linkData.newTab,
    });
  }

  return link;
};

export const deleteLink = async (
  id: mongoose.Types.ObjectId,
  ctx: GQLContext
) => {
  checkIfAuthenticated(ctx);

  if (!checkPermission(ctx.user.permissions, [permissions.manageMenus])) {
    throw new Error(responses.action_not_allowed);
  }

  const link = await LinkModel.findOne({ _id: id, domain: ctx.subdomain._id });
  if (link) {
    await link.remove();
  }

  return true;
};
