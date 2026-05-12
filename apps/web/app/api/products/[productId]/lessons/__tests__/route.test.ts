/**
 * @jest-environment node
 */

import { NextRequest } from "next/server";
import Domain from "@models/Domain";
import ApiKey from "@models/ApiKey";
import User from "@models/User";
import { getCourseLessons } from "@/graphql/courses/logic";
import { createLesson } from "@/graphql/lessons/logic";

jest.mock("@models/Domain");
jest.mock("@models/ApiKey");
jest.mock("@models/User");
jest.mock("@/graphql/courses/logic", () => ({
    getCourseLessons: jest.fn(),
}));
jest.mock("@/graphql/lessons/logic", () => ({
    createLesson: jest.fn(),
}));

const domain = {
    _id: "domain-id",
    name: "school",
};

const tiptapDoc = {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: "Hi" }] }],
};

const request = (body?: Record<string, unknown>) =>
    ({
        url: "https://school.test/api/products/course-1/lessons",
        json: jest.fn().mockResolvedValue(body ?? {}),
        headers: {
            get: jest.fn((name: string) => {
                if (name === "domain") return "school";
                if (name === "x-api-key") return "api-key";
                return null;
            }),
        },
    }) as unknown as NextRequest;

describe("/api/products/{productId}/lessons", () => {
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

    it("lists lessons for a product without requiring published-only behavior", async () => {
        (getCourseLessons as jest.Mock).mockResolvedValue([
            {
                lessonId: "lesson-1",
                title: "Intro",
                type: "text",
                content: tiptapDoc,
                courseId: "course-1",
                groupId: "group-1",
                published: false,
                requiresEnrollment: true,
            },
        ]);

        const { GET } = await import("../route");
        const response = await GET(request(), {
            params: Promise.resolve({ productId: "course-1" }),
        });

        expect(response.status).toBe(200);
        expect(getCourseLessons).toHaveBeenCalledWith({
            courseId: "course-1",
            ctx: expect.objectContaining({ subdomain: domain }),
        });
        await expect(response.json()).resolves.toEqual({
            data: [
                {
                    groupId: "group-1",
                    lessons: [
                        {
                            lessonId: "lesson-1",
                            title: "Intro",
                            type: "text",
                            content: tiptapDoc,
                            media: undefined,
                            downloadable: undefined,
                            courseId: "course-1",
                            groupId: "group-1",
                            requiresEnrollment: true,
                            published: false,
                        },
                    ],
                },
            ],
        });
    });

    it("creates a text lesson with Tiptap JSON converted for existing lesson logic", async () => {
        (createLesson as jest.Mock).mockResolvedValue({
            lessonId: "lesson-1",
            title: "Intro",
            type: "text",
            content: tiptapDoc,
            courseId: "course-1",
            groupId: "group-1",
            published: false,
            requiresEnrollment: true,
        });

        const { POST } = await import("../route");
        const response = await POST(
            request({
                title: "Intro",
                type: "text",
                groupId: "group-1",
                content: tiptapDoc,
            }),
            { params: Promise.resolve({ productId: "course-1" }) },
        );

        expect(response.status).toBe(201);
        expect(createLesson).toHaveBeenCalledWith(
            expect.objectContaining({
                title: "Intro",
                type: "text",
                courseId: "course-1",
                groupId: "group-1",
                content: JSON.stringify(tiptapDoc),
            }),
            expect.objectContaining({ subdomain: domain }),
        );
        await expect(response.json()).resolves.toMatchObject({
            lessonId: "lesson-1",
            content: tiptapDoc,
        });
    });

    it("rejects unsupported lesson create fields before invoking existing lesson logic", async () => {
        const { POST } = await import("../route");
        const response = await POST(
            request({
                title: "Intro",
                type: "text",
                groupId: "group-1",
                content: tiptapDoc,
                courseId: "course-2",
            }),
            { params: Promise.resolve({ productId: "course-1" }) },
        );

        expect(response.status).toBe(400);
        expect(createLesson).not.toHaveBeenCalled();
        await expect(response.json()).resolves.toEqual({
            error: {
                code: "bad_request",
                message: "Unsupported lesson field: courseId",
            },
        });
    });

    it("returns bad request instead of 500 when lesson create JSON is invalid", async () => {
        const { POST } = await import("../route");
        const response = await POST(
            {
                ...request(),
                json: jest.fn().mockRejectedValue(new SyntaxError("bad json")),
            } as unknown as NextRequest,
            { params: Promise.resolve({ productId: "course-1" }) },
        );

        expect(response.status).toBe(400);
        expect(createLesson).not.toHaveBeenCalled();
        await expect(response.json()).resolves.toEqual({
            error: {
                code: "bad_request",
                message: "Invalid JSON body",
            },
        });
    });

    it("rejects SCORM lesson creation before invoking existing lesson logic", async () => {
        const { POST } = await import("../route");
        const response = await POST(
            request({
                title: "SCORM",
                type: "scorm",
                groupId: "group-1",
            }),
            { params: Promise.resolve({ productId: "course-1" }) },
        );

        expect(response.status).toBe(422);
        expect(createLesson).not.toHaveBeenCalled();
        await expect(response.json()).resolves.toEqual({
            error: {
                code: "not_supported",
                message: "SCORM lessons are not supported by the public API.",
            },
        });
    });
});
