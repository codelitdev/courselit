import { responses } from "../../config/strings";
import {
    checkIfAuthenticated,
    checkOwnershipWithoutModel,
} from "../../lib/graphql";
import GQLContext from "../../models/GQLContext";
import PageModel, { Page } from "../../models/Page";
import { getPageResponse } from "./helpers";
import constants from "../../config/constants";
import Course from "../../models/Course";
import { checkPermission, generateUniqueId } from "@courselit/utils";
import { Footer, Header } from "@courselit/common-widgets";
import { User } from "@courselit/common-models";
import { Domain } from "../../models/Domain";
const { product, site, blogPage, permissions } = constants;

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

    const isAdmin =
        ctx.user &&
        checkPermission(ctx.user.permissions, [permissions.manageSite]);
    if (isAdmin) {
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
        if (!page) return;

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
        if (!page) return;

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
        } catch (err: any) {
            throw new Error(err.message);
        }
    }

    try {
        await (page as any).save();
    } catch (e: any) {
        // We want to safely ignore the error where `__v` property does not
        // match for a document as it signifies a race condition in mongoose.
        if (!/^No matching document/.test(e.message)) {
            throw new Error(e.message);
        }
    }

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

export const initMandatoryPages = async (domain: Domain, user: User) => {
    await PageModel.insertMany<Page>([
        {
            domain: domain._id,
            pageId: "homepage",
            type: site,
            creatorId: user.userId,
            name: "Home page",
            entityId: domain.name,
            layout: [
                {
                    name: Header.metadata.name,
                    deleteable: false,
                    shared: true,
                },
                {
                    name: Footer.metadata.name,
                    deleteable: false,
                    shared: true,
                },
            ],
            draftLayout: [],
        },
        {
            domain: domain._id,
            pageId: "privacy",
            type: site,
            creatorId: user.userId,
            name: "Privacy policy",
            entityId: domain.name,
            layout: [
                {
                    name: Header.metadata.name,
                    deleteable: false,
                    shared: true,
                },
                {
                    name: Footer.metadata.name,
                    deleteable: false,
                    shared: true,
                },
            ],
            draftLayout: [],
        },
        {
            domain: domain._id,
            pageId: "terms",
            type: site,
            creatorId: user.userId,
            name: "Terms of Service",
            entityId: domain.name,
            layout: [
                {
                    name: Header.metadata.name,
                    deleteable: false,
                    shared: true,
                },
                {
                    name: Footer.metadata.name,
                    deleteable: false,
                    shared: true,
                },
            ],
            draftLayout: [],
        },
        {
            domain: domain._id,
            pageId: "blog",
            type: blogPage,
            creatorId: user.userId,
            name: "Blog",
            entityId: domain.name,
            layout: [
                {
                    name: Header.metadata.name,
                    deleteable: false,
                    shared: true,
                },
                {
                    name: Footer.metadata.name,
                    deleteable: false,
                    shared: true,
                },
            ],
            draftLayout: [],
        },
    ]);
};
