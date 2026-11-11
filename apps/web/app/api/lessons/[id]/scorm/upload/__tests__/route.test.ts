/**
 * @jest-environment node
 */

import { NextRequest } from "next/server";
import DomainModel from "@models/Domain";
import User from "@models/User";
import Lesson from "@models/Lesson";
import CourseModel from "@models/Course";
import { auth } from "@/auth";
import { Constants, UIConstants } from "@courselit/common-models";

jest.mock("@models/Domain");
jest.mock("@models/User");
jest.mock("@models/Lesson");
jest.mock("@models/Course");
jest.mock("@config/constants", () => ({
    __esModule: true,
    default: { cacheEnabled: true },
}));
jest.mock("@/lib/scorm/extractor", () => ({
    extractScormPackage: jest.fn(),
}));
jest.mock("medialit", () => ({
    MediaLit: jest.fn(),
}));
jest.mock("@/auth", () => ({
    auth: {
        api: {
            getSession: jest.fn(),
        },
    },
}));

const { permissions } = UIConstants;

const domain = { _id: "domain-id", name: "school" };

function request() {
    return {
        headers: {
            get: jest.fn((name: string) =>
                name === "domain" ? "school" : null,
            ),
        },
        json: jest.fn().mockResolvedValue({}),
    } as unknown as NextRequest;
}

async function callUpload(req: NextRequest) {
    const { POST } = await import("../route");
    return POST(req, { params: Promise.resolve({ id: "lesson-1" }) });
}

function mockCourseCreator(creatorId: string) {
    (CourseModel.findOne as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue({ creatorId }),
    });
}

describe("POST /api/lessons/[id]/scorm/upload", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (DomainModel.findOne as jest.Mock).mockResolvedValue(domain);
        (auth.api.getSession as unknown as jest.Mock).mockResolvedValue({
            user: { email: "creator@example.com" },
        });
        (User.findOne as jest.Mock).mockResolvedValue({
            _id: "creator-object-id",
            userId: "creator",
            email: "creator@example.com",
            permissions: [permissions.manageCourse],
        });
        (Lesson.findOne as jest.Mock).mockResolvedValue({
            lessonId: "lesson-1",
            courseId: "course-1",
            type: Constants.LessonType.SCORM,
            content: { mediaId: "victim-package" },
        });
    });

    it("rejects creators uploading to another creator's lesson", async () => {
        mockCourseCreator("someone-else");
        const req = request();

        const response = await callUpload(req);

        expect(response.status).toBe(403);
        expect(CourseModel.findOne).toHaveBeenCalledWith({
            courseId: "course-1",
            domain: domain._id,
        });
        expect(req.json).not.toHaveBeenCalled();
        expect(Lesson.updateOne).not.toHaveBeenCalled();
    });

    it("lets creators upload to lessons in their own course", async () => {
        mockCourseCreator("creator");
        const req = request();

        const response = await callUpload(req);

        // Passes the ownership check and reaches body validation
        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toEqual({
            message: "mediaId is required",
        });
    });

    it("lets users with manage any course permission upload to any lesson", async () => {
        (User.findOne as jest.Mock).mockResolvedValue({
            _id: "admin-object-id",
            userId: "admin",
            email: "creator@example.com",
            permissions: [permissions.manageAnyCourse],
        });
        mockCourseCreator("someone-else");
        const req = request();

        const response = await callUpload(req);

        expect(response.status).toBe(400);
        expect(req.json).toHaveBeenCalled();
    });
});
