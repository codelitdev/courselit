/**
 * @jest-environment node
 */

import { NextRequest } from "next/server";
import Domain from "@models/Domain";
import ApiKey from "@models/ApiKey";
import User from "@models/User";
import {
    evaluateLesson,
    getLessonOrThrow,
    markLessonCompleted,
} from "@/graphql/lessons/logic";

jest.mock("@models/Domain");
jest.mock("@models/ApiKey");
jest.mock("@models/User");
jest.mock("@/graphql/lessons/logic", () => ({
    evaluateLesson: jest.fn(),
    getLessonOrThrow: jest.fn(),
    markLessonCompleted: jest.fn(),
}));

const domain = {
    _id: "domain-id",
    name: "school",
    email: "owner@example.com",
};

const owner = {
    userId: "owner",
    email: "owner@example.com",
    permissions: ["course:manage_any"],
};

const learner = {
    userId: "learner-1",
    email: "learner@example.com",
    permissions: [],
    purchases: [{ courseId: "course-1", completedLessons: [] }],
};

const params = Promise.resolve({
    productId: "course-1",
    userId: "learner-1",
    lessonId: "lesson-1",
});

const request = (body?: Record<string, unknown>) =>
    ({
        url: "https://school.test/api/products/course-1/customers/learner-1/lessons/lesson-1",
        json: jest.fn().mockResolvedValue(body ?? {}),
        headers: {
            get: jest.fn((name: string) => {
                if (name === "domain") return "school";
                if (name === "x-api-key") return "api-key";
                return null;
            }),
        },
    }) as unknown as NextRequest;

describe("POST /api/products/{productId}/customers/{userId}/lessons/{lessonId}/evaluations", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (Domain.findOne as jest.Mock).mockResolvedValue(domain);
        (ApiKey.findOne as jest.Mock).mockResolvedValue({ key: "api-key" });
        (User.findOne as jest.Mock).mockImplementation((query: any) => {
            if (query.email === "owner@example.com") {
                return Promise.resolve(owner);
            }
            if (query.userId === "learner-1" && query.domain === "domain-id") {
                return Promise.resolve(learner);
            }
            return Promise.resolve(null);
        });
        (getLessonOrThrow as jest.Mock).mockResolvedValue({
            lessonId: "lesson-1",
            courseId: "course-1",
        });
    });

    it("evaluates a quiz lesson as the target learner", async () => {
        (evaluateLesson as jest.Mock).mockResolvedValue({
            pass: true,
            score: 100,
            requiresPassingGrade: true,
            passingGrade: 70,
        });

        const { POST } = await import("../evaluations/route");
        const response = await POST(request({ answers: [[0], [1, 2]] }), {
            params,
        });

        expect(response.status).toBe(200);
        expect(getLessonOrThrow).toHaveBeenCalledWith(
            "lesson-1",
            expect.objectContaining({ user: owner, subdomain: domain }),
            { courseId: "course-1" },
        );
        expect(User.findOne).toHaveBeenCalledWith({
            domain: "domain-id",
            userId: "learner-1",
        });
        expect(evaluateLesson).toHaveBeenCalledWith(
            "lesson-1",
            { answers: [[0], [1, 2]] },
            expect.objectContaining({ user: learner, subdomain: domain }),
        );
        await expect(response.json()).resolves.toEqual({
            pass: true,
            score: 100,
            requiresPassingGrade: true,
            passingGrade: 70,
        });
    });

    it("rejects malformed evaluation answers before invoking lesson logic", async () => {
        const { POST } = await import("../evaluations/route");
        const response = await POST(request({ answers: ["0"] }), { params });

        expect(response.status).toBe(400);
        expect(evaluateLesson).not.toHaveBeenCalled();
        await expect(response.json()).resolves.toEqual({
            error: {
                code: "bad_request",
                message: "Answers must be an array of number arrays",
            },
        });
    });

    it("rejects empty evaluation answers before invoking lesson logic", async () => {
        const { POST } = await import("../evaluations/route");
        const response = await POST(request({ answers: [] }), { params });

        expect(response.status).toBe(400);
        expect(getLessonOrThrow).not.toHaveBeenCalled();
        expect(evaluateLesson).not.toHaveBeenCalled();
        await expect(response.json()).resolves.toEqual({
            error: {
                code: "bad_request",
                message: "Answers must be an array of number arrays",
            },
        });
    });

    it("returns not found when the target learner does not belong to the domain", async () => {
        (User.findOne as jest.Mock).mockImplementation((query: any) => {
            if (query.email === "owner@example.com") {
                return Promise.resolve(owner);
            }
            return Promise.resolve(null);
        });

        const { POST } = await import("../evaluations/route");
        const response = await POST(request({ answers: [[0]] }), { params });

        expect(response.status).toBe(404);
        expect(evaluateLesson).not.toHaveBeenCalled();
        await expect(response.json()).resolves.toEqual({
            error: {
                code: "not_found",
                message: "Customer not found",
            },
        });
    });

    it("does not evaluate a lesson outside the product path", async () => {
        (getLessonOrThrow as jest.Mock).mockRejectedValue(
            new Error("Item not found"),
        );

        const { POST } = await import("../evaluations/route");
        const response = await POST(request({ answers: [[0]] }), { params });

        expect(response.status).toBe(404);
        expect(evaluateLesson).not.toHaveBeenCalled();
        await expect(response.json()).resolves.toEqual({
            error: {
                code: "not_found",
                message: "Lesson not found",
            },
        });
    });
});

describe("POST /api/products/{productId}/customers/{userId}/lessons/{lessonId}/completion", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (Domain.findOne as jest.Mock).mockResolvedValue(domain);
        (ApiKey.findOne as jest.Mock).mockResolvedValue({ key: "api-key" });
        (User.findOne as jest.Mock).mockImplementation((query: any) => {
            if (query.email === "owner@example.com") {
                return Promise.resolve(owner);
            }
            if (query.userId === "learner-1" && query.domain === "domain-id") {
                return Promise.resolve(learner);
            }
            return Promise.resolve(null);
        });
        (getLessonOrThrow as jest.Mock).mockResolvedValue({
            lessonId: "lesson-1",
            courseId: "course-1",
        });
    });

    it("marks a product lesson complete as the target learner", async () => {
        (markLessonCompleted as jest.Mock).mockResolvedValue(true);

        const { POST } = await import("../completion/route");
        const response = await POST(request(), { params });

        expect(response.status).toBe(200);
        expect(markLessonCompleted).toHaveBeenCalledWith(
            "lesson-1",
            expect.objectContaining({ user: learner, subdomain: domain }),
        );
        await expect(response.json()).resolves.toEqual({ completed: true });
    });

    it("preserves existing completion validation errors", async () => {
        (markLessonCompleted as jest.Mock).mockRejectedValue(
            new Error(
                "You need to pass this test in order to mark it completed.",
            ),
        );

        const { POST } = await import("../completion/route");
        const response = await POST(request(), { params });

        expect(response.status).toBe(422);
        await expect(response.json()).resolves.toEqual({
            error: {
                code: "unprocessable_entity",
                message:
                    "You need to pass this test in order to mark it completed.",
            },
        });
    });
});
