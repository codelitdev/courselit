/**
 * @jest-environment node
 */

import { NextRequest } from "next/server";
import { getBackendAddress } from "@/app/actions";
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
}));

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
