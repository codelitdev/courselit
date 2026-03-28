import DomainModel from "@models/Domain";
import UserModel from "@models/User";
import CourseModel from "@models/Course";
import constants from "@/config/constants";
import { updateGroup } from "../logic";

const SUITE_PREFIX = `update-group-metadata-${Date.now()}`;
const id = (suffix: string) => `${SUITE_PREFIX}-${suffix}`;
const email = (suffix: string) => `${suffix}-${SUITE_PREFIX}@example.com`;

describe("updateGroup metadata updates", () => {
    let testDomain: any;
    let adminUser: any;

    beforeAll(async () => {
        testDomain = await DomainModel.create({
            name: id("domain"),
            email: email("domain"),
        });

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
    });

    beforeEach(async () => {
        await CourseModel.deleteMany({ domain: testDomain._id });
    });

    afterAll(async () => {
        await CourseModel.deleteMany({ domain: testDomain._id });
        await UserModel.deleteMany({ domain: testDomain._id });
        await DomainModel.deleteOne({ _id: testDomain._id });
    });

    it("updates group name, rank and collapsed without touching lessonsOrder", async () => {
        const groupId = id("group");
        const course = await CourseModel.create({
            domain: testDomain._id,
            courseId: id("course"),
            title: id("course-title"),
            creatorId: adminUser.userId,
            groups: [
                {
                    _id: groupId,
                    name: "Group 1",
                    rank: 1000,
                    collapsed: true,
                    lessonsOrder: [id("lesson-1")],
                },
            ],
            lessons: [id("lesson-1")],
            type: "course",
            privacy: "unlisted",
            costType: "free",
            cost: 0,
            slug: id("course-slug"),
        });

        await updateGroup({
            id: groupId,
            courseId: course.courseId,
            name: "Renamed Group",
            rank: 2000,
            collapsed: false,
            ctx: {
                subdomain: testDomain,
                user: adminUser,
                address: "",
            },
        });

        const updatedCourse = await CourseModel.findOne({
            domain: testDomain._id,
            courseId: course.courseId,
        }).lean();
        const updatedGroup = updatedCourse?.groups?.[0];

        expect(updatedGroup?.name).toBe("Renamed Group");
        expect(updatedGroup?.rank).toBe(2000);
        expect(updatedGroup?.collapsed).toBe(false);
        expect(updatedGroup?.lessonsOrder).toEqual([id("lesson-1")]);
    });
});
