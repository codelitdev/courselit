/**
 * @jest-environment node
 */

import { NextRequest } from "next/server";
import Domain from "@models/Domain";
import ApiKey from "@models/ApiKey";
import User from "@models/User";
import PaymentPlanModel from "@models/PaymentPlan";
import { createCourse, getProducts } from "@/graphql/courses/logic";

jest.mock("@models/Domain");
jest.mock("@models/ApiKey");
jest.mock("@models/User");
jest.mock("@/graphql/courses/logic", () => ({
    createCourse: jest.fn(),
    getProducts: jest.fn(),
}));
jest.mock("@models/PaymentPlan");

const domain = {
    _id: "domain-id",
    name: "school",
    email: "owner@example.com",
};

const makeRequest = (
    url = "https://school.test/api/products",
    body?: Record<string, unknown>,
) =>
    ({
        url,
        json: jest.fn().mockResolvedValue(body ?? {}),
        headers: {
            get: jest.fn((name: string) => {
                if (name === "domain") return "school";
                if (name === "x-api-key") return "api-key";
                return null;
            }),
        },
    }) as unknown as NextRequest;

describe("GET /api/products", () => {
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
            lean: jest.fn().mockResolvedValue([
                {
                    planId: "plan-free",
                    name: "Free",
                    type: "free",
                    entityId: "course-1",
                    entityType: "course",
                },
            ]),
        });
    });

    it("creates a draft product through existing product logic", async () => {
        (createCourse as jest.Mock).mockResolvedValue({
            courseId: "course-2",
            type: "course",
            title: "Course Two",
            slug: "course-two",
            published: false,
            privacy: "unlisted",
            tags: [],
            createdAt: new Date("2026-01-01T00:00:00.000Z"),
            updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        });

        const { POST } = await import("../route");
        const response = await POST(
            makeRequest("https://school.test/api/products", {
                title: "Course Two",
                type: "course",
            }),
        );

        expect(response.status).toBe(201);
        expect(createCourse).toHaveBeenCalledWith(
            { title: "Course Two", type: "course" },
            expect.objectContaining({
                subdomain: domain,
                user: expect.objectContaining({ userId: "owner" }),
            }),
        );
        const body = await response.json();
        expect(body).toMatchObject({
            productId: "course-2",
            title: "Course Two",
            type: "course",
        });
        expect(body).not.toHaveProperty("leadMagnet");
        expect(body).not.toHaveProperty("certificate");
        expect(body).not.toHaveProperty("cost");
        expect(body).not.toHaveProperty("costType");
    });

    it("rejects product create fields that are not part of the public API contract", async () => {
        const { POST } = await import("../route");
        const response = await POST(
            makeRequest("https://school.test/api/products", {
                title: "Course Two",
                type: "course",
                leadMagnet: true,
            }),
        );

        expect(response.status).toBe(400);
        expect(createCourse).not.toHaveBeenCalled();
        await expect(response.json()).resolves.toEqual({
            error: {
                code: "bad_request",
                message: "Unsupported product field: leadMagnet",
            },
        });
    });

    it("rejects bodies exceeding the public API body size limit", async () => {
        const { POST } = await import("../route");
        const response = await POST({
            url: "https://school.test/api/products",
            json: jest.fn(),
            headers: {
                get: jest.fn((name: string) => {
                    if (name === "domain") return "school";
                    if (name === "x-api-key") return "api-key";
                    if (name === "content-length") return "2097152";
                    return null;
                }),
            },
        } as unknown as NextRequest);

        expect(response.status).toBe(413);
        expect(createCourse).not.toHaveBeenCalled();
        await expect(response.json()).resolves.toEqual({
            error: {
                code: "bad_request",
                message: "Request body too large",
            },
        });
    });

    it("returns bad request instead of 500 when product create JSON is invalid", async () => {
        const { POST } = await import("../route");
        const response = await POST({
            ...makeRequest("https://school.test/api/products"),
            json: jest.fn().mockRejectedValue(new SyntaxError("bad json")),
        } as unknown as NextRequest);

        expect(response.status).toBe(400);
        expect(createCourse).not.toHaveBeenCalled();
        await expect(response.json()).resolves.toEqual({
            error: {
                code: "bad_request",
                message: "Invalid JSON body",
            },
        });
    });

    it("rejects publishing and privacy fields during draft product creation", async () => {
        const { POST } = await import("../route");
        const response = await POST(
            makeRequest("https://school.test/api/products", {
                title: "Course Two",
                type: "course",
                published: false,
            }),
        );

        expect(response.status).toBe(400);
        expect(createCourse).not.toHaveBeenCalled();
        await expect(response.json()).resolves.toEqual({
            error: {
                code: "bad_request",
                message: "Unsupported product field: published",
            },
        });

        const privacyResponse = await POST(
            makeRequest("https://school.test/api/products", {
                title: "Course Two",
                type: "course",
                privacy: "public",
            }),
        );

        expect(privacyResponse.status).toBe(400);
        expect(createCourse).not.toHaveBeenCalled();
        await expect(privacyResponse.json()).resolves.toEqual({
            error: {
                code: "bad_request",
                message: "Unsupported product field: privacy",
            },
        });
    });

    it("rejects product metadata fields that are only editable after draft creation", async () => {
        const { POST } = await import("../route");
        const response = await POST(
            makeRequest("https://school.test/api/products", {
                title: "Course Two",
                type: "course",
                slug: "course-two",
            }),
        );

        expect(response.status).toBe(400);
        expect(createCourse).not.toHaveBeenCalled();
        await expect(response.json()).resolves.toEqual({
            error: {
                code: "bad_request",
                message: "Unsupported product field: slug",
            },
        });
    });

    it("lists products for the authenticated school without exposing non-public fields", async () => {
        (getProducts as jest.Mock).mockResolvedValue([
            {
                courseId: "course-1",
                type: "course",
                title: "Course One",
                slug: "course-one",
                description: "Learn things",
                published: false,
                privacy: "unlisted",
                tags: ["ai"],
                featuredImage: { mediaId: "media-1" },
                pageId: "course-one",
                defaultPaymentPlan: "plan-free",
                cost: 99,
                costType: "paid",
                leadMagnet: true,
                certificate: true,
                createdAt: new Date("2026-01-01T00:00:00.000Z"),
                updatedAt: new Date("2026-01-02T00:00:00.000Z"),
            },
        ]);

        const { GET } = await import("../route");
        const response = await GET(makeRequest());

        expect(response.status).toBe(200);
        expect(User.findOne).toHaveBeenCalledWith({
            domain: domain._id,
            email: domain.email,
        });
        expect(getProducts).toHaveBeenCalledWith({
            ctx: expect.objectContaining({
                subdomain: domain,
                user: expect.objectContaining({ userId: "owner" }),
            }),
            page: 1,
            limit: 50,
            filterBy: undefined,
            published: undefined,
            searchText: undefined,
        });

        const body = await response.json();
        expect(body.data).toEqual([
            {
                productId: "course-1",
                type: "course",
                title: "Course One",
                slug: "course-one",
                description: "Learn things",
                published: false,
                privacy: "unlisted",
                tags: ["ai"],
                featuredImage: { mediaId: "media-1" },
                pageId: "course-one",
                defaultPaymentPlan: "plan-free",
                paymentPlans: [
                    {
                        planId: "plan-free",
                        name: "Free",
                        type: "free",
                        entityId: "course-1",
                        entityType: "course",
                        isDefault: true,
                    },
                ],
                createdAt: "2026-01-01T00:00:00.000Z",
                updatedAt: "2026-01-02T00:00:00.000Z",
            },
        ]);
        expect(body.data[0]).not.toHaveProperty("cost");
        expect(body.data[0]).not.toHaveProperty("costType");
        expect(body.data[0]).not.toHaveProperty("leadMagnet");
        expect(body.data[0]).not.toHaveProperty("certificate");
    });

    it("returns a structured authentication error when the API key is invalid", async () => {
        (ApiKey.findOne as jest.Mock).mockResolvedValue(null);

        const { GET } = await import("../route");
        const response = await GET(makeRequest());

        expect(response.status).toBe(401);
        await expect(response.json()).resolves.toEqual({
            error: {
                code: "unauthorized",
                message: "Unauthorized",
            },
        });
    });

    it("rejects API keys when the school owner cannot be resolved", async () => {
        (User.findOne as jest.Mock).mockResolvedValue(null);

        const { GET } = await import("../route");
        const response = await GET(makeRequest());

        expect(response.status).toBe(403);
        expect(getProducts).not.toHaveBeenCalled();
        await expect(response.json()).resolves.toEqual({
            error: {
                code: "forbidden",
                message: "API key cannot be mapped to a school owner",
            },
        });
    });
});
