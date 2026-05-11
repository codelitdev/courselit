/**
 * @jest-environment node
 */

import { NextRequest } from "next/server";
import Domain from "@models/Domain";
import ApiKey from "@models/ApiKey";
import User from "@models/User";
import { getCourseLessonOrThrow } from "@/graphql/courses/logic";
import { deleteLesson, updateLesson } from "@/graphql/lessons/logic";

jest.mock("@models/Domain");
jest.mock("@models/ApiKey");
jest.mock("@models/User");
jest.mock("@/graphql/courses/logic", () => ({
    getCourseLessonOrThrow: jest.fn(),
}));
jest.mock("@/graphql/lessons/logic", () => ({
    deleteLesson: jest.fn(),
    updateLesson: jest.fn(),
}));

const domain = {
    _id: "domain-id",
    name: "school",
};

const tiptapDoc = { type: "doc", content: [] };

const request = (body?: Record<string, unknown>) =>
    ({
        url: "https://school.test/api/products/course-1/lessons/lesson-1",
        json: jest.fn().mockResolvedValue(body ?? {}),
        headers: {
            get: jest.fn((name: string) => {
                if (name === "domain") return "school";
                if (name === "x-api-key") return "api-key";
                return null;
            }),
        },
    }) as unknown as NextRequest;

const params = Promise.resolve({ productId: "course-1", lessonId: "lesson-1" });

describe("/api/products/{productId}/lessons/{lessonId}", () => {
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

    it("fetches a product lesson through existing product lesson logic", async () => {
        (getCourseLessonOrThrow as jest.Mock).mockResolvedValue({
            lessonId: "lesson-1",
            title: "Intro",
            type: "text",
            content: tiptapDoc,
            courseId: "course-1",
            groupId: "group-1",
            published: false,
            requiresEnrollment: true,
        });

        const { GET } = await import("../route");
        const response = await GET(request(), { params });

        expect(response.status).toBe(200);
        expect(getCourseLessonOrThrow).toHaveBeenCalledWith({
            courseId: "course-1",
            lessonId: "lesson-1",
            ctx: expect.objectContaining({ subdomain: domain }),
        });
        await expect(response.json()).resolves.toMatchObject({
            lessonId: "lesson-1",
            content: tiptapDoc,
        });
    });

    it("updates a lesson with Tiptap JSON converted for existing lesson logic", async () => {
        (getCourseLessonOrThrow as jest.Mock).mockResolvedValue({
            lessonId: "lesson-1",
            courseId: "course-1",
        });
        (updateLesson as jest.Mock).mockResolvedValue({
            lessonId: "lesson-1",
            title: "Updated",
            type: "text",
            content: tiptapDoc,
            courseId: "course-1",
            groupId: "group-1",
            published: false,
            requiresEnrollment: true,
        });

        const { PATCH } = await import("../route");
        const response = await PATCH(
            request({
                title: "Updated",
                content: tiptapDoc,
            }),
            { params },
        );

        expect(response.status).toBe(200);
        expect(updateLesson).toHaveBeenCalledWith(
            {
                lessonId: "lesson-1",
                id: "lesson-1",
                title: "Updated",
                content: JSON.stringify(tiptapDoc),
            },
            expect.objectContaining({ subdomain: domain }),
        );
        await expect(response.json()).resolves.toMatchObject({
            lessonId: "lesson-1",
            title: "Updated",
        });
    });

    it("does not send content to existing lesson logic when content is not updated", async () => {
        (getCourseLessonOrThrow as jest.Mock).mockResolvedValue({
            lessonId: "lesson-1",
            courseId: "course-1",
        });
        (updateLesson as jest.Mock).mockResolvedValue({
            lessonId: "lesson-1",
            title: "Title only",
            type: "text",
            content: tiptapDoc,
            courseId: "course-1",
            groupId: "group-1",
            published: false,
            requiresEnrollment: true,
        });

        const { PATCH } = await import("../route");
        const response = await PATCH(request({ title: "Title only" }), {
            params,
        });

        expect(response.status).toBe(200);
        expect(updateLesson).toHaveBeenCalledWith(
            {
                lessonId: "lesson-1",
                id: "lesson-1",
                title: "Title only",
            },
            expect.objectContaining({ subdomain: domain }),
        );
    });

    it("does not update a lesson that is not part of the product path", async () => {
        (getCourseLessonOrThrow as jest.Mock).mockRejectedValue(
            new Error("Item not found"),
        );

        const { PATCH } = await import("../route");
        const response = await PATCH(request({ title: "Wrong product" }), {
            params,
        });

        expect(response.status).toBe(404);
        expect(updateLesson).not.toHaveBeenCalled();
        await expect(response.json()).resolves.toEqual({
            error: {
                code: "not_found",
                message: "Lesson not found",
            },
        });
    });

    it("returns bad request instead of 500 when lesson update JSON is invalid", async () => {
        const { PATCH } = await import("../route");
        const response = await PATCH(
            {
                ...request(),
                json: jest.fn().mockRejectedValue(new SyntaxError("bad json")),
            } as unknown as NextRequest,
            { params },
        );

        expect(response.status).toBe(400);
        expect(updateLesson).not.toHaveBeenCalled();
        await expect(response.json()).resolves.toEqual({
            error: {
                code: "bad_request",
                message: "Invalid JSON body",
            },
        });
    });

    it("rejects unsupported lesson update fields before invoking existing lesson logic", async () => {
        const { PATCH } = await import("../route");
        const response = await PATCH(request({ courseId: "course-2" }), {
            params,
        });

        expect(response.status).toBe(400);
        expect(updateLesson).not.toHaveBeenCalled();
        await expect(response.json()).resolves.toEqual({
            error: {
                code: "bad_request",
                message: "Unsupported lesson field: courseId",
            },
        });
    });

    it("rejects SCORM lesson updates before invoking existing lesson logic", async () => {
        const { PATCH } = await import("../route");
        const response = await PATCH(request({ type: "scorm" }), { params });

        expect(response.status).toBe(422);
        expect(updateLesson).not.toHaveBeenCalled();
        await expect(response.json()).resolves.toEqual({
            error: {
                code: "not_supported",
                message: "SCORM lessons are not supported by the public API.",
            },
        });
    });

    it("deletes a lesson through existing lesson logic", async () => {
        (getCourseLessonOrThrow as jest.Mock).mockResolvedValue({
            lessonId: "lesson-1",
            courseId: "course-1",
        });
        (deleteLesson as jest.Mock).mockResolvedValue(true);

        const { DELETE } = await import("../route");
        const response = await DELETE(request(), { params });

        expect(response.status).toBe(200);
        expect(deleteLesson).toHaveBeenCalledWith(
            "lesson-1",
            expect.objectContaining({ subdomain: domain }),
        );
        await expect(response.json()).resolves.toEqual({ ok: true });
    });

    it("does not delete a lesson that is not part of the product path", async () => {
        (getCourseLessonOrThrow as jest.Mock).mockRejectedValue(
            new Error("Item not found"),
        );

        const { DELETE } = await import("../route");
        const response = await DELETE(request(), { params });

        expect(response.status).toBe(404);
        expect(deleteLesson).not.toHaveBeenCalled();
        await expect(response.json()).resolves.toEqual({
            error: {
                code: "not_found",
                message: "Lesson not found",
            },
        });
    });
});
