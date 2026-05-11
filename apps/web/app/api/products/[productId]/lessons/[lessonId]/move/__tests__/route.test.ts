/**
 * @jest-environment node
 */

import { NextRequest } from "next/server";
import Domain from "@models/Domain";
import ApiKey from "@models/ApiKey";
import User from "@models/User";
import { moveLesson } from "@/graphql/courses/logic";

jest.mock("@models/Domain");
jest.mock("@models/ApiKey");
jest.mock("@models/User");
jest.mock("@/graphql/courses/logic", () => ({
    moveLesson: jest.fn(),
}));

const domain = {
    _id: "domain-id",
    name: "school",
};

const request = {
    url: "https://school.test/api/products/course-1/lessons/lesson-1/move",
    json: jest.fn().mockResolvedValue({
        destinationSectionId: "group-2",
        destinationIndex: 0,
    }),
    headers: {
        get: jest.fn((name: string) => {
            if (name === "domain") return "school";
            if (name === "x-api-key") return "api-key";
            return null;
        }),
    },
} as unknown as NextRequest;

describe("POST /api/products/{productId}/lessons/{lessonId}/move", () => {
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

    it("moves a lesson through existing course lesson move logic", async () => {
        const { POST } = await import("../route");
        const response = await POST(request, {
            params: Promise.resolve({
                productId: "course-1",
                lessonId: "lesson-1",
            }),
        });

        expect(response.status).toBe(200);
        expect(moveLesson).toHaveBeenCalledWith({
            courseId: "course-1",
            lessonId: "lesson-1",
            destinationGroupId: "group-2",
            destinationIndex: 0,
            ctx: expect.objectContaining({ subdomain: domain }),
        });
    });

    it("returns bad request instead of 500 when lesson move JSON is invalid", async () => {
        const { POST } = await import("../route");
        const response = await POST(
            {
                ...request,
                json: jest.fn().mockRejectedValue(new SyntaxError("bad json")),
            } as unknown as NextRequest,
            {
                params: Promise.resolve({
                    productId: "course-1",
                    lessonId: "lesson-1",
                }),
            },
        );

        expect(response.status).toBe(400);
        expect(moveLesson).not.toHaveBeenCalled();
        await expect(response.json()).resolves.toEqual({
            error: {
                code: "bad_request",
                message: "Invalid JSON body",
            },
        });
    });
});
