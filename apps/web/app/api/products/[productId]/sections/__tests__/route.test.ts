/**
 * @jest-environment node
 */

import { NextRequest } from "next/server";
import Domain from "@models/Domain";
import ApiKey from "@models/ApiKey";
import User from "@models/User";
import {
    addGroup,
    getCourseOrThrow,
    reorderGroups,
} from "@/graphql/courses/logic";

jest.mock("@models/Domain");
jest.mock("@models/ApiKey");
jest.mock("@models/User");
jest.mock("@/graphql/courses/logic", () => ({
    addGroup: jest.fn(),
    getCourseOrThrow: jest.fn(),
    reorderGroups: jest.fn(),
}));

const domain = {
    _id: "domain-id",
    name: "school",
};

const request = (body?: Record<string, unknown>) =>
    ({
        url: "https://school.test/api/products/course-1/sections",
        json: jest.fn().mockResolvedValue(body ?? {}),
        headers: {
            get: jest.fn((name: string) => {
                if (name === "domain") return "school";
                if (name === "x-api-key") return "api-key";
                return null;
            }),
        },
    }) as unknown as NextRequest;

describe("/api/products/{productId}/sections", () => {
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

    it("lists sections from the existing product model", async () => {
        (getCourseOrThrow as jest.Mock).mockResolvedValue({
            courseId: "course-1",
            groups: [
                {
                    _id: "group-1",
                    id: "group-1",
                    name: "Start",
                    rank: 1000,
                    collapsed: false,
                    lessonsOrder: ["lesson-1"],
                },
            ],
        });

        const { GET } = await import("../route");
        const response = await GET(request(), {
            params: Promise.resolve({ productId: "course-1" }),
        });

        expect(response.status).toBe(200);
        expect(getCourseOrThrow).toHaveBeenCalledWith(
            undefined,
            expect.objectContaining({ subdomain: domain }),
            "course-1",
        );
        await expect(response.json()).resolves.toEqual({
            data: [
                {
                    sectionId: "group-1",
                    name: "Start",
                    rank: 1000,
                    collapsed: false,
                    lessonsOrder: ["lesson-1"],
                },
            ],
        });
    });

    it("creates a section through existing course group logic", async () => {
        (addGroup as jest.Mock).mockResolvedValue({
            groups: [{ _id: "group-1", name: "Start", rank: 1000 }],
        });

        const { POST } = await import("../route");
        const response = await POST(request({ name: "Start" }), {
            params: Promise.resolve({ productId: "course-1" }),
        });

        expect(response.status).toBe(201);
        expect(addGroup).toHaveBeenCalledWith({
            id: "course-1",
            name: "Start",
            collapsed: false,
            ctx: expect.objectContaining({ subdomain: domain }),
        });
        await expect(response.json()).resolves.toMatchObject({
            sectionId: "group-1",
            name: "Start",
        });
    });

    it("returns bad request instead of 500 when section create JSON is invalid", async () => {
        const { POST } = await import("../route");
        const response = await POST(
            {
                ...request(),
                json: jest.fn().mockRejectedValue(new SyntaxError("bad json")),
            } as unknown as NextRequest,
            {
                params: Promise.resolve({ productId: "course-1" }),
            },
        );

        expect(response.status).toBe(400);
        expect(addGroup).not.toHaveBeenCalled();
        await expect(response.json()).resolves.toEqual({
            error: {
                code: "bad_request",
                message: "Invalid JSON body",
            },
        });
    });

    it("returns not found when section creation does not match a product", async () => {
        (addGroup as jest.Mock).mockResolvedValue(null);

        const { POST } = await import("../route");
        const response = await POST(request({ name: "Missing product" }), {
            params: Promise.resolve({ productId: "course-1" }),
        });

        expect(response.status).toBe(404);
        await expect(response.json()).resolves.toEqual({
            error: {
                code: "not_found",
                message: "Product not found",
            },
        });
    });

    it("rejects section creation fields that are not part of the existing new-section form", async () => {
        const { POST } = await import("../route");
        const response = await POST(
            request({
                name: "Start",
                collapsed: true,
            }),
            {
                params: Promise.resolve({ productId: "course-1" }),
            },
        );

        expect(response.status).toBe(400);
        expect(addGroup).not.toHaveBeenCalled();
        await expect(response.json()).resolves.toEqual({
            error: {
                code: "bad_request",
                message: "Unsupported section field: collapsed",
            },
        });
    });

    it("reorders sections through existing course group logic", async () => {
        const { POST } = await import("../reorder/route");
        const response = await POST(
            request({ sectionIds: ["group-2", "group-1"] }),
            {
                params: Promise.resolve({ productId: "course-1" }),
            },
        );

        expect(response.status).toBe(200);
        expect(reorderGroups).toHaveBeenCalledWith({
            courseId: "course-1",
            groupIds: ["group-2", "group-1"],
            ctx: expect.objectContaining({ subdomain: domain }),
        });
    });

    it("returns bad request instead of 500 when section reorder JSON is invalid", async () => {
        const { POST } = await import("../reorder/route");
        const response = await POST(
            {
                ...request(),
                json: jest.fn().mockRejectedValue(new SyntaxError("bad json")),
            } as unknown as NextRequest,
            {
                params: Promise.resolve({ productId: "course-1" }),
            },
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
