/**
 * @jest-environment node
 */

import { updatePage } from "../logic";
import DomainModel from "@/models/Domain";
import PageModel from "@/models/Page";
import constants from "@/config/constants";
import { deleteMedia } from "@/services/medialit";
import type GQLContext from "@/models/GQLContext";
import { responses } from "@/config/strings";

jest.mock("@/services/medialit", () => ({
    deleteMedia: jest.fn().mockResolvedValue(true),
}));

const { permissions } = constants;

function makeHeaderWidget() {
    return {
        widgetId: "header-widget",
        name: "header",
        shared: true,
        deleteable: false,
        settings: {
            links: [],
        },
    };
}

function makeFooterWidget() {
    return {
        widgetId: "footer-widget",
        name: "footer",
        shared: true,
        deleteable: false,
        settings: {
            sections: [],
        },
    };
}

describe("updatePage media handling", () => {
    let domain: any;
    let ctx: GQLContext;

    const protectedUrl = "https://cdn.test/uploads/protected-block/main.png";
    const orphanUrl = "https://cdn.test/uploads/orphan-block/main.png";

    beforeAll(async () => {
        domain = await DomainModel.create({
            name: "protected-media-domain",
            email: "owner@test.com",
            sharedWidgets: {},
            draftSharedWidgets: {},
        });
    });

    beforeEach(async () => {
        jest.clearAllMocks();

        ctx = {
            subdomain: await DomainModel.findById(domain._id),
            user: {
                userId: "admin-user",
                permissions: [permissions.manageSite],
            },
            address: "https://protected.test",
        } as unknown as GQLContext;

        await DomainModel.updateOne(
            { _id: domain._id },
            { $set: { sharedWidgets: {}, draftSharedWidgets: {} } },
        );

        await PageModel.deleteMany({});
    });

    afterAll(async () => {
        await PageModel.deleteMany({});
        await DomainModel.deleteMany({});
    });

    it("skips deleting media that still exists in the published layout", async () => {
        const page = await PageModel.create({
            domain: ctx.subdomain._id,
            pageId: "layout-protection",
            type: constants.site,
            creatorId: "creator-1",
            name: "Layout Protection Page",
            layout: [
                makeHeaderWidget(),
                {
                    widgetId: "protected-widget",
                    name: "hero",
                    shared: false,
                    deleteable: true,
                    settings: {
                        image: protectedUrl,
                    },
                },
                makeFooterWidget(),
            ],
            draftLayout: [
                makeHeaderWidget(),
                {
                    widgetId: "protected-widget",
                    name: "hero",
                    shared: false,
                    deleteable: true,
                    settings: {
                        image: protectedUrl,
                    },
                },
                {
                    widgetId: "orphan-widget",
                    name: "hero",
                    shared: false,
                    deleteable: true,
                    settings: {
                        image: orphanUrl,
                    },
                },
                makeFooterWidget(),
            ],
        });

        const nextDraftLayout = JSON.stringify([
            makeHeaderWidget(),
            makeFooterWidget(),
        ]);

        const result = await updatePage({
            context: ctx,
            pageId: page.pageId,
            layout: nextDraftLayout,
        });

        const deleteMediaMock = deleteMedia as jest.Mock;

        expect(result).toBeDefined();
        expect(deleteMediaMock).toHaveBeenCalledTimes(1);
        expect(deleteMediaMock).toHaveBeenCalledWith("orphan-block");
        expect(deleteMediaMock).not.toHaveBeenCalledWith("protected-block");

        const updatedPage = await PageModel.findOne({
            domain: ctx.subdomain._id,
            pageId: page.pageId,
        }).lean();

        expect(updatedPage?.draftLayout).toHaveLength(2);
    });

    it("still deletes media that is no longer referenced anywhere", async () => {
        const page = await PageModel.create({
            domain: ctx.subdomain._id,
            pageId: "layout-cleanup",
            type: constants.site,
            creatorId: "creator-1",
            name: "Layout Cleanup Page",
            layout: [makeHeaderWidget(), makeFooterWidget()],
            draftLayout: [
                makeHeaderWidget(),
                {
                    widgetId: "orphan-widget",
                    name: "hero",
                    shared: false,
                    deleteable: true,
                    settings: {
                        image: orphanUrl,
                    },
                },
                makeFooterWidget(),
            ],
        });

        const nextDraftLayout = JSON.stringify([
            makeHeaderWidget(),
            makeFooterWidget(),
        ]);

        await updatePage({
            context: ctx,
            pageId: page.pageId,
            layout: nextDraftLayout,
        });

        const deleteMediaMock = deleteMedia as jest.Mock;
        expect(deleteMediaMock).toHaveBeenCalledTimes(1);
        expect(deleteMediaMock).toHaveBeenCalledWith("orphan-block");
    });

    it("throws when requester lacks permission", async () => {
        const page = await PageModel.create({
            domain: ctx.subdomain._id,
            pageId: "permission-check",
            type: constants.site,
            creatorId: "creator-1",
            name: "Permission Check Page",
            layout: [makeHeaderWidget(), makeFooterWidget()],
            draftLayout: [makeHeaderWidget(), makeFooterWidget()],
        });

        const nextDraftLayout = JSON.stringify([
            makeHeaderWidget(),
            makeFooterWidget(),
        ]);

        const unauthorizedCtx = {
            ...ctx,
            user: {
                userId: "viewer",
                permissions: [],
            },
        } as GQLContext;

        await expect(
            updatePage({
                context: unauthorizedCtx,
                pageId: page.pageId,
                layout: nextDraftLayout,
            }),
        ).rejects.toThrow(responses.action_not_allowed);
    });
});
