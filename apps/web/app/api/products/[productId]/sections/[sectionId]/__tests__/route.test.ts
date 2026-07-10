/**
 * @jest-environment node
 */

import { NextRequest } from "next/server";
import Domain from "@models/Domain";
import ApiKey from "@models/ApiKey";
import User from "@models/User";
import { removeGroup, updateGroup } from "@/graphql/courses/logic";

jest.mock("@models/Domain");
jest.mock("@models/ApiKey");
jest.mock("@models/User");
jest.mock("@/graphql/courses/logic", () => ({
    removeGroup: jest.fn(),
    updateGroup: jest.fn(),
}));

const domain = {
    _id: "domain-id",
    name: "school",
};

const request = (body?: Record<string, unknown>) =>
    ({
        url: "https://school.test/api/products/course-1/sections/group-1",
        json: jest.fn().mockResolvedValue(body ?? {}),
        headers: {
            get: jest.fn((name: string) => {
                if (name === "domain") return "school";
                if (name === "x-api-key") return "api-key";
                return null;
            }),
        },
    }) as unknown as NextRequest;

const params = Promise.resolve({ productId: "course-1", sectionId: "group-1" });

describe("/api/products/{productId}/sections/{sectionId}", () => {
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

    it("updates a section through existing course group logic", async () => {
        (updateGroup as jest.Mock).mockResolvedValue({
            groups: [{ _id: "group-1", name: "Renamed", rank: 1000 }],
        });

        const { PATCH } = await import("../route");
        const response = await PATCH(request({ name: "Renamed" }), {
            params,
        });

        expect(response.status).toBe(200);
        expect(updateGroup).toHaveBeenCalledWith({
            id: "group-1",
            courseId: "course-1",
            name: "Renamed",
            ctx: expect.objectContaining({ subdomain: domain }),
        });
        await expect(response.json()).resolves.toMatchObject({
            sectionId: "group-1",
            name: "Renamed",
        });
    });

    it("updates section drip settings through existing course group logic", async () => {
        const drip = {
            type: "relative-date",
            status: true,
            delayInMillis: 2,
        };
        (updateGroup as jest.Mock).mockResolvedValue({
            groups: [
                {
                    _id: "group-1",
                    name: "Renamed",
                    rank: 1000,
                    drip,
                },
            ],
        });

        const { PATCH } = await import("../route");
        const response = await PATCH(request({ drip }), {
            params,
        });

        expect(response.status).toBe(200);
        expect(updateGroup).toHaveBeenCalledWith({
            id: "group-1",
            courseId: "course-1",
            drip,
            ctx: expect.objectContaining({ subdomain: domain }),
        });
        await expect(response.json()).resolves.toMatchObject({
            sectionId: "group-1",
            drip,
        });
    });

    it("returns bad request instead of 500 when section update JSON is invalid", async () => {
        const { PATCH } = await import("../route");
        const response = await PATCH(
            {
                ...request(),
                json: jest.fn().mockRejectedValue(new SyntaxError("bad json")),
            } as unknown as NextRequest,
            { params },
        );

        expect(response.status).toBe(400);
        expect(updateGroup).not.toHaveBeenCalled();
        await expect(response.json()).resolves.toEqual({
            error: {
                code: "bad_request",
                message: "Invalid JSON body",
            },
        });
    });

    it("returns bad request when section update body is not a JSON object", async () => {
        const { PATCH } = await import("../route");
        const response = await PATCH(
            {
                ...request(),
                json: jest.fn().mockResolvedValue("not an object"),
            } as unknown as NextRequest,
            { params },
        );

        expect(response.status).toBe(400);
        expect(updateGroup).not.toHaveBeenCalled();
        await expect(response.json()).resolves.toEqual({
            error: {
                code: "bad_request",
                message: "Request body must be a JSON object",
            },
        });
    });

    it("rejects section update fields that are not part of the existing edit-section form", async () => {
        const { PATCH } = await import("../route");
        const response = await PATCH(
            request({
                name: "Renamed",
                rank: 1,
            }),
            { params },
        );

        expect(response.status).toBe(400);
        expect(updateGroup).not.toHaveBeenCalled();
        await expect(response.json()).resolves.toEqual({
            error: {
                code: "bad_request",
                message: "Unsupported section field: rank",
            },
        });
    });

    it("rejects unsupported section drip types before invoking existing group logic", async () => {
        const { PATCH } = await import("../route");
        const response = await PATCH(
            request({
                drip: {
                    type: "invalid-drip-type",
                    status: true,
                },
            }),
            { params },
        );

        expect(response.status).toBe(400);
        expect(updateGroup).not.toHaveBeenCalled();
        await expect(response.json()).resolves.toEqual({
            error: {
                code: "bad_request",
                message: "Unsupported drip type",
            },
        });
    });

    it("rejects drip email configuration because the email content schema is not public yet", async () => {
        const { PATCH } = await import("../route");
        const response = await PATCH(
            request({
                drip: {
                    type: "relative-date",
                    status: true,
                    delayInMillis: 2,
                    email: {
                        subject: "Lesson available",
                        content: "{}",
                    },
                },
            }),
            { params },
        );

        expect(response.status).toBe(400);
        expect(updateGroup).not.toHaveBeenCalled();
        await expect(response.json()).resolves.toEqual({
            error: {
                code: "bad_request",
                message:
                    "Drip email configuration is not supported by the public API yet",
            },
        });
    });

    it("returns not found when section update does not match a product section", async () => {
        (updateGroup as jest.Mock).mockResolvedValue(null);

        const { PATCH } = await import("../route");
        const response = await PATCH(request({ name: "Missing section" }), {
            params,
        });

        expect(response.status).toBe(404);
        await expect(response.json()).resolves.toEqual({
            error: {
                code: "not_found",
                message: "Section not found",
            },
        });
    });

    it("deletes a section through existing course group logic", async () => {
        (removeGroup as jest.Mock).mockResolvedValue({});

        const { DELETE } = await import("../route");
        const response = await DELETE(request(), { params });

        expect(response.status).toBe(200);
        expect(removeGroup).toHaveBeenCalledWith(
            "group-1",
            "course-1",
            expect.objectContaining({ subdomain: domain }),
        );
        await expect(response.json()).resolves.toEqual({ ok: true });
    });
});
