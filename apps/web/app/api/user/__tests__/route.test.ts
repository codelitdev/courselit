/**
 * @jest-environment node
 */

import { NextRequest } from "next/server";
import Domain from "@models/Domain";
import ApiKey from "@models/ApiKey";
import User from "@models/User";
import UserModel from "@models/User";
import { createUser } from "@/graphql/users/logic";
import { responses } from "@/config/strings";

jest.mock("@models/Domain");
jest.mock("@models/ApiKey");
jest.mock("@models/User");
jest.mock("@/graphql/users/logic", () => ({
    createUser: jest.fn(),
}));
jest.mock("@/lib/check-invalid-permissions", () => ({
    checkForInvalidPermissions: jest.fn(),
}));

const domain = {
    _id: "domain-id",
    name: "school",
    email: "owner@example.com",
};

function request(body: Record<string, unknown>, apiKey?: string) {
    return {
        url: "https://school.test/api/user",
        json: jest.fn().mockResolvedValue(body),
        headers: {
            get: jest.fn((name: string) => {
                if (name === "domain") return "school";
                if (name === "x-api-key") return apiKey || null;
                return null;
            }),
        },
    } as unknown as NextRequest;
}

describe("/api/user", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (Domain.findOne as jest.Mock).mockResolvedValue(domain);
        (ApiKey.findOne as jest.Mock).mockResolvedValue({ key: "api-key" });
        (User.findOne as jest.Mock).mockResolvedValue({
            userId: "owner",
            email: "owner@example.com",
        });
    });

    it("creates a user through the shared owner-backed API key validator", async () => {
        const { POST } = await import("../route");
        const response = await POST(
            request({ email: "student@example.com" }, "api-key"),
        );

        expect(response.status).toBe(200);
        expect(ApiKey.findOne).toHaveBeenCalledWith({
            domain: domain._id,
            key: "api-key",
        });
        expect(User.findOne).toHaveBeenCalledWith({
            domain: domain._id,
            email: domain.email,
        });
        expect(createUser).toHaveBeenCalledWith(
            expect.objectContaining({
                domain,
                email: "student@example.com",
            }),
        );
    });

    it("keeps legacy body apikey support for /api/user only", async () => {
        const { POST } = await import("../route");
        const response = await POST(
            request({
                email: "student@example.com",
                apikey: "legacy-api-key",
            }),
        );

        expect(response.status).toBe(200);
        expect(ApiKey.findOne).toHaveBeenCalledWith({
            domain: domain._id,
            key: "legacy-api-key",
        });
    });

    it("keeps the legacy validation error response shape", async () => {
        (ApiKey.findOne as jest.Mock).mockResolvedValue(null);

        const { POST } = await import("../route");
        const response = await POST(
            request({ email: "student@example.com" }, "bad-key"),
        );

        expect(response.status).toBe(401);
        await expect(response.json()).resolves.toEqual({
            message: "Unauthorized",
        });
    });

    it("rejects bodies exceeding the public API body size limit in the legacy path", async () => {
        const { POST } = await import("../route");
        const response = await POST({
            url: "https://school.test/api/user",
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
        expect(createUser).not.toHaveBeenCalled();
        await expect(response.json()).resolves.toEqual({
            message: "Request body too large",
        });
    });

    it("rejects invalid email formats on user creation", async () => {
        const { POST } = await import("../route");
        const response = await POST(
            request({ email: "not-an-email" }, "api-key"),
        );

        expect(response.status).toBe(400);
        expect(createUser).not.toHaveBeenCalled();
        await expect(response.json()).resolves.toEqual({
            message: "Invalid email format",
        });
    });

    it("returns bad request instead of 500 when legacy user API JSON is invalid", async () => {
        const { POST } = await import("../route");
        const response = await POST({
            ...request({}, "api-key"),
            json: jest.fn().mockRejectedValue(new SyntaxError("bad json")),
        } as unknown as NextRequest);

        expect(response.status).toBe(400);
        expect(createUser).not.toHaveBeenCalled();
        await expect(response.json()).resolves.toEqual({
            message: "Invalid JSON body",
        });
    });

    it("requires the API key to resolve the school owner", async () => {
        (User.findOne as jest.Mock).mockResolvedValue(null);

        const { PATCH } = await import("../route");
        const response = await PATCH(
            request(
                { email: "student@example.com", name: "Student" },
                "api-key",
            ),
        );

        expect(response.status).toBe(403);
        expect(UserModel.findOneAndUpdate).not.toHaveBeenCalled();
        await expect(response.json()).resolves.toEqual({
            message: "API key cannot be mapped to a school owner",
        });
    });

    it("prevents changing permissions for the school owner", async () => {
        const { PATCH } = await import("../route");
        const response = await PATCH(
            request(
                {
                    email: domain.email,
                    permissions: [],
                },
                "api-key",
            ),
        );

        expect(response.status).toBe(403);
        expect(UserModel.findOneAndUpdate).not.toHaveBeenCalled();
        await expect(response.json()).resolves.toEqual({
            error: responses.action_not_allowed,
        });
    });

    it("continues to allow non-permission updates for the school owner", async () => {
        (UserModel.findOneAndUpdate as jest.Mock).mockResolvedValue({
            email: domain.email,
        });

        const { PATCH } = await import("../route");
        const response = await PATCH(
            request(
                {
                    email: domain.email,
                    name: "Updated Owner",
                },
                "api-key",
            ),
        );

        expect(response.status).toBe(200);
        expect(UserModel.findOneAndUpdate).toHaveBeenCalledWith(
            { email: domain.email, domain: domain._id },
            {
                name: "Updated Owner",
                permissions: undefined,
                subscribedToUpdates: undefined,
            },
            { new: true },
        );
    });

    it("rejects invalid email formats on user update", async () => {
        const { PATCH } = await import("../route");
        const response = await PATCH(
            request({ email: "not-an-email", name: "Updated" }, "api-key"),
        );

        expect(response.status).toBe(400);
        expect(UserModel.findOneAndUpdate).not.toHaveBeenCalled();
        await expect(response.json()).resolves.toEqual({
            message: "Invalid email format",
        });
    });
});
