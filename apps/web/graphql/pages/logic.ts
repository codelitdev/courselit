import { responses } from "../../config/strings";
import { checkIfAuthenticated } from "../../lib/graphql";
import GQLContext from "../../models/GQLContext";
import PageModel, { Page } from "../../models/Page";
import {
    copySharedWidgetsToDomain,
    getPageResponse,
    initSharedWidgets,
} from "./helpers";
import constants from "../../config/constants";
import Course from "../../models/Course";
import { checkPermission } from "@courselit/utils";
import { Media, User, Constants } from "@courselit/common-models";
import { Domain } from "../../models/Domain";
import { homePageTemplate } from "./page-templates";
import { publishTheme } from "../themes/logic";
import getDeletedMediaIds, {
    extractMediaIDs,
} from "@/lib/get-deleted-media-ids";
import { deleteMedia } from "@/services/medialit";
import CommunityModel from "@models/Community";
const { product, site, blogPage, communityPage, permissions, defaultPages } =
    constants;
const { pageNames } = Constants;

export async function getPage({ id, ctx }: { id?: string; ctx: GQLContext }) {
    await initSharedWidgets(ctx);
    if (!id) {
        return {
            type: site,
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
                title: 1,
                description: 1,
                socialImage: 1,
                robotsAllowed: 1,
                type: 1,
                entityId: 1,
                draftLayout: 1,
                draftTitle: 1,
                draftDescription: 1,
                draftSocialImage: 1,
                draftRobotsAllowed: 1,
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
                title: 1,
                description: 1,
                socialImage: 1,
                robotsAllowed: 1,
            },
        );
        if (!page) return;

        if (page.type === product) {
            const course = await Course.findOne({
                courseId: page.entityId,
                domain: ctx.subdomain._id,
                published: true,
            });
            if (!course) {
                return;
            }
        }

        if (page.type === communityPage) {
            const community = await CommunityModel.findOne({
                domain: ctx.subdomain._id,
                communityId: page.entityId,
                enabled: true,
            });
            if (!community) {
                return;
            }
        }

        return getPageResponse(page, ctx);
    }
}

