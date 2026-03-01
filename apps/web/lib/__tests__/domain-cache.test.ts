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
import { getDomainFromHost } from "../domain-cache";

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
