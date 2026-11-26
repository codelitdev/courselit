/**
 * @jest-environment node
 */

import { NextRequest } from "next/server";
import { getBackendAddress } from "@/app/actions";
import { getAuth } from "@/auth";
import { proxy } from "../proxy";

jest.mock("@/app/actions", () => ({
    getBackendAddress: jest.fn(),
}));
jest.mock("@/auth", () => ({
    auth: {
        api: {
            getSession: jest.fn(),
        },
    },
    getAuth: jest.fn(),
}));

const mockVerifyDomain = () => {
    global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
            domain: "courselit.example",
            domainId: "domain-id",
            domainEmail: "admin@courselit.example",
            domainTitle: "CourseLit",
        }),
    }) as jest.Mock;
};

describe("proxy inbound-email bypass", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("does not derive a tenant from the webhook host", async () => {
        const response = await proxy(
            new NextRequest(
                "https://courselit.example/api/inbound-email/postmark",
            ),
        );

        expect(getBackendAddress).not.toHaveBeenCalled();
        expect(response.headers.get("x-middleware-next")).toBe("1");
    });
});

describe("proxy dashboard session guard", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockVerifyDomain();
        (getBackendAddress as jest.Mock).mockResolvedValue(
            "https://courselit.example",
        );
    });

    it("validates the session with the per-origin auth instance", async () => {
        // Mirrors the production failure from
        // https://github.com/codelitdev/courselit/issues/919:
        // the session cookie is minted by the per-origin auth instance, so
        // the baseURL-less singleton cannot read it and returns null.
        const validSession = {
            user: { email: "admin@courselit.example" },
            session: { id: "session-id" },
        };
        const perOriginGetSession = jest.fn().mockResolvedValue(validSession);
        (getAuth as jest.Mock).mockReturnValue({
            api: { getSession: perOriginGetSession },
        });

        const response = await proxy(
            new NextRequest("https://courselit.example/dashboard"),
        );

        expect(getAuth).toHaveBeenCalledWith("https://courselit.example");
        expect(response.headers.get("x-middleware-next")).toBe("1");
        expect(response.headers.get("location")).toBeNull();
    });

    it("redirects to /login when the session is invalid", async () => {
        const perOriginGetSession = jest.fn().mockResolvedValue(null);
        (getAuth as jest.Mock).mockReturnValue({
            api: { getSession: perOriginGetSession },
        });

        const response = await proxy(
            new NextRequest("https://courselit.example/dashboard"),
        );

        expect(response.headers.get("location")).toContain("/login?redirect=");
    });
});
