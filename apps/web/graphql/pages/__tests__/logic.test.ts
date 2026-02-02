/**
 * @jest-environment node
 */

import { updatePage, getPage, publish } from "../logic";
import DomainModel from "@/models/Domain";
import PageModel, { Page } from "@/models/Page";
import Course from "@/models/Course";
import CommunityModel from "@/models/Community";
import constants from "@/config/constants";
import { deleteMedia } from "@/services/medialit";
import GQLContext from "@/models/GQLContext";
import { responses } from "@/config/strings";

jest.mock("@/services/medialit", () => ({
    deleteMedia: jest.fn().mockResolvedValue(true),
    sealMedia: jest.fn().mockImplementation((id) =>
        Promise.resolve({
            mediaId: id,
            url: `https://cdn.test/${id}`,
            originalFileName: "image.png",
            mimeType: "image/png",
            size: 1024,
            access: "public",
        }),
    ),
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
            name: `protected-media-domain-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
            email: "owner@test.com",
            sharedWidgets: {},
            draftSharedWidgets: {},
        });
    });

    beforeEach(async () => {
        jest.clearAllMocks();

        ctx = {
            subdomain: domain,
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

        await PageModel.deleteMany({ domain: domain._id });
    });

    afterAll(async () => {
        await PageModel.deleteMany({ domain: domain._id });
        await DomainModel.deleteMany({ _id: domain._id });
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
            name: `entity-validation-domain-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
            email: "owner@test.com",
            sharedWidgets: {},
            draftSharedWidgets: {},
        });
    });

    beforeEach(async () => {
        jest.clearAllMocks();

        ctx = {
            subdomain: domain,
            user: null,
            address: "https://entity-validation.test",
        } as unknown as GQLContext;

        await DomainModel.updateOne(
            { _id: domain._id },
            { $set: { sharedWidgets: {}, draftSharedWidgets: {} } },
        );

        await PageModel.deleteMany({ domain: domain._id });
        await Course.deleteMany({ domain: domain._id });
        await CommunityModel.deleteMany({ domain: domain._id });
    });

    afterAll(async () => {
        await PageModel.deleteMany({ domain: domain._id });
        await Course.deleteMany({ domain: domain._id });
        await CommunityModel.deleteMany({ domain: domain._id });
        await DomainModel.deleteMany({ _id: domain._id });
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

            // Clean up the extra domain created in this test
            await Course.deleteMany({ domain: otherDomain._id });
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

            // Clean up the extra domain created in this test
            await CommunityModel.deleteMany({ domain: otherDomain._id });
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

describe("Media cleanup", () => {
    let domain: any;
    let ctx: GQLContext;

    const media1 = "media-1";
    const media2 = "media-2";
    const media3 = "media-3";
    const mediaObj1 = {
        mediaId: media1,
        url: `https://cdn.test/${media1}`,
        originalFileName: "image1.png",
        mimeType: "image/png",
        size: 1024,
        access: "public",
    };
    const mediaObj2 = {
        mediaId: media2,
        url: `https://cdn.test/${media2}`,
        originalFileName: "image2.png",
        mimeType: "image/png",
        size: 2048,
        access: "public",
    };

    beforeAll(async () => {
        domain = await DomainModel.create({
            name: `media-cleanup-domain-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
            email: "owner@test.com",
            sharedWidgets: {},
            draftSharedWidgets: {},
        });
    });

    beforeEach(async () => {
        jest.clearAllMocks();

        ctx = {
            subdomain: domain,
            user: {
                userId: "admin-user",
                permissions: [permissions.manageSite],
            },
            address: "https://media-cleanup.test",
        } as unknown as GQLContext;

        await PageModel.deleteMany({ domain: domain._id });
    });

    afterAll(async () => {
        await PageModel.deleteMany({ domain: domain._id });
        await DomainModel.deleteMany({ _id: domain._id });
    });

    it("updating title will not call deleteMedia", async () => {
        // Setup: Page with media in draft layout
        const page = await PageModel.create({
            domain: ctx.subdomain._id,
            pageId: "bug-partial-update",
            type: constants.site,
            creatorId: "creator-1",
            name: "Bug Partial Update",
            layout: [makeHeaderWidget(), makeFooterWidget()],
            draftLayout: [
                makeHeaderWidget(),
                {
                    widgetId: "media-widget",
                    name: "hero",
                    settings: { image: mediaObj1.url },
                },
                makeFooterWidget(),
            ],
        });

        // Action: Update only title
        try {
            await updatePage({
                context: ctx,
                pageId: page.pageId,
                title: "New Title",
            });
        } catch (e) {
            // Ignore the crash to check if deleteMedia was called
        }

        // Assertion: media1 should NOT be deleted
        expect(deleteMedia).not.toHaveBeenCalledWith(media1);
    });

    it("orphans social image when replaced", async () => {
        // Setup: Page with social image ONLY in draft
        const page = await PageModel.create({
            domain: ctx.subdomain._id,
            pageId: "bug-social-image-orphan",
            type: constants.site,
            creatorId: "creator-1",
            name: "Bug Social Image Orphan",
            layout: [],
            draftLayout: [],
            socialImage: undefined,
            draftSocialImage: mediaObj1,
        });

        // Action: Update specific social image
        await updatePage({
            context: ctx,
            pageId: page.pageId,
            socialImage: mediaObj2 as any,
        });

        // Assertion: media1 should be deleted (replaced by media2 and Is not published)
        expect(deleteMedia).toHaveBeenCalledWith(media1);
    });

    it("existing social image is deleted when publishing", async () => {
        // Setup: Page with media1 as socialImage, and layout awaiting publish with media2 as new socialImage
        const page = await PageModel.create({
            domain: ctx.subdomain._id,
            pageId: "bug-publish-social-orphan",
            type: constants.site,
            creatorId: "creator-1",
            name: "Bug Publish Social Orphan",
            layout: [],
            draftLayout: [],
            socialImage: mediaObj1,
            draftSocialImage: mediaObj2,
        });

        // Action: Publish
        await publish(page.pageId, ctx);

        // Assertion: media1 should be deleted as it is replaced by media2
        expect(deleteMedia).toHaveBeenCalledWith(media1);
    });

    describe("updatePage media cleanup", () => {
        it("deletes media removed from draft layout when not in published layout", async () => {
            const page = await PageModel.create({
                domain: ctx.subdomain._id,
                pageId: "update-removes-media",
                type: constants.site,
                creatorId: "creator-1",
                name: "Update Removes Media",
                layout: [makeHeaderWidget(), makeFooterWidget()],
                draftLayout: [
                    makeHeaderWidget(),
                    {
                        widgetId: "image-widget",
                        name: "hero",
                        settings: {
                            image: `https://cdn.test/${media1}/main.png`,
                        },
                    },
                    makeFooterWidget(),
                ],
            });

            await updatePage({
                context: ctx,
                pageId: page.pageId,
                layout: JSON.stringify([
                    makeHeaderWidget(),
                    makeFooterWidget(),
                ]),
            });

            expect(deleteMedia).toHaveBeenCalledWith(media1);
        });

        it("does NOT delete media still present in published layout", async () => {
            const page = await PageModel.create({
                domain: ctx.subdomain._id,
                pageId: "update-protects-published",
                type: constants.site,
                creatorId: "creator-1",
                name: "Update Protects Published",
                layout: [
                    makeHeaderWidget(),
                    {
                        widgetId: "protected-widget",
                        name: "hero",
                        settings: {
                            image: `https://cdn.test/${media1}/main.png`,
                        },
                    },
                    makeFooterWidget(),
                ],
                draftLayout: [
                    makeHeaderWidget(),
                    {
                        widgetId: "protected-widget",
                        name: "hero",
                        settings: {
                            image: `https://cdn.test/${media1}/main.png`,
                        },
                    },
                    makeFooterWidget(),
                ],
            });

            await updatePage({
                context: ctx,
                pageId: page.pageId,
                layout: JSON.stringify([
                    makeHeaderWidget(),
                    makeFooterWidget(),
                ]),
            });

            expect(deleteMedia).not.toHaveBeenCalledWith(media1);
        });

        it("deletes old draftSocialImage when replaced with new one", async () => {
            const page = await PageModel.create({
                domain: ctx.subdomain._id,
                pageId: "update-replaces-social",
                type: constants.site,
                creatorId: "creator-1",
                name: "Update Replaces Social",
                layout: [],
                draftLayout: [],
                draftSocialImage: mediaObj1,
            });

            await updatePage({
                context: ctx,
                pageId: page.pageId,
                socialImage: mediaObj2 as any,
            });

            expect(deleteMedia).toHaveBeenCalledWith(media1);
        });

        it("does NOT delete draftSocialImage if it is the same as published socialImage", async () => {
            const page = await PageModel.create({
                domain: ctx.subdomain._id,
                pageId: "update-protects-published-social",
                type: constants.site,
                creatorId: "creator-1",
                name: "Update Protects Published Social",
                layout: [],
                draftLayout: [],
                socialImage: mediaObj1,
                draftSocialImage: mediaObj1,
            });

            await updatePage({
                context: ctx,
                pageId: page.pageId,
                socialImage: mediaObj2 as any,
            });

            expect(deleteMedia).not.toHaveBeenCalledWith(media1);
        });

        it("handles multiple media in a single widget", async () => {
            const page = await PageModel.create({
                domain: ctx.subdomain._id,
                pageId: "update-multiple-media",
                type: constants.site,
                creatorId: "creator-1",
                name: "Update Multiple Media",
                layout: [makeHeaderWidget(), makeFooterWidget()],
                draftLayout: [
                    makeHeaderWidget(),
                    {
                        widgetId: "gallery-widget",
                        name: "gallery",
                        settings: {
                            images: [
                                `https://cdn.test/${media1}/main.png`,
                                `https://cdn.test/${media2}/main.png`,
                            ],
                        },
                    },
                    makeFooterWidget(),
                ],
            });

            await updatePage({
                context: ctx,
                pageId: page.pageId,
                layout: JSON.stringify([
                    makeHeaderWidget(),
                    {
                        widgetId: "gallery-widget",
                        name: "gallery",
                        settings: {
                            images: [`https://cdn.test/${media2}/main.png`],
                        },
                    },
                    makeFooterWidget(),
                ]),
            });

            expect(deleteMedia).toHaveBeenCalledWith(media1);
            expect(deleteMedia).not.toHaveBeenCalledWith(media2);
        });

        it("handles deeply nested media in widget settings", async () => {
            const page = await PageModel.create({
                domain: ctx.subdomain._id,
                pageId: "update-nested-media",
                type: constants.site,
                creatorId: "creator-1",
                name: "Update Nested Media",
                layout: [makeHeaderWidget(), makeFooterWidget()],
                draftLayout: [
                    makeHeaderWidget(),
                    {
                        widgetId: "complex-widget",
                        name: "complex",
                        settings: {
                            sections: [
                                {
                                    items: [
                                        {
                                            media: {
                                                url: `https://cdn.test/${media1}/main.png`,
                                            },
                                        },
                                    ],
                                },
                            ],
                        },
                    },
                    makeFooterWidget(),
                ],
            });

            await updatePage({
                context: ctx,
                pageId: page.pageId,
                layout: JSON.stringify([
                    makeHeaderWidget(),
                    makeFooterWidget(),
                ]),
            });

            expect(deleteMedia).toHaveBeenCalledWith(media1);
        });

        it("does not delete any media when updating only metadata (title/description)", async () => {
            const page = await PageModel.create({
                domain: ctx.subdomain._id,
                pageId: "update-metadata-only",
                type: constants.site,
                creatorId: "creator-1",
                name: "Update Metadata Only",
                layout: [
                    makeHeaderWidget(),
                    {
                        widgetId: "w1",
                        name: "hero",
                        settings: {
                            image: `https://cdn.test/${media1}/main.png`,
                        },
                    },
                    makeFooterWidget(),
                ],
                draftLayout: [
                    makeHeaderWidget(),
                    {
                        widgetId: "w1",
                        name: "hero",
                        settings: {
                            image: `https://cdn.test/${media1}/main.png`,
                        },
                    },
                    makeFooterWidget(),
                ],
            });

            await updatePage({
                context: ctx,
                pageId: page.pageId,
                title: "New Title",
                description: "New Description",
            });

            expect(deleteMedia).not.toHaveBeenCalled();
        });
    });

    describe("publish media cleanup", () => {
        it("deletes media from old published layout not in new published layout", async () => {
            const page = await PageModel.create({
                domain: ctx.subdomain._id,
                pageId: "publish-removes-media",
                type: constants.site,
                creatorId: "creator-1",
                name: "Publish Removes Media",
                layout: [
                    makeHeaderWidget(),
                    {
                        widgetId: "w1",
                        name: "hero",
                        settings: {
                            image: `https://cdn.test/${media1}/main.png`,
                        },
                    },
                    makeFooterWidget(),
                ],
                draftLayout: [makeHeaderWidget(), makeFooterWidget()],
            });

            await publish(page.pageId, ctx);

            expect(deleteMedia).toHaveBeenCalledWith(media1);
        });

        it("does NOT delete media that exists in both old and new layouts", async () => {
            const page = await PageModel.create({
                domain: ctx.subdomain._id,
                pageId: "publish-keeps-shared",
                type: constants.site,
                creatorId: "creator-1",
                name: "Publish Keeps Shared",
                layout: [
                    makeHeaderWidget(),
                    {
                        widgetId: "w1",
                        name: "hero",
                        settings: {
                            image: `https://cdn.test/${media1}/main.png`,
                        },
                    },
                    makeFooterWidget(),
                ],
                draftLayout: [
                    makeHeaderWidget(),
                    {
                        widgetId: "w1",
                        name: "hero",
                        settings: {
                            image: `https://cdn.test/${media1}/main.png`,
                        },
                    },
                    {
                        widgetId: "w2",
                        name: "banner",
                        settings: {
                            image: `https://cdn.test/${media2}/main.png`,
                        },
                    },
                    makeFooterWidget(),
                ],
            });

            await publish(page.pageId, ctx);

            expect(deleteMedia).not.toHaveBeenCalledWith(media1);
            expect(deleteMedia).not.toHaveBeenCalledWith(media2);
        });

        it("deletes old socialImage when replaced during publish", async () => {
            const page = await PageModel.create({
                domain: ctx.subdomain._id,
                pageId: "publish-replaces-social",
                type: constants.site,
                creatorId: "creator-1",
                name: "Publish Replaces Social",
                layout: [],
                draftLayout: [],
                socialImage: mediaObj1,
                draftSocialImage: mediaObj2,
            });

            await publish(page.pageId, ctx);

            expect(deleteMedia).toHaveBeenCalledWith(media1);
            expect(deleteMedia).not.toHaveBeenCalledWith(media2);
        });

        it("does NOT delete socialImage if it still exists in draftLayout", async () => {
            const page = await PageModel.create({
                domain: ctx.subdomain._id,
                pageId: "publish-social-in-layout",
                type: constants.site,
                creatorId: "creator-1",
                name: "Publish Social In Layout",
                layout: [],
                draftLayout: [
                    makeHeaderWidget(),
                    {
                        widgetId: "w1",
                        name: "hero",
                        settings: {
                            image: `https://cdn.test/${media1}/main.png`,
                        },
                    },
                    makeFooterWidget(),
                ],
                socialImage: mediaObj1,
                draftSocialImage: undefined,
            });

            await publish(page.pageId, ctx);

            expect(deleteMedia).not.toHaveBeenCalledWith(media1);
        });

        it("handles publishing with empty draftLayout - media is deleted", async () => {
            // Note: When draftLayout is empty, the layout is NOT copied (checked via `if (page.draftLayout.length)`)
            // However, the media diff computation still happens: currentPublished - nextPublished
            // With empty draftLayout, nextPublishedMedia is empty, so ALL currentPublishedMedia is deleted
            const page = await PageModel.create({
                domain: ctx.subdomain._id,
                pageId: "publish-empty-layouts",
                type: constants.site,
                creatorId: "creator-1",
                name: "Publish Empty Layouts",
                layout: [
                    makeHeaderWidget(),
                    {
                        widgetId: "w1",
                        name: "hero",
                        settings: {
                            image: `https://cdn.test/${media1}/main.png`,
                        },
                    },
                    makeFooterWidget(),
                ],
                draftLayout: [],
            });

            await publish(page.pageId, ctx);

            // Media IS deleted because the diff is: {media1} - {} = {media1}
            expect(deleteMedia).toHaveBeenCalledWith(media1);
        });

        it("deletes multiple media removed during publish", async () => {
            const page = await PageModel.create({
                domain: ctx.subdomain._id,
                pageId: "publish-removes-multiple",
                type: constants.site,
                creatorId: "creator-1",
                name: "Publish Removes Multiple",
                layout: [
                    makeHeaderWidget(),
                    {
                        widgetId: "w1",
                        name: "hero",
                        settings: {
                            image: `https://cdn.test/${media1}/main.png`,
                        },
                    },
                    {
                        widgetId: "w2",
                        name: "banner",
                        settings: {
                            image: `https://cdn.test/${media2}/main.png`,
                        },
                    },
                    makeFooterWidget(),
                ],
                draftLayout: [
                    makeHeaderWidget(),
                    {
                        widgetId: "w3",
                        name: "cta",
                        settings: {
                            image: `https://cdn.test/${media3}/main.png`,
                        },
                    },
                    makeFooterWidget(),
                ],
            });

            await publish(page.pageId, ctx);

            expect(deleteMedia).toHaveBeenCalledWith(media1);
            expect(deleteMedia).toHaveBeenCalledWith(media2);
            expect(deleteMedia).not.toHaveBeenCalledWith(media3);
        });
    });

    describe("edge cases", () => {
        it("handles widget with no media settings", async () => {
            const page = await PageModel.create({
                domain: ctx.subdomain._id,
                pageId: "no-media-widget",
                type: constants.site,
                creatorId: "creator-1",
                name: "No Media Widget",
                layout: [makeHeaderWidget(), makeFooterWidget()],
                draftLayout: [
                    makeHeaderWidget(),
                    {
                        widgetId: "text-widget",
                        name: "text",
                        settings: { content: "Hello world" },
                    },
                    makeFooterWidget(),
                ],
            });

            await updatePage({
                context: ctx,
                pageId: page.pageId,
                layout: JSON.stringify([
                    makeHeaderWidget(),
                    makeFooterWidget(),
                ]),
            });

            expect(deleteMedia).not.toHaveBeenCalled();
        });

        it("handles media URL with different file extensions", async () => {
            const page = await PageModel.create({
                domain: ctx.subdomain._id,
                pageId: "media-extensions",
                type: constants.site,
                creatorId: "creator-1",
                name: "Media Extensions",
                layout: [makeHeaderWidget(), makeFooterWidget()],
                draftLayout: [
                    makeHeaderWidget(),
                    {
                        widgetId: "w1",
                        name: "video",
                        settings: {
                            src: `https://cdn.test/${media1}/main.mp4`,
                        },
                    },
                    {
                        widgetId: "w2",
                        name: "image",
                        settings: {
                            src: `https://cdn.test/${media2}/main.webp`,
                        },
                    },
                    makeFooterWidget(),
                ],
            });

            await updatePage({
                context: ctx,
                pageId: page.pageId,
                layout: JSON.stringify([
                    makeHeaderWidget(),
                    makeFooterWidget(),
                ]),
            });

            expect(deleteMedia).toHaveBeenCalledWith(media1);
            expect(deleteMedia).toHaveBeenCalledWith(media2);
        });

        it("does not crash when draftLayout is empty array", async () => {
            const page = await PageModel.create({
                domain: ctx.subdomain._id,
                pageId: "empty-draft-layout",
                type: constants.site,
                creatorId: "creator-1",
                name: "Empty Draft Layout",
                layout: [makeHeaderWidget(), makeFooterWidget()],
                draftLayout: [],
            });

            await expect(
                updatePage({
                    context: ctx,
                    pageId: page.pageId,
                    layout: JSON.stringify([
                        makeHeaderWidget(),
                        {
                            widgetId: "w1",
                            name: "hero",
                            settings: {
                                image: `https://cdn.test/${media1}/main.png`,
                            },
                        },
                        makeFooterWidget(),
                    ]),
                }),
            ).resolves.toBeDefined();

            expect(deleteMedia).not.toHaveBeenCalled();
        });

        it("correctly identifies media IDs from complex URLs", async () => {
            const complexMediaId = "abc123def456";
            const page = await PageModel.create({
                domain: ctx.subdomain._id,
                pageId: "complex-url",
                type: constants.site,
                creatorId: "creator-1",
                name: "Complex URL",
                layout: [makeHeaderWidget(), makeFooterWidget()],
                draftLayout: [
                    makeHeaderWidget(),
                    {
                        widgetId: "w1",
                        name: "hero",
                        settings: {
                            image: `https://cdn.example.com/uploads/${complexMediaId}/main.jpg`,
                        },
                    },
                    makeFooterWidget(),
                ],
            });

            await updatePage({
                context: ctx,
                pageId: page.pageId,
                layout: JSON.stringify([
                    makeHeaderWidget(),
                    makeFooterWidget(),
                ]),
            });

            expect(deleteMedia).toHaveBeenCalledWith(complexMediaId);
        });
    });
});
