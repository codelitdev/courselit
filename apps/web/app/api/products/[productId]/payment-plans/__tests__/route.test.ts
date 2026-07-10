/**
 * @jest-environment node
 */

import { NextRequest } from "next/server";
import Domain from "@models/Domain";
import ApiKey from "@models/ApiKey";
import User from "@models/User";
import { getCourseOrThrow } from "@/graphql/courses/logic";
import { createPlan, getPlansForEntity } from "@/graphql/paymentplans/logic";

jest.mock("@models/Domain");
jest.mock("@models/ApiKey");
jest.mock("@models/User");
jest.mock("@/graphql/courses/logic", () => ({
    getCourseOrThrow: jest.fn(),
}));
jest.mock("@/graphql/paymentplans/logic", () => ({
    createPlan: jest.fn(),
    getPlansForEntity: jest.fn(),
}));

const domain = {
    _id: "domain-id",
    name: "school",
};

const request = (body?: Record<string, unknown>) =>
    ({
        url: "https://school.test/api/products/course-1/payment-plans",
        json: jest.fn().mockResolvedValue(body ?? {}),
        headers: {
            get: jest.fn((name: string) => {
                if (name === "domain") return "school";
                if (name === "x-api-key") return "api-key";
                return null;
            }),
        },
    }) as unknown as NextRequest;

describe("GET /api/products/{productId}/payment-plans", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (Domain.findOne as jest.Mock).mockResolvedValue(domain);
        (ApiKey.findOne as jest.Mock).mockResolvedValue({ key: "api-key" });
        (getCourseOrThrow as jest.Mock).mockResolvedValue({
            courseId: "course-1",
            defaultPaymentPlan: "plan-free",
        });
        (User.findOne as jest.Mock).mockResolvedValue({
            userId: "owner",
            email: "owner@example.com",
            permissions: ["course:manage_any"],
        });
    });

    it("lists payment plans through existing payment-plan logic", async () => {
        (getPlansForEntity as jest.Mock).mockResolvedValue([
            {
                planId: "plan-free",
                name: "Free",
                type: "free",
                entityId: "course-1",
                entityType: "course",
            },
        ]);

        const { GET } = await import("../route");
        const response = await GET(request(), {
            params: Promise.resolve({ productId: "course-1" }),
        });

        expect(response.status).toBe(200);
        expect(getPlansForEntity).toHaveBeenCalledWith({
            entityId: "course-1",
            entityType: "course",
            ctx: expect.objectContaining({
                subdomain: domain,
                user: expect.objectContaining({ userId: "owner" }),
            }),
        });
        await expect(response.json()).resolves.toEqual({
            data: [
                {
                    planId: "plan-free",
                    name: "Free",
                    type: "free",
                    entityId: "course-1",
                    entityType: "course",
                    isDefault: true,
                },
            ],
        });
    });

    it("creates a payment plan through existing payment-plan logic", async () => {
        (getCourseOrThrow as jest.Mock).mockResolvedValue({
            courseId: "course-1",
            defaultPaymentPlan: "plan-paid",
        });
        (createPlan as jest.Mock).mockResolvedValue({
            planId: "plan-paid",
            name: "Paid",
            type: "onetime",
            oneTimeAmount: 100,
            entityId: "course-1",
            entityType: "course",
        });

        const { POST } = await import("../route");
        const response = await POST(
            request({
                name: "Paid",
                type: "onetime",
                oneTimeAmount: 100,
            }),
            {
                params: Promise.resolve({ productId: "course-1" }),
            },
        );

        expect(response.status).toBe(201);
        expect(createPlan).toHaveBeenCalledWith({
            name: "Paid",
            type: "onetime",
            oneTimeAmount: 100,
            entityId: "course-1",
            entityType: "course",
            ctx: expect.any(Object),
        });
        await expect(response.json()).resolves.toMatchObject({
            planId: "plan-paid",
            name: "Paid",
            type: "onetime",
            oneTimeAmount: 100,
            isDefault: true,
        });
    });

    it("rejects includedProducts for product-owned payment plans", async () => {
        const { POST } = await import("../route");
        const response = await POST(
            request({
                name: "Bundle-like plan",
                type: "free",
                includedProducts: ["course-2"],
            }),
            {
                params: Promise.resolve({ productId: "course-1" }),
            },
        );

        expect(response.status).toBe(400);
        expect(createPlan).not.toHaveBeenCalled();
        await expect(response.json()).resolves.toEqual({
            error: {
                code: "bad_request",
                message: "Unsupported payment plan field: includedProducts",
            },
        });
    });

    it("returns bad request instead of 500 when payment plan create JSON is invalid", async () => {
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
        expect(createPlan).not.toHaveBeenCalled();
        await expect(response.json()).resolves.toEqual({
            error: {
                code: "bad_request",
                message: "Invalid JSON body",
            },
        });
    });
});
