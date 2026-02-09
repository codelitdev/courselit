import { checkIfAuthenticated } from "../../lib/graphql";
import type GQLContext from "../../models/GQLContext";
import type { Link } from "@courselit/common-models";
import DomainModel, { Domain } from "@courselit/orm-models/dao/domain";
import { responses } from "../../config/strings";
import constants from "../../config/constants";
import { checkPermission } from "@courselit/utils";
const { permissions } = constants;

type DomainLink = Link & { id?: string; _id?: string };
type DomainWithLinks = Domain & { links?: DomainLink[] };

export const saveLink = async (
    linkData: Omit<Link, "domain">,
    ctx: GQLContext,
): Promise<Domain | null> => {
    checkIfAuthenticated(ctx);

    if (!checkPermission(ctx.user.permissions, [permissions.manageSite])) {
        throw new Error(responses.action_not_allowed);
    }

    const domain = (await DomainModel.getById(
        ctx.subdomain._id,
    )) as DomainWithLinks | null;
    if (!domain) {
        return null;
    }

    let link: Link | null;
    if (linkData.id) {
        link =
            domain.links?.find(
                (item) =>
                    item.id === linkData.id ||
                    item._id?.toString() === linkData.id,
            ) || null;
        if (!link) {
            throw new Error(responses.item_not_found);
        }

        link.text = linkData.text;
        link.destination = linkData.destination;
        link.category = linkData.category;
        link.newTab = linkData.newTab;

        await DomainModel.saveOne(domain);
    } else {
        if (!domain.links) {
            domain.links = [] as any;
        }
        // create a new record
        (domain.links as any).push({
            text: linkData.text,
            destination: linkData.destination,
            category: linkData.category,
            newTab: linkData.newTab,
        });
        await DomainModel.saveOne(domain);
    }

    return domain;
};

export const deleteLink = async (
    id: string,
    ctx: GQLContext,
): Promise<Domain | null> => {
    checkIfAuthenticated(ctx);

    if (!checkPermission(ctx.user.permissions, [permissions.manageSite])) {
        throw new Error(responses.action_not_allowed);
    }

    const domain = (await DomainModel.getById(
        ctx.subdomain._id,
    )) as DomainWithLinks | null;
    if (!domain) {
        return null;
    }

    domain.links =
        domain.links?.filter(
            (item) => item.id !== id && item._id?.toString() !== id,
        ) || [];
    await DomainModel.saveOne(domain);

    return domain;
};
