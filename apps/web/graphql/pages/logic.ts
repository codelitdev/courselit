import mongoose from "mongoose";
import { responses } from "../../config/strings";
import {
    checkIfAuthenticated,
    checkOwnershipWithoutModel,
    checkPermission,
} from "../../lib/graphql";
import Domain from "../../models/Domain";
import GQLContext from "../../models/GQLContext";
import PageModel, { Page } from "../../models/Page";
import { Widget } from "../../models/Widget";
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

    const pageWithTheme = {
        pageId: page.pageId,
        name: page.name,
        layout: [ctx.subdomain.header, ...page.layout, ctx.subdomain.footer],
        draftLayout: page.draftLayout
            ? [ctx.subdomain.header, ...page.draftLayout, ctx.subdomain.footer]
            : undefined,
    };
    console.log(pageWithTheme);

    return pageWithTheme;
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
): Promise<Partial<Page> | null> => {
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
            const layout = JSON.parse(pageData.layout);
            const header = layout.filter(
                (widget: Widget) => widget.name === "header"
            )[0];
            const footer = layout.filter(
                (widget: Widget) => widget.name === "footer"
            )[0];
            console.log(header, footer);
            let subdomainChanged = false;
            if (header) {
                ctx.subdomain.header = header;
                subdomainChanged = true;
            }
            if (footer) {
                ctx.subdomain.footer = footer;
                subdomainChanged = true;
            }
            if (subdomainChanged) {
                await (ctx.subdomain as any).save();
            }
            page!.draftLayout = layout.filter(
                (widget: Widget) => !["header", "footer"].includes(widget.name)
            );
        } catch (err) {
            throw new Error(responses.invalid_layout);
        }
    }

    await (page as any).save();

    return {
        pageId: page!.pageId,
        name: page!.name,
        layout: [ctx.subdomain.header, ...page!.layout, ctx.subdomain.footer],
        draftLayout: [
            ctx.subdomain.header,
            ...page!.draftLayout,
            ctx.subdomain.footer,
        ],
    };
};
