/**
 * @jest-environment node
 */

import { NextRequest } from "next/server";
import Domain from "@models/Domain";
import ApiKey from "@models/ApiKey";
import User from "@models/User";
import { getMembers } from "@/graphql/courses/logic";

jest.mock("@models/Domain");
jest.mock("@models/ApiKey");
jest.mock("@models/User");
jest.mock("@/graphql/courses/logic", () => ({
    getMembers: jest.fn(),
}));

const domain = {
    _id: "domain-id",
    name: "school",
};

const mockUserFindChain = (users: any[] = []) => {
    const lean = jest.fn().mockResolvedValue(users);
    const select = jest.fn().mockReturnValue({ lean });
    (User.find as jest.Mock).mockReturnValue({ select });
    return { find: User.find, select, lean };
};

const request = (
    body?: Record<string, unknown>,
    url = "https://school.test/api/products/course-1/customers",
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

describe("/api/products/{productId}/customers", () => {
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

    it("lists customer enrollment snapshots for the product", async () => {
        const createdAt = new Date("2026-01-01T00:00:00.000Z");
        const updatedAt = new Date("2026-01-02T00:00:00.000Z");
        (getMembers as jest.Mock).mockResolvedValue([
            {
                userId: "user-1",
                status: "active",
                subscriptionMethod: "internal",
                completedLessons: ["lesson-1"],
                downloaded: false,
                createdAt,
                updatedAt,
            },
        ]);
        mockUserFindChain([
            {
                userId: "user-1",
                email: "student@example.com",
                name: "Student",
                avatar: { thumbnail: "avatar-thumbnail" },
            },
        ]);

        const { GET } = await import("../route");
        const response = await GET(request(), {
            params: Promise.resolve({ productId: "course-1" }),
        });

        expect(response.status).toBe(200);
        expect(getMembers).toHaveBeenCalledWith({
            ctx: expect.objectContaining({ subdomain: domain }),
            courseId: "course-1",
            page: 1,
            limit: 50,
            searchText: undefined,
        });
        expect(User.find).toHaveBeenCalledWith({
            userId: { $in: ["user-1"] },
            domain: domain._id,
        });
        await expect(response.json()).resolves.toMatchObject({
            data: [
                {
                    user: {
                        userId: "user-1",
                        email: "student@example.com",
                        name: "Student",
                        avatar: { thumbnail: "avatar-thumbnail" },
                    },
                    status: "active",
                    subscriptionMethod: "internal",
                    completedLessons: ["lesson-1"],
                    downloaded: false,
                    createdAt: createdAt.toISOString(),
                    updatedAt: updatedAt.toISOString(),
                },
            ],
        });
    });

    it("delegates search to the existing product member logic", async () => {
        (getMembers as jest.Mock).mockResolvedValue([
            {
                userId: "user-1",
                status: "active",
            },
        ]);
        mockUserFindChain([
            {
                userId: "user-1",
                email: "student@example.com",
                name: "Student",
            },
        ]);

        const { GET } = await import("../route");
        const response = await GET(
            request(
                undefined,
                "https://school.test/api/products/course-1/customers?search=student",
            ),
            {
                params: Promise.resolve({ productId: "course-1" }),
            },
        );

        expect(response.status).toBe(200);
        expect(getMembers).toHaveBeenCalledWith({
            ctx: expect.objectContaining({ subdomain: domain }),
            courseId: "course-1",
            page: 1,
            limit: 50,
            searchText: "student",
        });
        await expect(response.json()).resolves.toMatchObject({
            data: [
                {
                    user: {
                        userId: "user-1",
                        email: "student@example.com",
                    },
                },
            ],
        });
    });

    it("does not expose the GraphQL-only status filter through the public API", async () => {
        (getMembers as jest.Mock).mockResolvedValue([]);
        mockUserFindChain([]);

        const { GET } = await import("../route");
        const response = await GET(
            request(
                undefined,
                "https://school.test/api/products/course-1/customers?status=active",
            ),
            {
                params: Promise.resolve({ productId: "course-1" }),
            },
        );

        expect(response.status).toBe(200);
        expect(getMembers).toHaveBeenCalledWith({
            ctx: expect.objectContaining({ subdomain: domain }),
            courseId: "course-1",
            page: 1,
            limit: 50,
            searchText: undefined,
        });
        expect(getMembers).not.toHaveBeenCalledWith(
            expect.objectContaining({ status: "active" }),
        );
    });
});
