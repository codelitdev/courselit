/**
 * @jest-environment node
 */

jest.mock("@/app/actions", () => ({
    getBackendAddress: jest.fn(),
}));

jest.mock(
    "@/async-local-storage",
    () => ({
        als: {
            run: jest.fn((_: unknown, fn: () => unknown) => fn()),
        },
    }),
    { virtual: true },
);

jest.mock("@/auth", () => ({
    auth: {},
}));

jest.mock("better-auth/next-js", () => ({
    toNextJsHandler: () => ({
        GET: jest.fn(),
        POST: jest.fn(),
    }),
}));

import { getBackendAddress } from "@/app/actions";
import { rewriteAuthRequestOrigin } from "../[...all]/route";

describe("Auth Route Origin Rewrite", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("rewrites auth requests to the forwarded school origin", async () => {
        (getBackendAddress as jest.Mock).mockResolvedValue(
            "https://domain1.clqa.site",
        );

        const req = new Request(
            "http://0.0.0.0:3000/api/auth/sso/callback/google?foo=bar",
            {
                headers: {
                    host: "0.0.0.0:3000",
                    "x-forwarded-host": "domain1.clqa.site",
                    "x-forwarded-proto": "https",
                    domain: "domain1",
                    domainId: "domain-id-1",
                },
            },
        );

        const rewritten = await rewriteAuthRequestOrigin(req);

        expect(rewritten).not.toBe(req);
        expect(rewritten.url).toBe(
            "https://domain1.clqa.site/api/auth/sso/callback/google?foo=bar",
        );
        expect(rewritten.headers.get("domain")).toBe("domain1");
        expect(rewritten.headers.get("domainId")).toBe("domain-id-1");
    });

    it("returns the original request when the origin already matches", async () => {
        (getBackendAddress as jest.Mock).mockResolvedValue(
            "https://domain1.clqa.site",
        );

        const req = new Request(
            "https://domain1.clqa.site/api/auth/sso/callback/google",
        );

        const rewritten = await rewriteAuthRequestOrigin(req);

        expect(rewritten).toBe(req);
    });

    it("preserves method, body, and headers for post requests", async () => {
        (getBackendAddress as jest.Mock).mockResolvedValue(
            "https://domain1.clqa.site",
        );

        const req = new Request("http://0.0.0.0:3000/api/auth/sign-in/sso", {
            method: "POST",
            headers: {
                "content-type": "application/json",
                domain: "domain1",
                domainId: "domain-id-1",
            },
            body: JSON.stringify({
                providerId: "google",
                callbackURL: "/checkout?id=123",
            }),
        });

        const rewritten = await rewriteAuthRequestOrigin(req);

        expect(rewritten.method).toBe("POST");
        expect(rewritten.url).toBe(
            "https://domain1.clqa.site/api/auth/sign-in/sso",
        );
        expect(rewritten.headers.get("content-type")).toBe("application/json");
        expect(rewritten.headers.get("domainId")).toBe("domain-id-1");
        await expect(rewritten.text()).resolves.toBe(
            JSON.stringify({
                providerId: "google",
                callbackURL: "/checkout?id=123",
            }),
        );
    });
});
