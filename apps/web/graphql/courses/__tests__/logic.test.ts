import DomainModel from "@models/Domain";
import UserModel from "@models/User";
import CourseModel from "@models/Course";
import PageModel from "@models/Page";
import constants from "@/config/constants";
import { updateCourse } from "../logic";
import { deleteMedia, sealMedia } from "@/services/medialit";

jest.mock("@/services/medialit", () => ({
    deleteMedia: jest.fn().mockResolvedValue(true),
    sealMedia: jest.fn().mockImplementation((id) =>
        Promise.resolve({
            mediaId: id,
            file: `https://cdn.medialit.clqa.online/medialit-service/p/${id}/main.webp`,
        }),
    ),
}));

const UPDATE_COURSE_SUITE_PREFIX = `update-course-${Date.now()}`;
const id = (suffix: string) => `${UPDATE_COURSE_SUITE_PREFIX}-${suffix}`;
const email = (suffix: string) =>
    `${suffix}-${UPDATE_COURSE_SUITE_PREFIX}@example.com`;

describe("updateCourse", () => {
    let testDomain: any;
    let adminUser: any;
    let page: any;

    beforeAll(async () => {
        testDomain = await DomainModel.create({
            name: id("domain"),
            email: email("domain"),
        });

        // Create admin user with course management permissions
        adminUser = await UserModel.create({
            domain: testDomain._id,
            userId: id("admin-user"),
            email: email("admin"),
            name: "Admin User",
            permissions: [constants.permissions.manageAnyCourse],
            active: true,
            unsubscribeToken: id("unsubscribe-admin"),
            purchases: [],
        });

        page = await PageModel.create({
            domain: testDomain._id,
            pageId: "test-page-perm",
            name: "Test Page",
            creatorId: adminUser.userId,
            deleteable: true,
        });
    });

    beforeEach(async () => {
        await CourseModel.deleteMany({ domain: testDomain._id });
        jest.clearAllMocks();
    });

    afterAll(async () => {
        await PageModel.deleteOne({ _id: page._id });
        await UserModel.deleteMany({ domain: testDomain._id });
        await DomainModel.deleteOne({ _id: testDomain._id });
    });

    it("Spot all the mediaIds to be deleted correctly", async () => {
        const initialDescription = {
            type: "doc",
            content: [
                {
                    type: "paragraph",
                    content: [{ type: "text", text: "Multi file" }],
                },
                {
                    type: "image",
                    attrs: {
                        src: "https://cdn.medialit.clqa.online/medialit-service/i/qv9GyJgdvkIdKpRRGBHH1MQFf7qqPzcPzO2XER_K/main.webp",
                        alt: "thumb (1).webp",
                        title: "thumb (1).webp",
                        width: null,
                        height: null,
                    },
                },
                {
                    type: "image",
                    attrs: {
                        src: "https://cdn.medialit.clqa.online/medialit-service/i/w3caqs2p1NtqO7p95vnScR6EEWLoxTf1gsJQPWTG/main.webp",
                        alt: "favicon.webp",
                        title: "favicon.webp",
                        width: null,
                        height: null,
                    },
                },
                { type: "paragraph" },
            ],
        };

        const course = await CourseModel.create({
            domain: testDomain._id,
            courseId: id("course-unique"),
            title: id("course-title"),
            creatorId: adminUser.userId,
            deleteable: true,
            pageId: page.pageId,
            groups: [],
            lessons: [],
            type: "course",
            privacy: "unlisted",
            costType: "free",
            cost: 0,
            slug: "test-course-perm",
            description: JSON.stringify(initialDescription),
        });

        const updatedDescription = {
            type: "doc",
            content: [
                {
                    type: "paragraph",
                    content: [{ type: "text", text: "Multi file" }],
                },
                {
                    type: "image",
                    attrs: {
                        src: "https://cdn.medialit.clqa.online/medialit-service/i/qv9GyJgdvkIdKpRRGBHH1MQFf7qqPzcPzO2XER_K/main.webp",
                        alt: "thumb (1).webp",
                        title: "thumb (1).webp",
                        width: null,
                        height: null,
                    },
                },
                { type: "paragraph" },
            ],
        };

        await updateCourse(
            {
                description: JSON.stringify(updatedDescription),
                id: course.courseId,
            },
            {
                subdomain: testDomain,
                user: adminUser,
                address: "",
            },
        );

        expect(deleteMedia).toHaveBeenCalledWith(
            "w3caqs2p1NtqO7p95vnScR6EEWLoxTf1gsJQPWTG",
        );
    });

    it("Replace all temp media with sealed one", async () => {
        const descriptionWithTempMedia = {
            type: "doc",
            content: [
                {
                    type: "image",
                    attrs: {
                        src: "https://cdn.medialit.clqa.online/medialit-service/i/8U1v2-_1oh9kC-iA1JtD5lQ1m0Y8L1M8AWm_9hH7/main.webp",
                        alt: "favicon.webp",
                        title: "favicon.webp",
                        width: null,
                        height: null,
                    },
                },
                { type: "paragraph" },
            ],
        };

        const course = await CourseModel.create({
            domain: testDomain._id,
            courseId: id("course-unique-2"),
            title: id("course-title-2"),
            creatorId: adminUser.userId,
            deleteable: true,
            pageId: page.pageId,
            groups: [],
            lessons: [],
            type: "course",
            privacy: "unlisted",
            costType: "free",
            cost: 0,
            slug: "test-course-perm",
            description: JSON.stringify({
                type: "doc",
                content: [{ type: "paragraph" }],
            }),
        });

        const updatedCourse = await updateCourse(
            {
                description: JSON.stringify(descriptionWithTempMedia),
                id: course.courseId,
            },
            {
                subdomain: testDomain,
                user: adminUser,
                address: "",
            },
        );

        const expectedDescription = {
            type: "doc",
            content: [
                {
                    type: "image",
                    attrs: {
                        src: "https://cdn.medialit.clqa.online/medialit-service/p/8U1v2-_1oh9kC-iA1JtD5lQ1m0Y8L1M8AWm_9hH7/main.webp",
                        alt: "favicon.webp",
                        title: "favicon.webp",
                        width: null,
                        height: null,
                    },
                },
                { type: "paragraph" },
            ],
        };

        expect(sealMedia).toHaveBeenCalledWith(
            "8U1v2-_1oh9kC-iA1JtD5lQ1m0Y8L1M8AWm_9hH7",
        );
        expect(updatedCourse.description).toEqual(
            JSON.stringify(expectedDescription),
        );
    });
});
