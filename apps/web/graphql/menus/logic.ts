import mongoose from "mongoose";
import { checkIfAuthenticated, checkPermission } from "../../lib/graphql";
import type GQLContext from "../../models/GQLContext";
import LinkModel, { Link } from "../../models/Link";
import DomainModel, { Domain } from '../../models/Domain';
import { responses } from "../../config/strings";
import constants from "../../config/constants";
const { permissions } = constants;

export const getMenu = async (
    ctx: GQLContext
): Promise<Omit<Link, "domain">[]> => {
    // const menus = await LinkModel.find<Link>(
    //     {
    //         domain: ctx.subdomain._id,
    //     },
    //     "text destination category newTab"
    // );

    // return menus;
};

export const getMenuAsAdmin = async (ctx: GQLContext): Promise<Link[]> => {
    // checkIfAuthenticated(ctx);

    // if (!checkPermission(ctx.user.permissions, [permissions.manageSite])) {
    //     throw new Error(responses.action_not_allowed);
    // }

    // return await LinkModel.find({ domain: ctx.subdomain._id });
};

export const saveLink = async (
    linkData: Omit<Link, "domain">,
    ctx: GQLContext
): Promise<Domain | null> => {
    checkIfAuthenticated(ctx);

    if (!checkPermission(ctx.user.permissions, [permissions.manageSite])) {
        throw new Error(responses.action_not_allowed);
    }

    const domain: Domain | null = await DomainModel.findById(ctx.subdomain._id);
    if (!domain) {
        return null;
    }

    let link: Link | null;
    console.log('Link id', linkData.id);
    if (linkData.id) {
        // update the existing record
        // link = await LinkModel.findOne({
        //     _id: linkData.id,
        //     domain: ctx.subdomain._id,
        // });
        link = (domain.links as any).id(linkData.id);
        if (!link) {
            throw new Error(responses.item_not_found);
        }

        link.text = linkData.text;
        link.destination = linkData.destination;
        link.category = linkData.category;
        link.newTab = linkData.newTab;

        await domain.save();
    } else {
        if (!domain.links) { domain.links = [] }
        // create a new record
        (domain.links as any).push({
            text: linkData.text,
            destination: linkData.destination,
            category: linkData.category,
            newTab: linkData.newTab,
        });
        await domain.save();
        // link = await LinkModel.create({
        //     domain: ctx.subdomain._id,
        //     text: linkData.text,
        //     destination: linkData.destination,
        //     category: linkData.category,
        //     newTab: linkData.newTab,
        // });
    }

    return domain;
};

export const deleteLink = async (
    id: mongoose.Types.ObjectId,
    ctx: GQLContext
): Promise<Domain | null> => {
    checkIfAuthenticated(ctx);

    if (!checkPermission(ctx.user.permissions, [permissions.manageSite])) {
        throw new Error(responses.action_not_allowed);
    }

    const domain: Domain | null = await DomainModel.findById(ctx.subdomain._id);
    if (!domain) {
        return null;
    }

    domain.links.id(id).remove();
    await domain.save();

    // const link = await LinkModel.findOne({
    //     _id: id,
    //     domain: ctx.subdomain._id,
    // });
    // if (link) {
    //     await link.remove();
    // }

    return domain;
};
