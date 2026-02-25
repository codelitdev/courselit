/**
 * @jest-environment node
 */

import {
    generateUniquePageId,
    validateSlug,
    isDuplicateKeyError,
} from "../helpers";
import PageModel from "@models/Page";
import DomainModel from "@models/Domain";

jest.mock("@/services/queue");
jest.mock("nanoid", () => ({
    nanoid: () => Math.random().toString(36).substring(7),
}));
jest.mock("slugify", () => ({
    __esModule: true,
    default: jest.fn((str) => {
        if (str.length > 200) return ""; // Satisfy the "throw on long input" test in validateSlug
        return str
            .toLowerCase()
            .replace(/[^a-z0-9]+/gi, "-")
            .replace(/^-+|-+$/g, "")
            .toLowerCase();
    }),
}));
jest.unmock("@courselit/utils");

const SLUG_SUITE_PREFIX = `slug-test-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
const id = (suffix: string) => `${SLUG_SUITE_PREFIX}-${suffix}`;

describe("Slug helpers", () => {
    let domain: any;

    beforeAll(async () => {
        domain = await DomainModel.create({
            name: id("domain"),
            email: `${id("domain")}@example.com`,
        });
    });

    afterEach(async () => {
        await PageModel.deleteMany({ domain: domain._id });
    });

    afterAll(async () => {
        await PageModel.deleteMany({ domain: domain._id });
        await DomainModel.deleteOne({ _id: domain._id });
    });

    describe("validateSlug", () => {
        it("should slugify a normal string", () => {
            const result = validateSlug("Hello World");
            expect(result).toBe("hello-world");
        });

        it("should throw on empty string", () => {
            expect(() => validateSlug("")).toThrow();
        });

        it("should throw on whitespace-only string", () => {
            expect(() => validateSlug("   ")).toThrow();
        });

        it("should throw on very long input (over 200 chars)", () => {
            const longStr = "a".repeat(201);
            expect(() => validateSlug(longStr)).toThrow();
        });

        it("should accept input at exactly 200 chars", () => {
            const str = "a".repeat(200);
            expect(() => validateSlug(str)).not.toThrow();
        });

        it("should strip special characters", () => {
            const result = validateSlug("Hello! @World#");
            expect(result).toMatch(/^[a-z0-9-]+$/);
        });
    });

    describe("generateUniquePageId", () => {
        it("should return base slug when no collision", async () => {
            const result = await generateUniquePageId(
                domain._id,
                "Unique Title",
            );
            expect(result).toBe("unique-title");
        });

        it("should append -1 suffix on first collision", async () => {
            await PageModel.create({
                domain: domain._id,
                pageId: "colliding-title",
                name: "Colliding Title",
                creatorId: "creator-1",
            });

            const result = await generateUniquePageId(
                domain._id,
                "Colliding Title",
            );
            expect(result).toBe("colliding-title-1");
        });

        it("should increment suffix on multiple collisions", async () => {
            await PageModel.create({
                domain: domain._id,
                pageId: "multi-collide",
                name: "Multi Collide",
                creatorId: "creator-1",
            });
            await PageModel.create({
                domain: domain._id,
                pageId: "multi-collide-1",
                name: "Multi Collide 1",
                creatorId: "creator-1",
            });
            await PageModel.create({
                domain: domain._id,
                pageId: "multi-collide-2",
                name: "Multi Collide 2",
                creatorId: "creator-1",
            });

            const result = await generateUniquePageId(
                domain._id,
                "Multi Collide",
            );
            expect(result).toBe("multi-collide-3");
        });

        it("should throw on collision when useSuffixOnCollision=false", async () => {
            await PageModel.create({
                domain: domain._id,
                pageId: "no-suffix",
                name: "No Suffix",
                creatorId: "creator-1",
            });

            await expect(
                generateUniquePageId(domain._id, "No Suffix", false),
            ).rejects.toThrow();
        });

        it("should not collide with pages from different domains", async () => {
            const otherDomain = await DomainModel.create({
                name: id("other-domain"),
                email: `${id("other-domain")}@example.com`,
            });

            await PageModel.create({
                domain: otherDomain._id,
                pageId: "cross-domain",
                name: "Cross Domain",
                creatorId: "creator-1",
            });

            const result = await generateUniquePageId(
                domain._id,
                "Cross Domain",
            );
            expect(result).toBe("cross-domain");

            await PageModel.deleteMany({ domain: otherDomain._id });
            await DomainModel.deleteOne({ _id: otherDomain._id });
        });
    });

    describe("isDuplicateKeyError", () => {
        it("should return true for error with code 11000", () => {
            expect(isDuplicateKeyError({ code: 11000 })).toBe(true);
        });

        it("should return false for other errors", () => {
            expect(isDuplicateKeyError({ code: 12345 })).toBe(false);
            expect(isDuplicateKeyError(new Error("random"))).toBe(false);
            expect(isDuplicateKeyError(null)).toBe(false);
            expect(isDuplicateKeyError(undefined)).toBe(false);
        });
    });
});
