import { responses } from "../../config/strings";
import { checkIfAuthenticated } from "../../lib/graphql";
import GQLContext from "../../models/GQLContext";
import PageModel, { Page } from "../../models/Page";
import { getPageResponse } from "./helpers";
import constants from "../../config/constants";
import Course from "../../models/Course";
import { checkPermission, generateUniqueId } from "@courselit/utils";
import { Footer, Header } from "@courselit/common-widgets";
import { User } from "@courselit/common-models";
import { Domain } from "../../models/Domain";
import { homePageTemplate } from "./page-templates";
const { product, site, blogPage, permissions, defaultPages } = constants;

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
            },
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
            },
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
            settings: {
                links: [
                    {
                        label: "Courses",
                        href: "/courses",
                        isButton: false,
                        isPrimary: false,
                    },
                    {
                        label: "Blog",
                        href: "/blog",
                        isButton: false,
                        isPrimary: false,
                    },
                    {
                        label: "Start learning",
                        href: "/courses",
                        isButton: true,
                        isPrimary: true,
                    },
                ],
                linkAlignment: "center",
                showLoginControl: true,
                linkFontWeight: "font-normal",
                spacingBetweenLinks: 16,
                verticalPadding: 16,
                horizontalPadding: 100,
            },
        };
        subdomainChanged = true;
    }
    if (!ctx.subdomain.sharedWidgets.footer) {
        ctx.subdomain.sharedWidgets.footer = {
            name: "footer",
            shared: true,
            deleteable: false,
            widgetId: generateUniqueId(),
            settings: {
                textColor: "#f8f1f1",
                backgroundColor: "#000000",
                sections: [
                    {
                        name: "Legal",
                        links: [
                            { label: "Terms of use", href: "/p/terms" },
                            { label: "Privacy policy", href: "/p/privacy" },
                        ],
                    },
                ],
                foregroundColor: "#ffffff",
                horizontalPadding: 100,
                verticalPadding: 88,
                titleFontSize: 2,
                sectionHeaderFontSize: "font-semibold",
                socials: {
                    facebook: "",
                    twitter: "https://twitter.com/courselit",
                    instagram: "",
                    youtube: "",
                    linkedin: "",
                    discord: "",
                    github: "https://github.com/codelitdev/courselit",
                },
                socialIconsSize: 24,
            },
        };
        subdomainChanged = true;
    }
    if (!ctx.subdomain.sharedWidgets["newsletter-signup"]) {
        ctx.subdomain.sharedWidgets["newsletter-signup"] = {
            name: "newsletter-signup",
            shared: true,
            deleteable: true,
            widgetId: generateUniqueId(),
            settings: {
                backgroundColor: "#f5f5f5",
                alignment: "center",
                verticalPadding: 88,
            },
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
    ctx: GQLContext,
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

    if ("publish" in pageData) {
        if (page && page.draftLayout.length) {
            page.layout = page.draftLayout;
            page.draftLayout = [];
        }
        ctx.subdomain.typefaces = ctx.subdomain.draftTypefaces;
        ctx.subdomain.sharedWidgets = ctx.subdomain.draftSharedWidgets;
        ctx.subdomain.draftSharedWidgets = {};
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
                    ctx.subdomain.draftSharedWidgets[widget.name] =
                        Object.assign(
                            {},
                            ctx.subdomain.draftSharedWidgets[widget.name],
                            widget,
                        );
                    widget.settings = undefined;
                }
            }
            (ctx.subdomain as any).markModified("draftSharedWidgets");
            await (ctx.subdomain as any).save();
            page.draftLayout = layout;
        } catch (err: any) {
            throw new Error(err.message);
        }
    }

    try {
        if ("publish" in pageData) {
            await (ctx.subdomain as any).save();
        }
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

export const getPages = async (
    ctx: GQLContext,
    type: typeof product | typeof site | typeof blogPage,
) => {
    checkIfAuthenticated(ctx);
    if (!checkPermission(ctx.user.permissions, [permissions.manageSite])) {
        throw new Error(responses.action_not_allowed);
    }

    const filter: Record<string, unknown> = {
        domain: ctx.subdomain._id,
    };

    if (type) {
        filter.type = type;
    }

    const pages: Page[] = await PageModel.find(filter, {
        pageId: 1,
        name: 1,
        type: 1,
        entityId: 1,
        deleteable: 1,
    });

    return pages;
};

export const initMandatoryPages = async (domain: Domain, user: User) => {
    await PageModel.insertMany<Page>([
        {
            domain: domain._id,
            pageId: defaultPages[0],
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
                ...homePageTemplate,
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
            pageId: defaultPages[2],
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
            pageId: defaultPages[1],
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
            pageId: defaultPages[3],
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

export const createPage = async ({
    context: ctx,
    name,
    pageId,
}: {
    context: GQLContext;
    name: string;
    pageId: string;
}): Promise<Partial<Page>> => {
    checkIfAuthenticated(ctx);
    if (!checkPermission(ctx.user.permissions, [permissions.manageSite])) {
        throw new Error(responses.action_not_allowed);
    }

    const existingPage = await PageModel.findOne({
        domain: ctx.subdomain._id,
        pageId,
        type: site,
    });

    if (existingPage) {
        throw new Error(responses.page_exists);
    }

    const page: Page = await PageModel.create({
        domain: ctx.subdomain._id,
        pageId,
        type: site,
        creatorId: ctx.user.userId,
        name,
        entityId: ctx.subdomain.name,
        deleteable: true,
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
    });

    return page;
};

export const deletePage = async (
    ctx: GQLContext,
    id: (typeof defaultPages)[number],
) => {
    checkIfAuthenticated(ctx);
    if (!checkPermission(ctx.user.permissions, [permissions.manageSite])) {
        throw new Error(responses.action_not_allowed);
    }

    if (defaultPages.includes(id)) {
        throw new Error(responses.action_not_allowed);
    }

    await PageModel.deleteOne({
        domain: ctx.subdomain._id,
        deleteable: true,
        pageId: id,
    });

    return true;
};
