/**
 * @jest-environment node
 */

import { createCommunity, updateCommunity } from "../logic";
import CommunityModel from "@models/Community";
import MembershipModel from "@models/Membership";
import PaymentPlanModel from "@models/PaymentPlan";
import PageModel from "@models/Page";
import DomainModel from "@models/Domain";
import UserModel from "@models/User";
import constants from "@/config/constants";
import { Constants } from "@courselit/common-models";

jest.mock("@/services/queue");
jest.mock("nanoid", () => ({
    nanoid: () => Math.random().toString(36).substring(7),
}));
jest.mock("slugify", () => ({
    __esModule: true,
    default: jest.fn((str) =>
        str
            .toLowerCase()
            .replace(/[^a-z0-9]+/gi, "-")
            .replace(/^-+|-+$/g, "")
            .toLowerCase(),
    ),
}));
jest.unmock("@courselit/utils");

const SLUG_SUITE_PREFIX = `comm-slug-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
const id = (suffix: string) => `${SLUG_SUITE_PREFIX}-${suffix}`;
const email = (suffix: string) => `${suffix}-${SLUG_SUITE_PREFIX}@example.com`;

describe("Community Slug Tests", () => {
    let domain: any;
    let adminUser: any;
    let mockCtx: any;

    beforeAll(async () => {
        domain = await DomainModel.create({
            name: id("domain"),
            email: email("domain"),
        });

        adminUser = await UserModel.create({
            domain: domain._id,
            userId: id("admin"),
            email: email("admin"),
            name: "Admin",
            permissions: [constants.permissions.manageCommunity],
            active: true,
            unsubscribeToken: id("unsub-admin"),
        });

        // Internal payment plan (required by createCommunity)
        await PaymentPlanModel.create({
            domain: domain._id,
            planId: id("internal-plan"),
            userId: adminUser.userId,
            entityId: "internal",
            entityType: Constants.MembershipEntityType.COURSE,
            type: "free",
            name: constants.internalPaymentPlanName,
            internal: true,
            interval: "monthly",
            cost: 0,
            currencyISOCode: "USD",
        });

        mockCtx = {
            user: adminUser,
            subdomain: domain,
        } as any;
    });

    afterEach(async () => {
        await CommunityModel.deleteMany({ domain: domain._id });
        await MembershipModel.deleteMany({ domain: domain._id });
        await PageModel.deleteMany({ domain: domain._id });
        await PaymentPlanModel.deleteMany({
            domain: domain._id,
            planId: { $ne: id("internal-plan") },
        });
    });

    afterAll(async () => {
        await PaymentPlanModel.deleteMany({ domain: domain._id });
        await UserModel.deleteMany({ domain: domain._id });
        await DomainModel.deleteOne({ _id: domain._id });
    });

    describe("createCommunity", () => {
        it("should generate slug matching pageId", async () => {
            const result = await createCommunity({
                name: "My Test Community",
                ctx: mockCtx,
            });

            expect(result.slug).toBe("my-test-community");

            const community = await CommunityModel.findOne({
                communityId: result.communityId,
            });
            expect(community?.slug).toBe(community?.pageId);
        });

        it("should auto-suffix slug when name collides", async () => {
            const first = await createCommunity({
                name: "Duplicate Name",
                ctx: mockCtx,
            });
            expect(first.slug).toBe("duplicate-name");

            // Delete the first community so the name uniqueness check passes,
            // but leave the Page so the slug collides
            await CommunityModel.deleteMany({ domain: domain._id });
            await MembershipModel.deleteMany({ domain: domain._id });

            const second = await createCommunity({
                name: "Duplicate Name",
                ctx: mockCtx,
            });
            expect(second.slug).toBe("duplicate-name-1");
        });
    });

    describe("updateCommunity slug", () => {
        it("should update slug and sync with Page", async () => {
            const created = await createCommunity({
                name: "Slug Update Test",
                ctx: mockCtx,
            });

            const updated = await updateCommunity({
                id: created.communityId,
                slug: "new-custom-slug",
                ctx: mockCtx,
            });

            expect(updated.slug).toBe("new-custom-slug");

            const community = await CommunityModel.findOne({
                communityId: created.communityId,
            });
            expect(community?.slug).toBe("new-custom-slug");
            expect(community?.pageId).toBe("new-custom-slug");

            const page = await PageModel.findOne({
                entityId: created.communityId,
                domain: domain._id,
            });
            expect(page?.pageId).toBe("new-custom-slug");
        });

        it("should reject duplicate slug with friendly error", async () => {
            const comm1 = await createCommunity({
                name: "Community One",
                ctx: mockCtx,
            });

            await createCommunity({
                name: "Community Two",
                ctx: mockCtx,
            });

            // Try to change comm1's slug to comm2's slug
            await expect(
                updateCommunity({
                    id: comm1.communityId,
                    slug: "community-two",
                    ctx: mockCtx,
                }),
            ).rejects.toThrow("slug is already in use");
        });

        it("should not change slug when same slug is submitted", async () => {
            const created = await createCommunity({
                name: "Same Slug Community",
                ctx: mockCtx,
            });

            const updated = await updateCommunity({
                id: created.communityId,
                slug: "same-slug-community",
                ctx: mockCtx,
            });

            // Should succeed without error
            expect(updated.slug).toBe("same-slug-community");
        });

        it("should validate slug format", async () => {
            const created = await createCommunity({
                name: "Format Test",
                ctx: mockCtx,
            });

            await expect(
                updateCommunity({
                    id: created.communityId,
                    slug: "a".repeat(201),
                    ctx: mockCtx,
                }),
            ).rejects.toThrow();
        });
    });
});
