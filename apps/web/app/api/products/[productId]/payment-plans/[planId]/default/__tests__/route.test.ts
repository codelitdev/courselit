/**
 * @jest-environment node
 */

import { NextRequest } from "next/server";
import Domain from "@models/Domain";
import ApiKey from "@models/ApiKey";
import User from "@models/User";
import { changeDefaultPlan, getPlan } from "@/graphql/paymentplans/logic";

jest.mock("@models/Domain");
jest.mock("@models/ApiKey");
jest.mock("@models/User");
jest.mock("@/graphql/paymentplans/logic", () => ({
    changeDefaultPlan: jest.fn(),
    getPlan: jest.fn(),
}));

const domain = {
    _id: "domain-id",
    name: "school",
};

const request = {
    url: "https://school.test/api/products/course-1/payment-plans/plan-1/default",
    headers: {
        get: jest.fn((name: string) => {
            if (name === "domain") return "school";
            if (name === "x-api-key") return "api-key";
            return null;
        }),
    },
} as unknown as NextRequest;

describe("POST /api/products/{productId}/payment-plans/{planId}/default", () => {
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

    it("sets the product default plan through existing payment-plan logic", async () => {
        (getPlan as jest.Mock).mockResolvedValue({
            planId: "plan-1",
            name: "Free",
            type: "free",
            entityId: "course-1",
            entityType: "course",
        });
        (changeDefaultPlan as jest.Mock).mockResolvedValue({
            planId: "plan-1",
            name: "Free",
            type: "free",
            entityId: "course-1",
            entityType: "course",
        });

        const { POST } = await import("../route");
        const response = await POST(request, {
            params: Promise.resolve({
                productId: "course-1",
                planId: "plan-1",
            }),
        });

        expect(response.status).toBe(200);
        expect(changeDefaultPlan).toHaveBeenCalledWith({
            planId: "plan-1",
            entityId: "course-1",
            entityType: "course",
            ctx: expect.objectContaining({ subdomain: domain }),
        });
        await expect(response.json()).resolves.toMatchObject({
            planId: "plan-1",
            isDefault: true,
        });
    });

    it("does not set a default plan that belongs to another product", async () => {
        (getPlan as jest.Mock).mockResolvedValue({
            planId: "plan-1",
            name: "Other",
            type: "free",
            entityId: "course-2",
            entityType: "course",
        });

        const { POST } = await import("../route");
        const response = await POST(request, {
            params: Promise.resolve({
                productId: "course-1",
                planId: "plan-1",
            }),
        });

        expect(response.status).toBe(404);
        expect(changeDefaultPlan).not.toHaveBeenCalled();
        await expect(response.json()).resolves.toEqual({
            error: {
                code: "not_found",
                message: "Payment plan not found",
            },
        });
    });
});
