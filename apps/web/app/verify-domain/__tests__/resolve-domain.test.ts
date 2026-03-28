/**
 * @jest-environment node
 */

import { resolveDomainFromHost } from "@/app/verify-domain/resolve-domain";
import { getCachedDomain, getDomainFromHost } from "@/lib/domain-cache";

jest.mock("@/lib/domain-cache", () => ({
    getCachedDomain: jest.fn(),
    getDomainFromHost: jest.fn(),
}));

describe("verify-domain resolution", () => {
    const mockGetCachedDomain = getCachedDomain as jest.Mock;
    const mockGetDomainFromHost = getDomainFromHost as jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("MULTITENANT=true resolves school by subdomain host", async () => {
        mockGetDomainFromHost.mockResolvedValue({ name: "domain1" });

        const domain = await resolveDomainFromHost({
            multitenant: true,
            host: "domain1.clqa.site",
            domainNameForSingleTenancy: "main",
        });

        expect(mockGetDomainFromHost).toHaveBeenCalledWith("domain1.clqa.site");
        expect(mockGetCachedDomain).not.toHaveBeenCalled();
        expect(domain?.name).toBe("domain1");
    });

    it("MULTITENANT=true resolves school by custom domain host", async () => {
        mockGetDomainFromHost.mockResolvedValue({ name: "domain1" });

        const domain = await resolveDomainFromHost({
            multitenant: true,
            host: "school.example.com",
            domainNameForSingleTenancy: "main",
        });

        expect(mockGetDomainFromHost).toHaveBeenCalledWith(
            "school.example.com",
        );
        expect(mockGetCachedDomain).not.toHaveBeenCalled();
        expect(domain?.name).toBe("domain1");
    });

    it("MULTITENANT=false resolves school by DOMAIN_NAME_FOR_SINGLE_TENANCY for custom domain access", async () => {
        mockGetCachedDomain.mockResolvedValue({ name: "main" });

        const domain = await resolveDomainFromHost({
            multitenant: false,
            host: "school.example.com",
            domainNameForSingleTenancy: "main",
        });

        expect(mockGetCachedDomain).toHaveBeenCalledWith("main");
        expect(mockGetDomainFromHost).not.toHaveBeenCalled();
        expect(domain?.name).toBe("main");
    });

    it("MULTITENANT=false resolves school by DOMAIN_NAME_FOR_SINGLE_TENANCY for IP access", async () => {
        mockGetCachedDomain.mockResolvedValue({ name: "main" });

        const domain = await resolveDomainFromHost({
            multitenant: false,
            host: "10.0.0.1",
            domainNameForSingleTenancy: "main",
        });

        expect(mockGetCachedDomain).toHaveBeenCalledWith("main");
        expect(mockGetDomainFromHost).not.toHaveBeenCalled();
        expect(domain?.name).toBe("main");
    });

    it("MULTITENANT=false resolves school by DOMAIN_NAME_FOR_SINGLE_TENANCY for IP:PORT access", async () => {
        mockGetCachedDomain.mockResolvedValue({ name: "main" });

        const domain = await resolveDomainFromHost({
            multitenant: false,
            host: "192.168.0.1:3000",
            domainNameForSingleTenancy: "main",
        });

        expect(mockGetCachedDomain).toHaveBeenCalledWith("main");
        expect(mockGetDomainFromHost).not.toHaveBeenCalled();
        expect(domain?.name).toBe("main");
    });
});
