/**
 * @jest-environment node
 */

import { NextRequest } from "next/server";
import Domain from "@models/Domain";
import ApiKey from "@models/ApiKey";
import User from "@models/User";
import { getCourseOrThrow } from "@/graphql/courses/logic";
import {
    archivePaymentPlan,
    getPlan,
    updatePlan,
} from "@/graphql/paymentplans/logic";

jest.mock("@models/Domain");
jest.mock("@models/ApiKey");
jest.mock("@models/User");
jest.mock("@/graphql/courses/logic", () => ({
    getCourseOrThrow: jest.fn(),
}));
jest.mock("@/graphql/paymentplans/logic", () => ({
    archivePaymentPlan: jest.fn(),
    getPlan: jest.fn(),
    updatePlan: jest.fn(),
}));

const domain = {
    _id: "domain-id",
    name: "school",
};

const request = (body?: Record<string, unknown>) =>
    ({
        url: "https://school.test/api/products/course-1/payment-plans/plan-1",
        json: jest.fn().mockResolvedValue(body ?? {}),
        headers: {
            get: jest.fn((name: string) => {
                if (name === "domain") return "school";
                if (name === "x-api-key") return "api-key";
                return null;
            }),
        },
    }) as unknown as NextRequest;

const params = Promise.resolve({ productId: "course-1", planId: "plan-1" });

describe("/api/products/{productId}/payment-plans/{planId}", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (Domain.findOne as jest.Mock).mockResolvedValue(domain);
        (ApiKey.findOne as jest.Mock).mockResolvedValue({ key: "api-key" });
        (getCourseOrThrow as jest.Mock).mockResolvedValue({
            courseId: "course-1",
            defaultPaymentPlan: "plan-1",
        });
        (User.findOne as jest.Mock).mockResolvedValue({
            userId: "owner",
            email: "owner@example.com",
            permissions: ["course:manage_any"],
        });
    });

    it("fetches a single product-owned payment plan", async () => {
        (getPlan as jest.Mock).mockResolvedValue({
            planId: "plan-1",
            name: "Free",
            type: "free",
            entityId: "course-1",
            entityType: "course",
        });

        const { GET } = await import("../route");
        const response = await GET(request(), { params });

        expect(response.status).toBe(200);
        expect(getPlan).toHaveBeenCalledWith({
            planId: "plan-1",
            ctx: expect.objectContaining({ subdomain: domain }),
        });
        await expect(response.json()).resolves.toMatchObject({
            planId: "plan-1",
            entityId: "course-1",
            isDefault: true,
        });
    });

    it("does not expose a plan from another product through this product path", async () => {
        (getPlan as jest.Mock).mockResolvedValue({
            planId: "plan-1",
            name: "Free",
            type: "free",
            entityId: "course-2",
            entityType: "course",
        });

        const { GET } = await import("../route");
        const response = await GET(request(), { params });

        expect(response.status).toBe(404);
        await expect(response.json()).resolves.toEqual({
            error: {
                code: "not_found",
                message: "Payment plan not found",
            },
        });
    });

    it("updates a payment plan through existing payment-plan logic", async () => {
        (getPlan as jest.Mock).mockResolvedValue({
            planId: "plan-1",
            name: "Free",
            type: "free",
            entityId: "course-1",
            entityType: "course",
        });
        (updatePlan as jest.Mock).mockResolvedValue({
            planId: "plan-1",
            name: "Updated",
            type: "free",
            entityId: "course-1",
            entityType: "course",
        });

        const { PATCH } = await import("../route");
        const response = await PATCH(request({ name: "Updated" }), {
            params,
        });

        expect(response.status).toBe(200);
        expect(updatePlan).toHaveBeenCalledWith({
            planId: "plan-1",
            name: "Updated",
            ctx: expect.any(Object),
        });
        await expect(response.json()).resolves.toMatchObject({
            planId: "plan-1",
            name: "Updated",
        });
    });

    it("does not update a payment plan that belongs to another product", async () => {
        (getPlan as jest.Mock).mockResolvedValue({
            planId: "plan-1",
            name: "Other",
            type: "free",
            entityId: "course-2",
            entityType: "course",
        });

        const { PATCH } = await import("../route");
        const response = await PATCH(request({ name: "Updated" }), {
            params,
        });

        expect(response.status).toBe(404);
        expect(updatePlan).not.toHaveBeenCalled();
        await expect(response.json()).resolves.toEqual({
            error: {
                code: "not_found",
                message: "Payment plan not found",
            },
        });
    });

    it("returns bad request instead of 500 when payment plan update JSON is invalid", async () => {
        const { PATCH } = await import("../route");
        const response = await PATCH(
            {
                ...request(),
                json: jest.fn().mockRejectedValue(new SyntaxError("bad json")),
            } as unknown as NextRequest,
            { params },
        );

        expect(response.status).toBe(400);
        expect(updatePlan).not.toHaveBeenCalled();
        await expect(response.json()).resolves.toEqual({
            error: {
                code: "bad_request",
                message: "Invalid JSON body",
            },
        });
    });

    it("archives a payment plan through existing payment-plan logic", async () => {
        (getPlan as jest.Mock).mockResolvedValue({
            planId: "plan-1",
            name: "Old",
            type: "free",
            entityId: "course-1",
            entityType: "course",
        });
        (archivePaymentPlan as jest.Mock).mockResolvedValue({
            planId: "plan-1",
            name: "Old",
            type: "free",
            entityId: "course-1",
            entityType: "course",
        });

        const { DELETE } = await import("../route");
        const response = await DELETE(request(), { params });

        expect(response.status).toBe(200);
        expect(archivePaymentPlan).toHaveBeenCalledWith({
            planId: "plan-1",
            ctx: expect.any(Object),
        });
        await expect(response.json()).resolves.toMatchObject({
            planId: "plan-1",
        });
    });

    it("does not archive a payment plan that belongs to another product", async () => {
        (getPlan as jest.Mock).mockResolvedValue({
            planId: "plan-1",
            name: "Other",
            type: "free",
            entityId: "course-2",
            entityType: "course",
        });

        const { DELETE } = await import("../route");
        const response = await DELETE(request(), { params });

        expect(response.status).toBe(404);
        expect(archivePaymentPlan).not.toHaveBeenCalled();
        await expect(response.json()).resolves.toEqual({
            error: {
                code: "not_found",
                message: "Payment plan not found",
            },
        });
    });
});
