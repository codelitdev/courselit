/**
 * @jest-environment node
 */

import { NextRequest } from "next/server";
import Domain from "@models/Domain";
import ApiKey from "@models/ApiKey";
import User from "@models/User";
import { findMembership } from "@/graphql/users/logic";

jest.mock("@models/Domain");
jest.mock("@models/ApiKey");
jest.mock("@models/User");
jest.mock("@/graphql/users/logic", () => ({
    findMembership: jest.fn(),
}));

const domain = {
    _id: "domain-id",
    name: "school",
    email: "owner@example.com",
};

const request = {
    url: "https://school.test/api/products/course-1/customers/user-1/progress",
    headers: {
        get: jest.fn((name: string) => {
            if (name === "domain") return "school";
            if (name === "x-api-key") return "api-key";
            return null;
        }),
    },
} as unknown as NextRequest;

describe("GET /api/products/{productId}/customers/{userId}/progress", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (Domain.findOne as jest.Mock).mockResolvedValue(domain);
        (ApiKey.findOne as jest.Mock).mockResolvedValue({ key: "api-key" });
    });

    it("returns the user's purchase entry for the product", async () => {
        const createdAt = new Date("2026-01-02T00:00:00.000Z");
        const updatedAt = new Date("2026-01-03T00:00:00.000Z");

        (User.findOne as jest.Mock).mockImplementation((query: any) => {
            if (query.email) {
                return Promise.resolve({
                    userId: "owner",
                    email: "owner@example.com",
                });
            }
            if (query.userId === "user-1") {
                return Promise.resolve({
                    userId: "user-1",
                    email: "student@example.com",
                    purchases: [
                        {
                            courseId: "course-1",
                            completedLessons: ["lesson-1"],
                            downloaded: true,
                            createdAt,
                            updatedAt,
                        },
                    ],
                });
            }
            return Promise.resolve(null);
        });

        (findMembership as jest.Mock).mockResolvedValue({
            userId: "user-1",
            status: "active",
        });

        const { GET } = await import("../route");
        const response = await GET(request, {
            params: Promise.resolve({
                productId: "course-1",
                userId: "user-1",
            }),
        });

        expect(response.status).toBe(200);
        expect(findMembership).toHaveBeenCalledWith({
            domainId: "domain-id",
            userId: "user-1",
            entityId: "course-1",
        });
        await expect(response.json()).resolves.toEqual({
            courseId: "course-1",
            completedLessons: ["lesson-1"],
            downloaded: true,
            createdAt: "2026-01-02T00:00:00.000Z",
            updatedAt: "2026-01-03T00:00:00.000Z",
        });
    });

    it("returns not found when the user has no membership for the product", async () => {
        (User.findOne as jest.Mock).mockImplementation((query: any) => {
            if (query.email) {
                return Promise.resolve({
                    userId: "owner",
                    email: "owner@example.com",
                });
            }
            return Promise.resolve(null);
        });

        (findMembership as jest.Mock).mockResolvedValue(null);

        const { GET } = await import("../route");
        const response = await GET(request, {
            params: Promise.resolve({
                productId: "course-1",
                userId: "user-1",
            }),
        });

        expect(response.status).toBe(404);
        await expect(response.json()).resolves.toEqual({
            error: {
                code: "not_found",
                message: "Customer progress not found",
            },
        });
    });
});
