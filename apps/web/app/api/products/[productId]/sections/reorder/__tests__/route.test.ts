/**
 * @jest-environment node
 */

import { NextRequest } from "next/server";
import Domain from "@models/Domain";
import ApiKey from "@models/ApiKey";
import User from "@models/User";
import { reorderGroups } from "@/graphql/courses/logic";

jest.mock("@models/Domain");
jest.mock("@models/ApiKey");
jest.mock("@models/User");
jest.mock("@/graphql/courses/logic", () => ({
    reorderGroups: jest.fn(),
}));

const domain = {
    _id: "domain-id",
    name: "school",
};

const request = (body?: Record<string, unknown>) =>
    ({
        url: "https://school.test/api/products/course-1/sections/reorder",
        json: jest.fn().mockResolvedValue(body ?? {}),
        headers: {
            get: jest.fn((name: string) => {
                if (name === "domain") return "school";
                if (name === "x-api-key") return "api-key";
                return null;
            }),
        },
    }) as unknown as NextRequest;

describe("POST /api/products/{productId}/sections/reorder", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (Domain.findOne as jest.Mock).mockResolvedValue(domain);
        (ApiKey.findOne as jest.Mock).mockResolvedValue({ key: "api-key" });
        (User.findOne as jest.Mock).mockResolvedValue({
            userId: "owner",
            email: "owner@example.com",
            permissions: ["course:manage_any"],
        });
    });

    it("reorders sections through existing course group logic", async () => {
        (reorderGroups as jest.Mock).mockResolvedValue({ ok: true });

        const { POST } = await import("../route");
        const response = await POST(
            request({ sectionIds: ["group-2", "group-1"] }),
            { params: Promise.resolve({ productId: "course-1" }) },
        );

        expect(response.status).toBe(200);
        expect(reorderGroups).toHaveBeenCalledWith({
            courseId: "course-1",
            groupIds: ["group-2", "group-1"],
            ctx: expect.objectContaining({ subdomain: domain }),
        });
    });

    it("returns bad request instead of 500 when section reorder JSON is invalid", async () => {
        const { POST } = await import("../route");
        const response = await POST(
            {
                ...request(),
                json: jest.fn().mockRejectedValue(new SyntaxError("bad json")),
            } as unknown as NextRequest,
            { params: Promise.resolve({ productId: "course-1" }) },
        );

        expect(response.status).toBe(400);
        expect(reorderGroups).not.toHaveBeenCalled();
        await expect(response.json()).resolves.toEqual({
            error: {
                code: "bad_request",
                message: "Invalid JSON body",
            },
        });
    });
});
