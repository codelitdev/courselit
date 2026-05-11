/**
 * @jest-environment node
 */

import { NextRequest } from "next/server";
import Domain from "@models/Domain";
import ApiKey from "@models/ApiKey";
import User from "@models/User";
import PaymentPlanModel from "@models/PaymentPlan";
import {
    deleteCourse,
    getCourseOrThrow,
    updateCourse,
} from "@/graphql/courses/logic";

jest.mock("@models/Domain");
jest.mock("@models/ApiKey");
jest.mock("@models/User");
jest.mock("@/graphql/courses/logic", () => ({
    deleteCourse: jest.fn(),
    getCourseOrThrow: jest.fn(),
    updateCourse: jest.fn(),
}));
jest.mock("@models/PaymentPlan");

const domain = {
    _id: "domain-id",
    name: "school",
};

const request = {
    headers: {
        get: jest.fn((name: string) => {
            if (name === "domain") return "school";
            if (name === "x-api-key") return "api-key";
            return null;
        }),
    },
} as unknown as NextRequest;

describe("GET /api/products/{productId}", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (Domain.findOne as jest.Mock).mockResolvedValue(domain);
        (ApiKey.findOne as jest.Mock).mockResolvedValue({ key: "api-key" });
        (User.findOne as jest.Mock).mockResolvedValue({
            userId: "owner",
            email: "owner@example.com",
            permissions: ["course:manage_any", "course:publish"],
        });
        (PaymentPlanModel.find as jest.Mock).mockReturnValue({
            lean: jest.fn().mockResolvedValue([]),
        });
    });

    it("updates product metadata through existing product logic", async () => {
        (updateCourse as jest.Mock).mockResolvedValue({
            courseId: "download-1",
            type: "download",
            title: "Updated Download",
            slug: "updated-download",
            published: false,
            privacy: "unlisted",
            tags: ["new"],
            pageId: "updated-download",
            createdAt: new Date("2026-01-01T00:00:00.000Z"),
            updatedAt: new Date("2026-01-03T00:00:00.000Z"),
        });

        const { PATCH } = await import("../route");
        const response = await PATCH(
            {
                ...request,
                json: jest.fn().mockResolvedValue({
                    title: "Updated Download",
                    tags: ["new"],
                }),
            } as unknown as NextRequest,
            {
                params: Promise.resolve({ productId: "download-1" }),
            },
        );

        expect(response.status).toBe(200);
        expect(updateCourse).toHaveBeenCalledWith(
            {
                id: "download-1",
                title: "Updated Download",
                tags: ["new"],
            },
            expect.objectContaining({
                subdomain: domain,
                user: expect.objectContaining({ userId: "owner" }),
            }),
        );
        const body = await response.json();
        expect(body).toMatchObject({
            productId: "download-1",
            title: "Updated Download",
            tags: ["new"],
        });
    });

    it("updates a blog title without adding hidden fields", async () => {
        (updateCourse as jest.Mock).mockResolvedValue({
            courseId: "blog-1",
            type: "blog",
            title: "Updated Blog",
            slug: "updated-blog",
            published: false,
            privacy: "unlisted",
            createdAt: new Date("2026-01-01T00:00:00.000Z"),
            updatedAt: new Date("2026-01-03T00:00:00.000Z"),
        });

        const { PATCH } = await import("../route");
        const response = await PATCH(
            {
                ...request,
                json: jest.fn().mockResolvedValue({
                    title: "Updated Blog",
                }),
            } as unknown as NextRequest,
            {
                params: Promise.resolve({ productId: "blog-1" }),
            },
        );

        expect(response.status).toBe(200);
        expect(updateCourse).toHaveBeenCalledWith(
            {
                id: "blog-1",
                title: "Updated Blog",
            },
            expect.objectContaining({
                subdomain: domain,
                user: expect.objectContaining({ userId: "owner" }),
            }),
        );
        const body = await response.json();
        expect(body).toMatchObject({
            productId: "blog-1",
            type: "blog",
            title: "Updated Blog",
        });
        expect(body).not.toHaveProperty("description");
    });

    it("returns bad request when the update body is not valid JSON", async () => {
        const { PATCH } = await import("../route");
        const response = await PATCH(
            {
                ...request,
                json: jest.fn().mockRejectedValue(new SyntaxError("bad json")),
            } as unknown as NextRequest,
            {
                params: Promise.resolve({ productId: "blog-1" }),
            },
        );

        expect(response.status).toBe(400);
        expect(updateCourse).not.toHaveBeenCalled();
        await expect(response.json()).resolves.toEqual({
            error: {
                code: "bad_request",
                message: "Invalid JSON body",
            },
        });
    });

    it("returns bad request when the update body is not a JSON object", async () => {
        const { PATCH } = await import("../route");
        const response = await PATCH(
            {
                ...request,
                json: jest.fn().mockResolvedValue("not an object"),
            } as unknown as NextRequest,
            {
                params: Promise.resolve({ productId: "blog-1" }),
            },
        );

        expect(response.status).toBe(400);
        expect(updateCourse).not.toHaveBeenCalled();
        await expect(response.json()).resolves.toEqual({
            error: {
                code: "bad_request",
                message: "Request body must be a JSON object",
            },
        });
    });

    it("deletes a product through existing product logic", async () => {
        (deleteCourse as jest.Mock).mockResolvedValue({
            courseId: "download-1",
        });

        const { DELETE } = await import("../route");
        const response = await DELETE(request, {
            params: Promise.resolve({ productId: "download-1" }),
        });

        expect(response.status).toBe(200);
        expect(deleteCourse).toHaveBeenCalledWith(
            "download-1",
            expect.objectContaining({
                subdomain: domain,
                user: expect.objectContaining({ userId: "owner" }),
            }),
        );
        await expect(response.json()).resolves.toEqual({ ok: true });
    });

    it("fetches a single product for the authenticated school", async () => {
        (getCourseOrThrow as jest.Mock).mockResolvedValue({
            courseId: "download-1",
            type: "download",
            title: "Download One",
            slug: "download-one",
            published: true,
            privacy: "public",
            tags: [],
            pageId: "download-one",
            cost: 0,
            costType: "free",
            leadMagnet: true,
            certificate: true,
            createdAt: new Date("2026-01-01T00:00:00.000Z"),
            updatedAt: new Date("2026-01-02T00:00:00.000Z"),
        });

        const { GET } = await import("../route");
        const response = await GET(request, {
            params: Promise.resolve({ productId: "download-1" }),
        });

        expect(response.status).toBe(200);
        expect(getCourseOrThrow).toHaveBeenCalledWith(
            undefined,
            expect.objectContaining({ subdomain: domain }),
            "download-1",
        );
        const body = await response.json();
        expect(body).toMatchObject({
            productId: "download-1",
            type: "download",
            title: "Download One",
            slug: "download-one",
            published: true,
            privacy: "public",
            pageId: "download-one",
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-02T00:00:00.000Z",
        });
        expect(body).not.toHaveProperty("cost");
        expect(body).not.toHaveProperty("costType");
        expect(body).not.toHaveProperty("leadMagnet");
        expect(body).not.toHaveProperty("certificate");
    });

    it("returns not found when the product does not belong to the school", async () => {
        (getCourseOrThrow as jest.Mock).mockRejectedValue(
            new Error("Product not found"),
        );

        const { GET } = await import("../route");
        const response = await GET(request, {
            params: Promise.resolve({ productId: "missing" }),
        });

        expect(response.status).toBe(404);
        await expect(response.json()).resolves.toEqual({
            error: {
                code: "not_found",
                message: "Product not found",
            },
        });
    });
});
