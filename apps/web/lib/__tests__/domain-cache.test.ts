/**
 * @jest-environment node
 */

jest.mock("../../models/Domain", () => ({
    __esModule: true,
    default: {
        findOne: jest.fn(),
        hydrate: jest.fn((data: unknown) => data),
    },
}));

import DomainModel from "../../models/Domain";
import {
    cacheDomainByName,
    getCachedDomain,
    getDomainFromHost,
    invalidateDomainCache,
} from "../domain-cache";

describe("domain-cache host resolution", () => {
    const originalDomain = process.env.DOMAIN;
    const mockFindOne = (DomainModel as any).findOne as jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        process.env.DOMAIN = originalDomain;
    });

    it("resolves subdomain when DOMAIN includes port", async () => {
        process.env.DOMAIN = "localhost:3000";
        const school = { name: "innerevolution" };
        mockFindOne.mockResolvedValue(school);

        const domain = await getDomainFromHost("innerevolution.localhost:3000");

        expect(mockFindOne).toHaveBeenCalledWith({
            name: "innerevolution",
            deleted: false,
        });
        expect(domain).toBe(school);
    });

    it("uses custom-domain lookup when host is outside configured root domain", async () => {
        process.env.DOMAIN = "clqa.site";
        const school = { name: "domain1" };
        mockFindOne.mockResolvedValue(school);

        const domain = await getDomainFromHost("school.example.com");

        expect(mockFindOne).toHaveBeenCalledWith({
            customDomain: "school.example.com",
            deleted: false,
        });
        expect(domain).toBe(school);
    });
});

describe("domain-cache expiry", () => {
    const mockFindOne = (DomainModel as any).findOne as jest.Mock;

    beforeEach(() => {
        mockFindOne.mockReset();
        jest.useFakeTimers();
    });

    afterEach(() => {
        invalidateDomainCache("main");
        jest.useRealTimers();
    });

    it("reloads from the database after the TTL even when the entry is re-cached in between", async () => {
        mockFindOne.mockResolvedValueOnce({ name: "main", version: 1 });

        const first = await getCachedDomain("main");
        expect(first).toEqual({ name: "main", version: 1 });
        expect(mockFindOne).toHaveBeenCalledTimes(1);

        // A request 30 seconds later reads the cached copy and caches it again,
        // the way the verify-domain route does.
        jest.advanceTimersByTime(30_000);
        const cached = await getCachedDomain("main");
        cacheDomainByName(cached!);
        expect(mockFindOne).toHaveBeenCalledTimes(1);

        // 61 seconds after the first load the entry has expired, so the next
        // read picks up a change made directly in the database.
        jest.advanceTimersByTime(31_000);
        mockFindOne.mockResolvedValueOnce({ name: "main", version: 2 });

        const reloaded = await getCachedDomain("main");
        expect(mockFindOne).toHaveBeenCalledTimes(2);
        expect(reloaded).toEqual({ name: "main", version: 2 });
    });

    it("reloads from the database right after invalidation", async () => {
        mockFindOne.mockResolvedValueOnce({ name: "main", version: 1 });
        await getCachedDomain("main");

        invalidateDomainCache("main");
        mockFindOne.mockResolvedValueOnce({ name: "main", version: 2 });

        const reloaded = await getCachedDomain("main");
        expect(mockFindOne).toHaveBeenCalledTimes(2);
        expect(reloaded).toEqual({ name: "main", version: 2 });
    });
});
