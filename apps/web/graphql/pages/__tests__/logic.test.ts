/**
 * @jest-environment node
 */

import { updatePage, getPage } from "../logic";
import DomainModel from "@/models/Domain";
import PageModel, { Page } from "@/models/Page";
import Course from "@/models/Course";
import CommunityModel from "@/models/Community";
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

        const updatedPage = (await PageModel.findOne({
            domain: ctx.subdomain._id,
            pageId: page.pageId,
        }).lean()) as unknown as Page | null;

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
        } as unknown as GQLContext;

        await expect(
            updatePage({
                context: unauthorizedCtx,
                pageId: page.pageId,
                layout: nextDraftLayout,
            }),
        ).rejects.toThrow(responses.action_not_allowed);
    });
});

describe("getPage entity validation", () => {
    let domain: any;
    let ctx: GQLContext;

    beforeAll(async () => {
        domain = await DomainModel.create({
            name: "entity-validation-domain",
            email: "owner@test.com",
            sharedWidgets: {},
            draftSharedWidgets: {},
        });
    });

    beforeEach(async () => {
        jest.clearAllMocks();

        ctx = {
            subdomain: await DomainModel.findById(domain._id),
            user: null,
            address: "https://entity-validation.test",
        } as unknown as GQLContext;

        await DomainModel.updateOne(
            { _id: domain._id },
            { $set: { sharedWidgets: {}, draftSharedWidgets: {} } },
        );

        await PageModel.deleteMany({});
        await Course.deleteMany({});
        await CommunityModel.deleteMany({});
    });

    afterAll(async () => {
        await PageModel.deleteMany({});
        await Course.deleteMany({});
        await CommunityModel.deleteMany({});
        await DomainModel.deleteMany({});
    });

    describe("product page validation", () => {
        it("returns the page when course exists and is published", async () => {
            const courseId = "test-course-id";

            await Course.create({
                courseId,
                domain: ctx.subdomain._id,
                published: true,
                title: "Test Course",
                creatorId: "creator-1",
                slug: "test-course",
                type: "course",
                privacy: "public",
                costType: "free",
                cost: 0,
            });

            const page = await PageModel.create({
                domain: ctx.subdomain._id,
                pageId: "product-page-1",
                type: constants.product,
                entityId: courseId,
                creatorId: "creator-1",
                name: "Product Page",
                layout: [makeHeaderWidget(), makeFooterWidget()],
            });

            const result = await getPage({ id: page.pageId, ctx });

            expect(result).toBeDefined();
            expect(result?.pageId).toBe(page.pageId);
        });

        it("returns undefined when course does not exist", async () => {
            const page = await PageModel.create({
                domain: ctx.subdomain._id,
                pageId: "product-page-2",
                type: constants.product,
                entityId: "non-existent-course",
                creatorId: "creator-1",
                name: "Product Page",
                layout: [makeHeaderWidget(), makeFooterWidget()],
            });

            const result = await getPage({ id: page.pageId, ctx });

            expect(result).toBeUndefined();
        });

        it("returns undefined when course exists but is not published", async () => {
            const courseId = "unpublished-course-id";

            await Course.create({
                courseId,
                domain: ctx.subdomain._id,
                published: false,
                title: "Unpublished Course",
                creatorId: "creator-1",
                slug: "unpublished-course",
                type: "course",
                privacy: "public",
                costType: "free",
                cost: 0,
            });

            const page = await PageModel.create({
                domain: ctx.subdomain._id,
                pageId: "product-page-3",
                type: constants.product,
                entityId: courseId,
                creatorId: "creator-1",
                name: "Product Page",
                layout: [makeHeaderWidget(), makeFooterWidget()],
            });

            const result = await getPage({ id: page.pageId, ctx });

            expect(result).toBeUndefined();
        });

        it("returns undefined when course belongs to different domain", async () => {
            const otherDomain = await DomainModel.create({
                name: "other-domain",
                email: "other@test.com",
                sharedWidgets: {},
                draftSharedWidgets: {},
            });

            const courseId = "different-domain-course";

            await Course.create({
                courseId,
                domain: otherDomain._id,
                published: true,
                title: "Other Domain Course",
                creatorId: "creator-1",
                slug: "other-domain-course",
                type: "course",
                privacy: "public",
                costType: "free",
                cost: 0,
            });

            const page = await PageModel.create({
                domain: ctx.subdomain._id,
                pageId: "product-page-4",
                type: constants.product,
                entityId: courseId,
                creatorId: "creator-1",
                name: "Product Page",
                layout: [makeHeaderWidget(), makeFooterWidget()],
            });

            const result = await getPage({ id: page.pageId, ctx });

            expect(result).toBeUndefined();

            await DomainModel.deleteOne({ _id: otherDomain._id });
        });
    });

    describe("community page validation", () => {
        it("returns the page when community exists and is enabled", async () => {
            const communityId = "test-community-id";

            await CommunityModel.create({
                communityId,
                domain: ctx.subdomain._id,
                enabled: true,
                name: "Test Community",
                pageId: "community-page-1",
            });

            const page = await PageModel.create({
                domain: ctx.subdomain._id,
                pageId: "community-page-1",
                type: constants.communityPage,
                entityId: communityId,
                creatorId: "creator-1",
                name: "Community Page",
                layout: [makeHeaderWidget(), makeFooterWidget()],
            });

            const result = await getPage({ id: page.pageId, ctx });

            expect(result).toBeDefined();
            expect(result?.pageId).toBe(page.pageId);
        });

        it("returns undefined when community does not exist", async () => {
            const page = await PageModel.create({
                domain: ctx.subdomain._id,
                pageId: "community-page-2",
                type: constants.communityPage,
                entityId: "non-existent-community",
                creatorId: "creator-1",
                name: "Community Page",
                layout: [makeHeaderWidget(), makeFooterWidget()],
            });

            const result = await getPage({ id: page.pageId, ctx });

            expect(result).toBeUndefined();
        });

        it("returns undefined when community exists but is not enabled", async () => {
            const communityId = "disabled-community-id";

            await CommunityModel.create({
                communityId,
                domain: ctx.subdomain._id,
                enabled: false,
                name: "Disabled Community",
                pageId: "community-page-3",
            });

            const page = await PageModel.create({
                domain: ctx.subdomain._id,
                pageId: "community-page-3",
                type: constants.communityPage,
                entityId: communityId,
                creatorId: "creator-1",
                name: "Community Page",
                layout: [makeHeaderWidget(), makeFooterWidget()],
            });

            const result = await getPage({ id: page.pageId, ctx });

            expect(result).toBeUndefined();
        });

        it("returns undefined when community belongs to different domain", async () => {
            const otherDomain = await DomainModel.create({
                name: "other-community-domain",
                email: "other-community@test.com",
                sharedWidgets: {},
                draftSharedWidgets: {},
            });

            const communityId = "different-domain-community";

            await CommunityModel.create({
                communityId,
                domain: otherDomain._id,
                enabled: true,
                name: "Other Domain Community",
                pageId: "community-page-4",
            });

            const page = await PageModel.create({
                domain: ctx.subdomain._id,
                pageId: "community-page-4",
                type: constants.communityPage,
                entityId: communityId,
                creatorId: "creator-1",
                name: "Community Page",
                layout: [makeHeaderWidget(), makeFooterWidget()],
            });

            const result = await getPage({ id: page.pageId, ctx });

            expect(result).toBeUndefined();

            await DomainModel.deleteOne({ _id: otherDomain._id });
        });
    });

    describe("admin bypass validation", () => {
        it("admin can view unpublished product page", async () => {
            const courseId = "admin-course-id";

            await Course.create({
                courseId,
                domain: ctx.subdomain._id,
                published: false,
                title: "Admin Course",
                creatorId: "creator-1",
                slug: "admin-course",
                type: "course",
                privacy: "public",
                costType: "free",
                cost: 0,
            });

            const page = await PageModel.create({
                domain: ctx.subdomain._id,
                pageId: "admin-product-page",
                type: constants.product,
                entityId: courseId,
                creatorId: "creator-1",
                name: "Admin Product Page",
                layout: [makeHeaderWidget(), makeFooterWidget()],
                draftLayout: [makeHeaderWidget(), makeFooterWidget()],
            });

            const adminCtx = {
                ...ctx,
                user: {
                    userId: "admin-user",
                    permissions: [constants.permissions.manageSite],
                },
            } as unknown as GQLContext;

            const result = await getPage({ id: page.pageId, ctx: adminCtx });

            expect(result).toBeDefined();
            expect(result?.pageId).toBe(page.pageId);
        });

        it("admin can view disabled community page", async () => {
            const communityId = "admin-community-id";

            await CommunityModel.create({
                communityId,
                domain: ctx.subdomain._id,
                enabled: false,
                name: "Admin Community",
                pageId: "admin-community-page",
            });

            const page = await PageModel.create({
                domain: ctx.subdomain._id,
                pageId: "admin-community-page",
                type: constants.communityPage,
                entityId: communityId,
                creatorId: "creator-1",
                name: "Admin Community Page",
                layout: [makeHeaderWidget(), makeFooterWidget()],
                draftLayout: [makeHeaderWidget(), makeFooterWidget()],
            });

            const adminCtx = {
                ...ctx,
                user: {
                    userId: "admin-user",
                    permissions: [constants.permissions.manageSite],
                },
            } as unknown as GQLContext;

            const result = await getPage({ id: page.pageId, ctx: adminCtx });

            expect(result).toBeDefined();
            expect(result?.pageId).toBe(page.pageId);
        });
    });
});
