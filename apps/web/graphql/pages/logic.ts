import { responses } from "../../config/strings";
import {
    checkIfAuthenticated,
    checkOwnershipWithoutModel,
    checkPermission,
} from "../../lib/graphql";
import GQLContext from "../../models/GQLContext";
import PageModel, { Page } from "../../models/Page";
import { Widget } from "../../models/Widget";
import { permissions } from "../../ui-config/constants";
import { getPageResponse } from "./helpers";
import constants from "../../config/constants";
import Course from "../../models/Course";
import { generateUniqueId } from "@courselit/utils";
const { product } = constants;

export async function getPage({ id, ctx }: { id: string; ctx: GQLContext }) {
    await initSharedWidgets(ctx);
    if (!id) {
        return {
            layout: [
                ctx.subdomain.sharedWidgets.header,
                ctx.subdomain.sharedWidgets.footer,
            ],
        };
    }

    if (
        ctx.user &&
        checkPermission(ctx.user.permissions, [permissions.manageSite])
    ) {
        const page = await PageModel.findOne(
            {
                pageId: id,
                domain: ctx.subdomain._id,
            },
            {
                pageId: 1,
                layout: 1,
                name: 1,
                type: 1,
                entityId: 1,
                draftLayout: 1,
            }
        );
        return getPageResponse(page, ctx);
    } else {
        const page = await PageModel.findOne(
            {
                pageId: id,
                domain: ctx.subdomain._id,
            },
            {
                pageId: 1,
                layout: 1,
                name: 1,
                type: 1,
                entityId: 1,
            }
        );
        if (page.type === product) {
            const course = await Course.findOne({ courseId: page.entityId });
            if (!course.published) {
                return;
            }
        }

        return getPageResponse(page, ctx);
    }
}

async function initSharedWidgets(ctx: GQLContext) {
    let subdomainChanged = false;
    if (!ctx.subdomain.sharedWidgets.header) {
        ctx.subdomain.sharedWidgets.header = {
            name: "header",
            shared: true,
            deleteable: false,
            widgetId: generateUniqueId(),
        };
        subdomainChanged = true;
    }
    if (!ctx.subdomain.sharedWidgets.footer) {
        ctx.subdomain.sharedWidgets.footer = {
            name: "footer",
            shared: true,
            deleteable: false,
            widgetId: generateUniqueId(),
        };
        subdomainChanged = true;
    }
    if (!ctx.subdomain.sharedWidgets["newsletter-signup"]) {
        ctx.subdomain.sharedWidgets["newsletter-signup"] = {
            name: "newsletter-signup",
            shared: true,
            deleteable: true,
            widgetId: generateUniqueId(),
        };
        subdomainChanged = true;
    }
    if (subdomainChanged) {
        (ctx.subdomain as any).markModified("sharedWidgets");
        await (ctx.subdomain as any).save();
    }
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
        if (page && page.draftLayout.length) {
            page.layout = page.draftLayout;
            page.draftLayout = [];
        }
    } else if ("layout" in pageData) {
        try {
            let layout;
            try {
                layout = JSON.parse(pageData.layout);
            } catch (err) {
                throw new Error(responses.invalid_layout);
            }
            for (let widget of layout) {
                if (widget.shared && widget.widgetId) {
                    ctx.subdomain.sharedWidgets[widget.name] = Object.assign(
                        {},
                        ctx.subdomain.sharedWidgets[widget.name],
                        widget
                    );
                    widget.settings = undefined;
                }
            }
            (ctx.subdomain as any).markModified("sharedWidgets");
            await (ctx.subdomain as any).save();
            page!.draftLayout = layout;
            // console.log(page!.draftLayout);
        } catch (err: any) {
            throw new Error(err.message);
        }
    }

    await (page as any).save();

    return getPageResponse(page!, ctx);
};

export const getPages = async (ctx: GQLContext) => {
    checkIfAuthenticated(ctx);
    if (!checkPermission(ctx.user.permissions, [permissions.manageSite])) {
        throw new Error(responses.action_not_allowed);
    }

    const pages: Page[] = await PageModel.find(
        {
            domain: ctx.subdomain._id,
        },
        {
            pageId: 1,
            name: 1,
            type: 1,
            entityId: 1,
        }
    );

    return pages;
};
