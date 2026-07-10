/**
 * @jest-environment node
 */

import { NextRequest } from "next/server";
import Domain from "@models/Domain";
import ApiKey from "@models/ApiKey";
import User from "@models/User";
import { inviteCustomer, findMembership } from "@/graphql/users/logic";

jest.mock("@models/Domain");
jest.mock("@models/ApiKey");
jest.mock("@models/User");
jest.mock("@/graphql/users/logic", () => ({
    inviteCustomer: jest.fn(),
    findMembership: jest.fn(),
}));

const domain = {
    _id: "domain-id",
    name: "school",
};

const request = (body?: Record<string, unknown>) =>
    ({
        url: "https://school.test/api/products/course-1/customers/invitations",
        json: jest.fn().mockResolvedValue(body ?? {}),
        headers: {
            get: jest.fn((name: string) => {
                if (name === "domain") return "school";
                if (name === "x-api-key") return "api-key";
                return null;
            }),
        },
    }) as unknown as NextRequest;

describe("/api/products/{productId}/customers/invitations", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (Domain.findOne as jest.Mock).mockResolvedValue(domain);
        (ApiKey.findOne as jest.Mock).mockResolvedValue({ key: "api-key" });
        (User.findOne as jest.Mock).mockResolvedValue({
            userId: "owner",
            email: "owner@example.com",
            permissions: ["user:manage"],
        });
    });

    it("invites a customer through existing inviteCustomer logic", async () => {
        (inviteCustomer as jest.Mock).mockResolvedValue({
            userId: "user-1",
            email: "student@example.com",
            name: "Student",
            avatar: { mediaId: "avatar-1" },
        });
        (findMembership as jest.Mock).mockResolvedValue({
            userId: "user-1",
            status: "active",
            subscriptionMethod: "internal",
            createdAt: new Date("2026-01-01T00:00:00.000Z"),
            updatedAt: new Date("2026-01-02T00:00:00.000Z"),
        });

        const { POST } = await import("../route");
        const response = await POST(
            request({
                email: "student@example.com",
                tags: ["ai"],
            }),
            { params: Promise.resolve({ productId: "course-1" }) },
        );

        expect(response.status).toBe(201);
        expect(inviteCustomer).toHaveBeenCalledWith(
            "student@example.com",
            ["ai"],
            "course-1",
            expect.objectContaining({ subdomain: domain }),
        );
        expect(findMembership).toHaveBeenCalledWith({
            domainId: "domain-id",
            userId: "user-1",
            entityId: "course-1",
        });
        await expect(response.json()).resolves.toMatchObject({
            userId: "user-1",
            email: "student@example.com",
            membershipStatus: "active",
        });
    });

    it("rejects customer invitation fields outside the existing invite flow", async () => {
        const { POST } = await import("../route");
        const response = await POST(
            request({
                email: "student@example.com",
                name: "Student",
            }),
            { params: Promise.resolve({ productId: "course-1" }) },
        );

        expect(response.status).toBe(400);
        expect(inviteCustomer).not.toHaveBeenCalled();
        await expect(response.json()).resolves.toEqual({
            error: {
                code: "bad_request",
                message: "Unsupported customer invitation field: name",
            },
        });
    });

    it("requires email for customer invitations", async () => {
        const { POST } = await import("../route");
        const response = await POST(request({ tags: ["ai"] }), {
            params: Promise.resolve({ productId: "course-1" }),
        });

        expect(response.status).toBe(400);
        expect(inviteCustomer).not.toHaveBeenCalled();
        await expect(response.json()).resolves.toEqual({
            error: {
                code: "bad_request",
                message: "Email is required",
            },
        });
    });

    it("rejects invalid email formats in customer invitations", async () => {
        const { POST } = await import("../route");
        const response = await POST(
            request({ email: "not-an-email", tags: ["ai"] }),
            { params: Promise.resolve({ productId: "course-1" }) },
        );

        expect(response.status).toBe(400);
        expect(inviteCustomer).not.toHaveBeenCalled();
        await expect(response.json()).resolves.toEqual({
            error: {
                code: "bad_request",
                message: "Invalid email format",
            },
        });
    });

    it("returns bad request instead of 500 when customer invitation JSON is invalid", async () => {
        const { POST } = await import("../route");
        const response = await POST(
            {
                ...request(),
                json: jest.fn().mockRejectedValue(new SyntaxError("bad json")),
            } as unknown as NextRequest,
            { params: Promise.resolve({ productId: "course-1" }) },
        );

        expect(response.status).toBe(400);
        expect(inviteCustomer).not.toHaveBeenCalled();
        await expect(response.json()).resolves.toEqual({
            error: {
                code: "bad_request",
                message: "Invalid JSON body",
            },
        });
    });
});
