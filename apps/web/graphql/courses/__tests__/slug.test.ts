/**
 * @jest-environment node
 */

import { createCourse, updateCourse } from "../logic";
import CourseModel from "@models/Course";
import PageModel from "@models/Page";
import DomainModel from "@models/Domain";
import UserModel from "@models/User";
import constants from "@/config/constants";

jest.mock("@/services/medialit", () => ({
    deleteMedia: jest.fn().mockResolvedValue(true),
    sealMedia: jest.fn().mockImplementation((mediaId) =>
        Promise.resolve({
            mediaId,
            file: `https://cdn.test/${mediaId}/main.webp`,
        }),
    ),
}));
jest.mock("@/services/queue");
jest.mock("nanoid", () => ({
    nanoid: () => Math.random().toString(36).substring(7),
}));
jest.mock("slugify", () => ({
    __esModule: true,
    default: jest.fn((str) =>
        str
            .toLowerCase()
            .replace(/[^a-z0-9]+/gi, "-")
            .replace(/^-+|-+$/g, "")
            .toLowerCase(),
    ),
}));
jest.unmock("@courselit/utils");

const SLUG_SUITE_PREFIX = `course-slug-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
const id = (suffix: string) => `${SLUG_SUITE_PREFIX}-${suffix}`;
const email = (suffix: string) => `${suffix}-${SLUG_SUITE_PREFIX}@example.com`;

describe("Course Slug Tests", () => {
    let domain: any;
    let adminUser: any;
    let mockCtx: any;

    beforeAll(async () => {
        domain = await DomainModel.create({
            name: id("domain"),
            email: email("domain"),
        });

        adminUser = await UserModel.create({
            domain: domain._id,
            userId: id("admin"),
            email: email("admin"),
            name: "Admin",
            permissions: [
                constants.permissions.manageAnyCourse,
                constants.permissions.publishCourse,
            ],
            active: true,
            unsubscribeToken: id("unsub-admin"),
            purchases: [],
        });

        mockCtx = {
            user: adminUser,
            subdomain: domain,
        } as any;
    });

    afterEach(async () => {
        await CourseModel.deleteMany({ domain: domain._id });
        await PageModel.deleteMany({ domain: domain._id });
    });

    afterAll(async () => {
        await CourseModel.deleteMany({ domain: domain._id });
        await PageModel.deleteMany({ domain: domain._id });
        await UserModel.deleteMany({ domain: domain._id });
        await DomainModel.deleteOne({ _id: domain._id });
    });

    describe("createCourse", () => {
        it("should generate slug for course", async () => {
            const result = await createCourse(
                { title: "My New Course", type: "course" as any },
                mockCtx,
            );

            expect(result.slug).toBeDefined();
            expect(result.slug).toBe("my-new-course");
        });

        it("should generate slug for blog", async () => {
            const result = await createCourse(
                { title: "My First Blog", type: "blog" as any },
                mockCtx,
            );

            expect(result.slug).toBeDefined();
            expect(result.slug).toBe("my-first-blog");
        });

        it("should auto-suffix slug on page collision for courses", async () => {
            // Create a page that will collide
            await PageModel.create({
                domain: domain._id,
                pageId: "colliding-course",
                name: "Existing Page",
                creatorId: adminUser.userId,
            });

            const result = await createCourse(
                { title: "Colliding Course", type: "course" as any },
                mockCtx,
            );

            expect(result.slug).toBe("colliding-course-1");
        });
    });

    describe("updateCourse slug", () => {
        it("should update slug and sync with Page", async () => {
            const created = await createCourse(
                { title: "Slug Update Course", type: "course" as any },
                mockCtx,
            );

            const updated = await updateCourse(
                { id: created.courseId, slug: "new-course-slug" },
                mockCtx,
            );

            expect(updated.slug).toBe("new-course-slug");

            const course = await CourseModel.findOne({
                courseId: created.courseId,
            });
            expect(course?.slug).toBe("new-course-slug");
            expect(course?.pageId).toBe("new-course-slug");

            const page = await PageModel.findOne({
                entityId: created.courseId,
                domain: domain._id,
            });
            expect(page?.pageId).toBe("new-course-slug");
        });

        it("should reject duplicate slug with friendly error", async () => {
            const course1 = await createCourse(
                { title: "First Course", type: "course" as any },
                mockCtx,
            );

            await createCourse(
                { title: "Second Course", type: "course" as any },
                mockCtx,
            );

            await expect(
                updateCourse(
                    { id: course1.courseId, slug: "second-course" },
                    mockCtx,
                ),
            ).rejects.toThrow("slug is already in use");
        });

        it("should not change anything when same slug is submitted", async () => {
            const created = await createCourse(
                { title: "Same Slug Course", type: "course" as any },
                mockCtx,
            );

            const updated = await updateCourse(
                { id: created.courseId, slug: "same-slug-course" },
                mockCtx,
            );

            expect(updated.slug).toBe("same-slug-course");
        });

        it("should reject duplicate title on save with friendly error", async () => {
            await createCourse(
                { title: "Title Collision", type: "course" as any },
                mockCtx,
            );

            const course2 = await createCourse(
                { title: "Unique Course", type: "course" as any },
                mockCtx,
            );

            await expect(
                updateCourse(
                    { id: course2.courseId, title: "Title Collision" },
                    mockCtx,
                ),
            ).rejects.toThrow("slug is already in use");
        });
    });
});
