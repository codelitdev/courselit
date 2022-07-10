import mongoose from "mongoose";
import { responses } from "../../config/strings";
import {
    checkIfAuthenticated,
    checkOwnershipWithoutModel,
    checkPermission,
} from "../../lib/graphql";
import GQLContext from "../../models/GQLContext";
import PageModel, { Page } from "../../models/Page";
import { permissions } from "../../ui-config/constants";

export async function getPage({ id, ctx }: { id: string; ctx: GQLContext }) {
    const page = await PageModel.findOne(
        {
            pageId: id,
            domain: ctx.subdomain._id,
        },
        {
            pageId: 1,
            layout: 1,
            name: 1,
            draftLayout: checkPermission(ctx.user.permissions, [
                permissions.manageSite,
            ])
                ? 1
                : 0,
        }
    );

    return page;
}

interface Draft {
    pageId: string;
    layout: string;
}

interface Published {
    pageId: string;
    publish: boolean;
}

export const savePage = async (
    pageData: Draft | Published,
    ctx: GQLContext
): Promise<Page | null> => {
    const { pageId } = pageData;
    checkIfAuthenticated(ctx);
    if (!checkPermission(ctx.user.permissions, [permissions.manageSite])) {
        throw new Error(responses.action_not_allowed);
    }
    const page: Page | null = await PageModel.findOne({
        pageId,
        domain: ctx.subdomain._id,
    });

    if (!checkOwnershipWithoutModel(page, ctx)) {
        throw new Error(responses.item_not_found);
    }

    if ("publish" in pageData) {
        page!.layout = (page && page.draftLayout) || [];
        page!.draftLayout = [];
    } else if ("layout" in pageData) {
        try {
            page!.draftLayout = JSON.parse(pageData.layout);
        } catch (err) {
            throw new Error(responses.invalid_layout);
        }
    }

    await (page as any).save();

    return page;
};
