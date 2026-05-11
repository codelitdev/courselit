/**
 * @jest-environment node
 */

import { NextRequest } from "next/server";
import Domain from "@models/Domain";
import ApiKey from "@models/ApiKey";
import User from "@models/User";
import { auth } from "@/auth";
import { MediaLit } from "medialit";
import { UIConstants } from "@courselit/common-models";

jest.mock("@models/Domain");
jest.mock("@models/ApiKey");
jest.mock("@models/User");
jest.mock("@/auth", () => ({
    auth: {
        api: {
            getSession: jest.fn(),
        },
    },
}));
jest.mock("medialit", () => ({
    MediaLit: jest.fn(),
}));

const domain = {
    _id: "domain-id",
    name: "school",
    email: "owner@example.com",
};

function request(headers: Record<string, string | null>) {
    return {
        headers: {
            get: jest.fn((name: string) => headers[name] ?? null),
        },
        url: "https://school.example.com/api/media/presigned",
    } as unknown as NextRequest;
}

describe("POST /api/media/presigned", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (Domain.findOne as jest.Mock).mockResolvedValue(domain);
        (MediaLit as jest.Mock).mockImplementation(function (this: any) {
            this.endpoint = "https://media.example.com";
            this.getSignature = jest.fn().mockResolvedValue("signature-123");
        });
    });

    it("generates a media signature with an API key", async () => {
        (ApiKey.findOne as jest.Mock).mockResolvedValue({ key: "api-key" });
        (User.findOne as jest.Mock).mockResolvedValue({
            userId: "owner",
            email: "owner@example.com",
            permissions: [UIConstants.permissions.manageMedia],
        });

        const { POST } = await import("../route");
        const response = await POST(
            request({
                domain: "school",
                "x-api-key": "api-key",
            }),
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
        expect(auth.api.getSession).not.toHaveBeenCalled();
        await expect(response.json()).resolves.toEqual({
            signature: "signature-123",
            endpoint: "https://media.example.com",
        });
    });

    it("continues to generate a media signature with a dashboard session", async () => {
        (auth.api.getSession as jest.Mock).mockResolvedValue({
            user: { email: "admin@example.com" },
        });
        (User.findOne as jest.Mock).mockResolvedValue({
            userId: "admin",
            email: "admin@example.com",
            permissions: [UIConstants.permissions.manageMedia],
        });

        const { POST } = await import("../route");
        const response = await POST(
            request({
                domain: "school",
            }),
        );

        expect(response.status).toBe(200);
        expect(ApiKey.findOne).not.toHaveBeenCalled();
        expect(User.findOne).toHaveBeenCalledWith({
            email: "admin@example.com",
            domain: domain._id,
            active: true,
        });
        await expect(response.json()).resolves.toEqual({
            signature: "signature-123",
            endpoint: "https://media.example.com",
        });
    });
});