export const updatePage = async ({
    context: ctx,
    pageId,
    layout: inputLayout,
    title,
    description,
    socialImage,
    robotsAllowed,
}: {
    context: GQLContext;
    pageId: string;
    layout?: string;
    title?: string;
    description?: string;
    socialImage?: Media;
    robotsAllowed?: boolean;
}): Promise<Partial<Page> | null> => {
    checkIfAuthenticated(ctx);
    if (!checkPermission(ctx.user.permissions, [permissions.manageSite])) {
        throw new Error(responses.action_not_allowed);
    }
    const page: Page | null = await PageModel.findOne({
        pageId,
        domain: ctx.subdomain._id,
    });

    if (!page) {
        return null;
    }

    const deletedMediaIds = getDeletedMediaIds(
        JSON.stringify(page.draftLayout || ""),
        inputLayout || "",
    );
    const publishedLayoutMediaIds = extractMediaIDs(
        JSON.stringify(page.layout ?? []),
    );
    if (inputLayout) {
        try {
            let layout;
            try {
                layout = JSON.parse(inputLayout);
                const headerWidget = layout.find(
                    (widget: any) => widget.name === "header",
                );
                const footerWidget = layout.find(
                    (widget: any) => widget.name === "footer",
                );
                if (!headerWidget || !footerWidget) {
                    throw new Error(responses.missing_mandatory_blocks);
                }
            } catch (err) {
                throw new Error(`${responses.invalid_layout}: ${err.message}`);
            }
            const layoutWithSharedWidgetsSettings =
                await copySharedWidgetsToDomain(layout, ctx.subdomain);
            page.draftLayout = layoutWithSharedWidgetsSettings;
        } catch (err: any) {
            throw new Error(err.message);
        }
    }
    if (title) {
        page.draftTitle = title;
    }
    if (description) {
        page.draftDescription = description;
    }
    if (typeof socialImage !== "undefined") {
        page.draftSocialImage = socialImage;
    }
    if (typeof robotsAllowed === "boolean") {
        page.draftRobotsAllowed = robotsAllowed;
    }

    const deletableMediaIds = Array.from(deletedMediaIds).filter(
        (mediaId) => !publishedLayoutMediaIds.has(mediaId),
    );

    for (const mediaId of deletableMediaIds) {
        await deleteMedia(mediaId);
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

export const publish = async (
    pageId: string,
    ctx: GQLContext,
): Promise<Partial<Page> | null> => {
    checkIfAuthenticated(ctx);
    if (!checkPermission(ctx.user.permissions, [permissions.manageSite])) {
        throw new Error(responses.action_not_allowed);
    }
    const page: Page | null = await PageModel.findOne({
        pageId,
        domain: ctx.subdomain._id,
    });

    if (!page) {
        return null;
    }

    if (page.draftLayout.length) {
        page.layout = page.draftLayout;
        page.draftLayout = [];
    }
    if (page.draftTitle) {
        page.title = page.draftTitle;
        page.draftTitle = undefined;
    }
    if (page.draftDescription) {
        page.description = page.draftDescription;
        page.draftDescription = undefined;
    }
    if (page.draftRobotsAllowed) {
        page.robotsAllowed = page.draftRobotsAllowed;
        page.draftRobotsAllowed = undefined;
    }
    page.socialImage = page.draftSocialImage;

    ctx.subdomain.typefaces = ctx.subdomain.draftTypefaces;
    ctx.subdomain.sharedWidgets = ctx.subdomain.draftSharedWidgets;
    // ctx.subdomain.draftSharedWidgets = {};

    if (ctx.subdomain.themeId) {
        await publishTheme(ctx.subdomain.themeId, ctx);
    }

    await (ctx.subdomain as any).save();
    await (page as any).save();

    return getPageResponse(page!, ctx);
};

export const getPages = async (
    ctx: GQLContext,
    type?:
        | typeof product
        | typeof site
        | typeof blogPage
        | typeof communityPage,
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
    await PageModel.bulkWrite([
        {
            updateOne: {
                filter: { domain: domain._id, pageId: defaultPages[0] },
                update: {
                    $setOnInsert: {
                        domain: domain._id,
                        pageId: defaultPages[0],
                        type: site,
                        creatorId: user.userId,
                        name: pageNames.home,
                        entityId: domain.name,
                        layout: [
                            { name: "header", deleteable: false, shared: true },
                            ...homePageTemplate,
                            { name: "footer", deleteable: false, shared: true },
                        ],
                        draftLayout: [],
                    },
                },
                upsert: true,
            },
        },
        {
            updateOne: {
                filter: { domain: domain._id, pageId: defaultPages[2] },
                update: {
                    $setOnInsert: {
                        domain: domain._id,
                        pageId: defaultPages[2],
                        type: site,
                        creatorId: user.userId,
                        name: pageNames.privacy,
                        entityId: domain.name,
                        layout: [
                            { name: "header", deleteable: false, shared: true },
                            { name: "footer", deleteable: false, shared: true },
                        ],
                        draftLayout: [],
                    },
                },
                upsert: true,
            },
        },
        {
            updateOne: {
                filter: { domain: domain._id, pageId: defaultPages[1] },
                update: {
                    $setOnInsert: {
                        domain: domain._id,
                        pageId: defaultPages[1],
                        type: site,
                        creatorId: user.userId,
                        name: pageNames.terms,
                        entityId: domain.name,
                        layout: [
                            { name: "header", deleteable: false, shared: true },
                            { name: "footer", deleteable: false, shared: true },
                        ],
                        draftLayout: [],
                    },
                },
                upsert: true,
            },
        },
        {
            updateOne: {
                filter: { domain: domain._id, pageId: defaultPages[3] },
                update: {
                    $setOnInsert: {
                        domain: domain._id,
                        pageId: defaultPages[3],
                        type: blogPage,
                        creatorId: user.userId,
                        name: pageNames.blog,
                        entityId: domain.name,
                        layout: [
                            { name: "header", deleteable: false, shared: true },
                            { name: "footer", deleteable: false, shared: true },
                        ],
                        draftLayout: [],
                    },
                },
                upsert: true,
            },
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
                name: "header",
                deleteable: false,
                shared: true,
            },
            {
                name: "footer",
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

    await deletePageInternal(ctx, id);

    return true;
};

export const deletePageInternal = async (ctx: GQLContext, id: string) => {
    const page = (await PageModel.findOne({
        domain: ctx.subdomain._id,
        pageId: id,
    }).lean()) as unknown as Page;

    if (!page) {
        throw new Error(responses.item_not_found);
    }

    const mediaToBeDeleted = extractMediaIDs(JSON.stringify(page));
    for (const mediaId of Array.from(mediaToBeDeleted)) {
        await deleteMedia(mediaId);
    }

    await PageModel.deleteOne({
        domain: ctx.subdomain._id,
        deleteable: true,
        pageId: id,
    });
};
