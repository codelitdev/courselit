import mongoose from "mongoose";
import { checkIfAuthenticated } from "../../lib/graphql";
import type GQLContext from "../../models/GQLContext";
import { Link } from "../../models/Link";
import DomainModel, { Domain } from "../../models/Domain";
import { responses } from "../../config/strings";
import constants from "../../config/constants";
import { checkPermission } from "@courselit/utils";
const { permissions } = constants;

export const saveLink = async (
    linkData: Omit<Link, "domain">,
    ctx: GQLContext,
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
    if (linkData.id) {
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
        if (!domain.links) {
            domain.links = [];
        }
        // create a new record
        (domain.links as any).push({
            text: linkData.text,
            destination: linkData.destination,
            category: linkData.category,
            newTab: linkData.newTab,
        });
        await domain.save();
    }

    return domain;
};

export const deleteLink = async (
    id: mongoose.Types.ObjectId,
    ctx: GQLContext,
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

    return domain;
};
